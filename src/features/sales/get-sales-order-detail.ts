import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./sales-helpers";

const getSalesOrderDetailInputSchema = z.object({
    salesOrderId: z.string().min(1),
});

export interface SalesOrderDetailResponse {
    createdAt: Date;
    createdById: string;
    customer: {
        code: string;
        creditLimit: number | null;
        id: string;
        name: string;
    };
    customerId: string;
    deletedAt: Date | null;
    id: string;
    items: {
        createdAt: Date;
        id: string;
        notes: string | null;
        product: {
            id: string;
            name: string;
            sku: string;
        };
        productId: string;
        quantity: number;
        salesOrderId: string;
        shippedQuantity: number;
        taxRate: number;
        totalPrice: number;
        unitPrice: number;
        updatedAt: Date;
    }[];
    notes: string | null;
    orderDate: Date;
    orderNumber: string;
    requiredDate: Date | null;
    shipments: {
        carrier: string | null;
        createdAt: Date;
        deliveredDate: Date | null;
        id: string;
        items: {
            batchNumber: string | null;
            createdAt: Date;
            id: string;
            productId: string;
            quantity: number;
            serialNumber: string | null;
            shipmentId: string;
        }[];
        notes: string | null;
        salesOrderId: string;
        shippedDate: Date;
        shipmentNumber: string;
        status:
            | "DELIVERED"
            | "IN_TRANSIT"
            | "PACKED"
            | "PENDING"
            | "PICKED"
            | "RETURNED"
            | "SHIPPED";
        trackingNumber: string | null;
        updatedAt: Date;
    }[];
    shippedDate: Date | null;
    shippingAddress: string | null;
    shippingCost: number;
    status:
        | "CANCELLED"
        | "CONFIRMED"
        | "DELIVERED"
        | "DRAFT"
        | "FULFILLED"
        | "PARTIALLY_FULFILLED"
        | "SHIPPED";
    stockBuckets: {
        availableQuantity: number;
        batchNumber: string | null;
        createdAt: Date;
        expiryDate: Date | null;
        id: string;
        location: { code: string; id: string; name: string } | null;
        locationId: string | null;
        productId: string;
        quantity: number;
        reservedQuantity: number;
        serialNumber: string | null;
        status:
            | "AVAILABLE"
            | "DAMAGED"
            | "IN_TRANSIT"
            | "QUARANTINE"
            | "RESERVED";
        unitCost: number | null;
        updatedAt: Date;
        warehouse: { code: string; id: string; name: string };
        warehouseId: string;
    }[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    updatedAt: Date;
}

export const getSalesOrderDetail = createServerFn({ method: "GET" })
    .inputValidator(getSalesOrderDetailInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.SALES_ORDERS_VIEW_DETAIL)
        ) {
            throw new Error(
                "You do not have permission to view sales order detail."
            );
        }

        const order = await prisma.salesOrder.findFirst({
            include: {
                customer: {
                    select: {
                        code: true,
                        creditLimit: true,
                        id: true,
                        name: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
                shipments: {
                    include: {
                        items: true,
                    },
                    orderBy: [{ createdAt: "desc" }],
                },
            },
            where: { deletedAt: null, id: data.salesOrderId },
        });

        if (!order) {
            throw new Error("Sales order not found.");
        }

        const productIds = order.items.map((item) => item.productId);
        const stockBuckets = await prisma.stockItem.findMany({
            include: {
                location: { select: { code: true, id: true, name: true } },
                warehouse: { select: { code: true, id: true, name: true } },
            },
            orderBy: [{ updatedAt: "desc" }],
            where: {
                productId: { in: productIds },
                status: "AVAILABLE",
            },
        });

        return {
            ...order,
            items: order.items.map((item) => ({
                ...item,
                quantity: toNumber(item.quantity),
                shippedQuantity: toNumber(item.shippedQuantity),
            })),
            shipments: order.shipments.map((shipment) => ({
                ...shipment,
                items: shipment.items.map((item) => ({
                    ...item,
                    quantity: toNumber(item.quantity),
                })),
            })),
            stockBuckets: stockBuckets.map((bucket) => ({
                ...bucket,
                quantity: toNumber(bucket.quantity),
                reservedQuantity: toNumber(bucket.reservedQuantity),
                availableQuantity:
                    toNumber(bucket.quantity) -
                    toNumber(bucket.reservedQuantity),
            })),
        } satisfies SalesOrderDetailResponse;
    });
