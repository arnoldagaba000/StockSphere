import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { adjustStock } from "./adjust-stock";

const cycleCountSchema = z.object({
    countedQuantity: z.preprocess((value) => Number(value), z.number().min(0)),
    notes: z.string().max(500).nullable().optional(),
    stockItemId: z.string().min(1),
});

export const submitCycleCount = createServerFn({ method: "POST" })
    .inputValidator(cycleCountSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_CYCLE_COUNT_PERFORM
            )
        ) {
            throw new Error(
                "You do not have permission to perform cycle count."
            );
        }

        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_CYCLE_COUNT_SUBMIT_DISCREPANCY
            )
        ) {
            throw new Error(
                "You do not have permission to submit cycle count discrepancies."
            );
        }

        await adjustStock({
            data: {
                countedQuantity: data.countedQuantity,
                notes: data.notes ?? "Cycle count submission",
                reason: "PHYSICAL_COUNT",
                stockItemId: data.stockItemId,
            },
        });

        return { success: true };
    });
