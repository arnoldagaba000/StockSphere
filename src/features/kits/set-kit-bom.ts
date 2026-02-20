import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { setKitBomSchema } from "@/schemas/kit-schema";

const loadKitGraph = async (kitId: string): Promise<Map<string, string[]>> => {
    const [kitProducts, edges] = await Promise.all([
        prisma.product.findMany({
            where: { deletedAt: null, isKit: true },
            select: { id: true },
        }),
        prisma.kitComponent.findMany({
            select: { componentId: true, kitId: true },
        }),
    ]);

    const graph = new Map<string, string[]>();
    for (const product of kitProducts) {
        graph.set(product.id, []);
    }
    if (!graph.has(kitId)) {
        graph.set(kitId, []);
    }
    for (const edge of edges) {
        if (!graph.has(edge.kitId)) {
            graph.set(edge.kitId, []);
        }
        graph.get(edge.kitId)?.push(edge.componentId);
    }
    return graph;
};

const hasPath = (
    graph: Map<string, string[]>,
    fromId: string,
    targetId: string
): boolean => {
    const visited = new Set<string>();
    const stack: string[] = [fromId];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) {
            continue;
        }
        if (current === targetId) {
            return true;
        }
        visited.add(current);
        const children = graph.get(current) ?? [];
        for (const child of children) {
            stack.push(child);
        }
    }
    return false;
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

        const graph = await loadKitGraph(data.kitId);
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
