import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toSerializableProduct } from "@/features/products/product-helpers";
import type { Prisma } from "@/generated/prisma/client";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

interface ListProductsInput {
    categoryId?: string;
    includeDescendantCategories?: boolean;
    isActive?: boolean;
    maxSellingPrice?: number;
    minSellingPrice?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: "createdAt" | "name" | "sellingPrice" | "sku";
    sortDirection?: "asc" | "desc";
    trackByBatch?: boolean;
    trackByExpiry?: boolean;
    trackBySerialNumber?: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_BY: Required<ListProductsInput>["sortBy"] = "name";
const DEFAULT_SORT_DIRECTION: Required<ListProductsInput>["sortDirection"] =
    "asc";

const getDescendantCategoryIds = async (
    categoryId: string
): Promise<string[]> => {
    const visitedIds = new Set<string>();
    const queue: string[] = [categoryId];

    while (queue.length > 0) {
        const currentCategoryId = queue.shift();
        if (!currentCategoryId || visitedIds.has(currentCategoryId)) {
            continue;
        }

        visitedIds.add(currentCategoryId);
        const children = await prisma.category.findMany({
            select: { id: true },
            where: { deletedAt: null, parentId: currentCategoryId },
        });

        for (const child of children) {
            if (!visitedIds.has(child.id)) {
                queue.push(child.id);
            }
        }
    }

    return [...visitedIds];
};

const parseListProductsInput = (
    input: ListProductsInput
): ListProductsInput => {
    const normalizedPage = Number(input.page ?? DEFAULT_PAGE);
    const normalizedPageSize = Number(input.pageSize ?? DEFAULT_PAGE_SIZE);

    const page = Number.isFinite(normalizedPage)
        ? Math.max(DEFAULT_PAGE, Math.floor(normalizedPage))
        : DEFAULT_PAGE;
    const pageSize = Number.isFinite(normalizedPageSize)
        ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(normalizedPageSize)))
        : DEFAULT_PAGE_SIZE;

    const search = input.search?.trim();
    const categoryId = input.categoryId?.trim();
    const normalizedMinSellingPrice = Number(input.minSellingPrice);
    const normalizedMaxSellingPrice = Number(input.maxSellingPrice);

    const minSellingPrice = Number.isFinite(normalizedMinSellingPrice)
        ? Math.max(0, normalizedMinSellingPrice)
        : undefined;
    const maxSellingPrice = Number.isFinite(normalizedMaxSellingPrice)
        ? Math.max(0, normalizedMaxSellingPrice)
        : undefined;

    return {
        categoryId:
            categoryId && categoryId.length > 0 ? categoryId : undefined,
        includeDescendantCategories: Boolean(input.includeDescendantCategories),
        isActive: input.isActive ?? true,
        maxSellingPrice,
        minSellingPrice,
        page,
        pageSize,
        search: search && search.length > 0 ? search : undefined,
        sortBy: input.sortBy ?? DEFAULT_SORT_BY,
        sortDirection: input.sortDirection ?? DEFAULT_SORT_DIRECTION,
        trackByBatch: input.trackByBatch,
        trackByExpiry: input.trackByExpiry,
        trackBySerialNumber: input.trackBySerialNumber,
    };
};

export const getProducts = createServerFn({ method: "GET" })
    .inputValidator(parseListProductsInput)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_LIST)) {
            throw new Error("You do not have permission to view products.");
        }

        const page = data.page ?? DEFAULT_PAGE;
        const pageSize = data.pageSize ?? DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * pageSize;

        const where: Prisma.ProductWhereInput = {
            deletedAt: null,
        };
        const sellingPriceFilter: Prisma.IntNullableFilter = {};

        if (typeof data.isActive === "boolean") {
            where.isActive = data.isActive;
        }

        if (data.categoryId) {
            if (data.includeDescendantCategories) {
                const categoryIds = await getDescendantCategoryIds(
                    data.categoryId
                );
                where.categoryId = { in: categoryIds };
            } else {
                where.categoryId = data.categoryId;
            }
        }

        if (typeof data.trackByBatch === "boolean") {
            where.trackByBatch = data.trackByBatch;
        }

        if (typeof data.trackByExpiry === "boolean") {
            where.trackByExpiry = data.trackByExpiry;
        }

        if (typeof data.trackBySerialNumber === "boolean") {
            where.trackBySerialNumber = data.trackBySerialNumber;
        }

        if (typeof data.minSellingPrice === "number") {
            sellingPriceFilter.gte = Math.round(data.minSellingPrice);
        }

        if (typeof data.maxSellingPrice === "number") {
            sellingPriceFilter.lte = Math.round(data.maxSellingPrice);
        }

        if (Object.keys(sellingPriceFilter).length > 0) {
            where.sellingPrice = sellingPriceFilter;
        }

        if (data.search) {
            where.OR = [
                {
                    name: {
                        contains: data.search,
                        mode: "insensitive",
                    },
                },
                {
                    sku: {
                        contains: data.search,
                        mode: "insensitive",
                    },
                },
                {
                    barcode: {
                        contains: data.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                include: { category: true },
                orderBy: [
                    {
                        [data.sortBy ?? DEFAULT_SORT_BY]:
                            data.sortDirection ?? DEFAULT_SORT_DIRECTION,
                    },
                    { createdAt: "desc" },
                ],
                skip,
                take: pageSize,
                where,
            }),
        ]);

        return {
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
            products: products.map((product) => toSerializableProduct(product)),
        };
    });
