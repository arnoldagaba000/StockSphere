import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const exportProductsCsvSchema = z.object({
    productIds: z.array(z.string().cuid()).optional(),
});

const escapeCsvCell = (value: string | number | null | undefined): string => {
    if (value == null) {
        return "";
    }

    const stringValue = String(value);
    if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
    ) {
        return `"${stringValue.replaceAll('"', '""')}"`;
    }

    return stringValue;
};

export const exportProductsCsv = createServerFn({ method: "POST" })
    .inputValidator(exportProductsCsvSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EXPORT)) {
            throw new Error("You do not have permission to export products.");
        }

        const products = await prisma.product.findMany({
            include: {
                category: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [{ name: "asc" }],
            where: {
                deletedAt: null,
                ...(data.productIds?.length
                    ? { id: { in: [...new Set(data.productIds)] } }
                    : {}),
            },
        });

        const headers = [
            "id",
            "sku",
            "name",
            "barcode",
            "category",
            "costPrice",
            "sellingPrice",
            "isActive",
            "createdAt",
        ];
        const rows = products.map((product) => [
            product.id,
            product.sku,
            product.name,
            product.barcode ?? "",
            product.category?.name ?? "",
            formatCurrencyFromMinorUnits(product.costPrice),
            formatCurrencyFromMinorUnits(product.sellingPrice),
            product.isActive ? "active" : "inactive",
            product.createdAt.toISOString(),
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
            .join("\n");

        return {
            csv,
            filename: `products-${new Date().toISOString().slice(0, 10)}.csv`,
        };
    });
