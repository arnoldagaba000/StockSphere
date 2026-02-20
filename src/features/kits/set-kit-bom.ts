import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { createKitGraph, hasPath } from "@/features/kits/bom-graph";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { setKitBomSchema } from "@/schemas/kit-schema";

const loadKitGraph = async (): Promise<Map<string, string[]>> => {
    const [kitProducts, edges] = await Promise.all([
        prisma.product.findMany({
            where: { deletedAt: null, isKit: true },
            select: { id: true },
        }),
        prisma.kitComponent.findMany({
            select: { componentId: true, kitId: true },
        }),
    ]);
    return createKitGraph(
        kitProducts.map((product) => product.id),
        edges
    );
};

export const setKitBom = createServerFn({ method: "POST" })
    .inputValidator(setKitBomSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.KITS_EDIT_BOM)) {
            throw new Error("You do not have permission to edit kit BOM.");
        }

        const [kit, components] = await Promise.all([
            prisma.product.findFirst({
                where: { deletedAt: null, id: data.kitId },
                select: { id: true, isKit: true, name: true },
            }),
            prisma.product.findMany({
                where: {
                    deletedAt: null,
                    id: {
                        in: data.components.map(
                            (component) => component.componentId
                        ),
                    },
                },
                select: { id: true, name: true },
            }),
        ]);

        if (!kit) {
            throw new Error("Kit product not found.");
        }
        if (!kit.isKit) {
            throw new Error("Target product must be marked as a kit.");
        }

        const componentMap = new Map(components.map((item) => [item.id, item]));
        for (const component of data.components) {
            if (!componentMap.has(component.componentId)) {
                throw new Error(
                    `Component product not found: ${component.componentId}`
                );
            }
            if (component.componentId === data.kitId) {
                throw new Error("A kit cannot include itself as a component.");
            }
        }

        const graph = await loadKitGraph();
        if (!graph.has(data.kitId)) {
            graph.set(data.kitId, []);
        }
        graph.set(
            data.kitId,
            data.components.map((component) => component.componentId)
        );
        for (const component of data.components) {
            if (hasPath(graph, component.componentId, data.kitId)) {
                throw new Error(
                    "Circular BOM detected. Please remove recursive kit dependencies."
                );
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.kitComponent.deleteMany({
                where: { kitId: data.kitId },
            });

            await tx.kitComponent.createMany({
                data: data.components.map((component) => ({
                    componentId: component.componentId,
                    kitId: data.kitId,
                    quantity: component.quantity,
                })),
            });

            const updatedBom = await tx.kitComponent.findMany({
                where: { kitId: data.kitId },
                include: {
                    component: {
                        select: { id: true, name: true, sku: true, unit: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            });

            return updatedBom.map((entry) => ({
                componentId: entry.componentId,
                componentName: entry.component.name,
                componentSku: entry.component.sku,
                componentUnit: entry.component.unit,
                quantityPerKit: toNumber(entry.quantity),
            }));
        });

        return {
            bom: result,
            kitId: data.kitId,
        };
    });
