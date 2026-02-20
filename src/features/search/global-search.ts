import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export interface GlobalSearchItem {
    description: string;
    group: string;
    href: string;
    id: string;
    label: string;
}

const globalSearchInputSchema = z.object({
    limit: z.number().int().min(1).max(10).optional().default(5),
    query: z.string().trim().min(1).max(100),
});

export const globalSearch = createServerFn({ method: "GET" })
    .inputValidator(globalSearchInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const searchValue = data.query.trim();
        if (searchValue.length < 2) {
            return [] as GlobalSearchItem[];
        }

        const searchLimit = data.limit;
        const sessionUser = context.session.user;

        const productPromise = canUser(
            sessionUser,
            PERMISSIONS.PRODUCTS_VIEW_LIST
        )
            ? prisma.product.findMany({
                  orderBy: [{ updatedAt: "desc" }],
                  select: {
                      id: true,
                      name: true,
                      sku: true,
                  },
                  take: searchLimit,
                  where: {
                      deletedAt: null,
                      OR: [
                          {
                              name: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              sku: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              barcode: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                      ],
                  },
              })
            : Promise.resolve([]);

        const categoryPromise = canUser(
            sessionUser,
            PERMISSIONS.CATEGORIES_VIEW
        )
            ? prisma.category.findMany({
                  orderBy: [{ updatedAt: "desc" }],
                  select: {
                      id: true,
                      name: true,
                  },
                  take: searchLimit,
                  where: {
                      deletedAt: null,
                      name: {
                          contains: searchValue,
                          mode: "insensitive",
                      },
                  },
              })
            : Promise.resolve([]);

        const customerPromise = canUser(
            sessionUser,
            PERMISSIONS.CUSTOMERS_VIEW_LIST
        )
            ? prisma.customer.findMany({
                  orderBy: [{ updatedAt: "desc" }],
                  select: {
                      code: true,
                      id: true,
                      name: true,
                  },
                  take: searchLimit,
                  where: {
                      deletedAt: null,
                      OR: [
                          {
                              code: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              name: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              email: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                      ],
                  },
              })
            : Promise.resolve([]);

        const supplierPromise = canUser(
            sessionUser,
            PERMISSIONS.SUPPLIERS_VIEW_LIST
        )
            ? prisma.supplier.findMany({
                  orderBy: [{ updatedAt: "desc" }],
                  select: {
                      code: true,
                      id: true,
                      name: true,
                  },
                  take: searchLimit,
                  where: {
                      deletedAt: null,
                      OR: [
                          {
                              code: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              name: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              email: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                      ],
                  },
              })
            : Promise.resolve([]);

        const purchaseOrderPromise = canUser(
            sessionUser,
            PERMISSIONS.PURCHASE_ORDERS_VIEW_LIST
        )
            ? prisma.purchaseOrder.findMany({
                  orderBy: [{ updatedAt: "desc" }],
                  select: {
                      id: true,
                      orderNumber: true,
                      supplier: {
                          select: {
                              name: true,
                          },
                      },
                  },
                  take: searchLimit,
                  where: {
                      deletedAt: null,
                      OR: [
                          {
                              orderNumber: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              supplier: {
                                  name: {
                                      contains: searchValue,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      ],
                  },
              })
            : Promise.resolve([]);

        const salesOrderPromise = canUser(
            sessionUser,
            PERMISSIONS.SALES_ORDERS_VIEW_LIST
        )
            ? prisma.salesOrder.findMany({
                  orderBy: [{ updatedAt: "desc" }],
                  select: {
                      customer: {
                          select: {
                              name: true,
                          },
                      },
                      id: true,
                      orderNumber: true,
                  },
                  take: searchLimit,
                  where: {
                      deletedAt: null,
                      OR: [
                          {
                              orderNumber: {
                                  contains: searchValue,
                                  mode: "insensitive",
                              },
                          },
                          {
                              customer: {
                                  name: {
                                      contains: searchValue,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      ],
                  },
              })
            : Promise.resolve([]);

        const [
            products,
            categories,
            customers,
            suppliers,
            purchaseOrders,
            salesOrders,
        ] = await Promise.all([
            productPromise,
            categoryPromise,
            customerPromise,
            supplierPromise,
            purchaseOrderPromise,
            salesOrderPromise,
        ]);

        return [
            ...products.map((item) => ({
                description: `SKU: ${item.sku}`,
                group: "Products",
                href: `/products/${item.id}`,
                id: `product-${item.id}`,
                label: item.name,
            })),
            ...categories.map((item) => ({
                description: "Category",
                group: "Categories",
                href: `/categories/${item.id}`,
                id: `category-${item.id}`,
                label: item.name,
            })),
            ...customers.map((item) => ({
                description: `Customer Code: ${item.code}`,
                group: "Customers",
                href: "/customers",
                id: `customer-${item.id}`,
                label: item.name,
            })),
            ...suppliers.map((item) => ({
                description: `Supplier Code: ${item.code}`,
                group: "Suppliers",
                href: "/suppliers",
                id: `supplier-${item.id}`,
                label: item.name,
            })),
            ...purchaseOrders.map((item) => ({
                description: `Supplier: ${item.supplier.name}`,
                group: "Purchase Orders",
                href: "/purchase-orders",
                id: `po-${item.id}`,
                label: item.orderNumber,
            })),
            ...salesOrders.map((item) => ({
                description: `Customer: ${item.customer.name}`,
                group: "Sales Orders",
                href: "/sales-orders",
                id: `so-${item.id}`,
                label: item.orderNumber,
            })),
        ] satisfies GlobalSearchItem[];
    });
