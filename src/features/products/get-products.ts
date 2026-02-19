import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toSerializableProduct } from "@/features/products/product-helpers";
import type { Prisma } from "@/generated/prisma/client";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

interface ListProductsInput {
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
    search?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

    return {
        categoryId:
            categoryId && categoryId.length > 0 ? categoryId : undefined,
        isActive: input.isActive,
        page,
        pageSize,
        search: search && search.length > 0 ? search : undefined,
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

        if (typeof data.isActive === "boolean") {
            where.isActive = data.isActive;
        }

        if (data.categoryId) {
            where.categoryId = data.categoryId;
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
                orderBy: [{ name: "asc" }, { createdAt: "desc" }],
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
