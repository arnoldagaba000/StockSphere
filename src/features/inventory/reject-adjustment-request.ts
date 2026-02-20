import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import {
    ADJUSTMENT_APPROVAL_APPROVED_ACTION,
    ADJUSTMENT_APPROVAL_REJECTED_ACTION,
    ADJUSTMENT_APPROVAL_REQUESTED_ACTION,
    INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
} from "./adjustment-approval-request";

const rejectAdjustmentRequestSchema = z.object({
    reason: z.string().trim().min(3).max(500),
    requestId: z.string().min(1),
});

export const rejectAdjustmentRequest = createServerFn({ method: "POST" })
    .inputValidator(rejectAdjustmentRequestSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_ADJUST_REJECT)
        ) {
            throw new Error(
                "You do not have permission to reject adjustment requests."
            );
        }

        const requestLog = await prisma.activityLog.findUnique({
            where: { id: data.requestId },
        });
        if (
            !requestLog ||
            requestLog.action !== ADJUSTMENT_APPROVAL_REQUESTED_ACTION ||
            requestLog.entity !== INVENTORY_ADJUSTMENT_REQUEST_ENTITY
        ) {
            throw new Error("Adjustment approval request not found.");
        }

        const existingResolution = await prisma.activityLog.findFirst({
            where: {
                action: {
                    in: [
                        ADJUSTMENT_APPROVAL_APPROVED_ACTION,
                        ADJUSTMENT_APPROVAL_REJECTED_ACTION,
                    ],
                },
                entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
                entityId: data.requestId,
            },
            select: { id: true },
        });
        if (existingResolution) {
            throw new Error("This request has already been resolved.");
        }

        await logActivity({
            action: ADJUSTMENT_APPROVAL_REJECTED_ACTION,
            actorUserId: context.session.user.id,
            changes: {
                reason: data.reason,
                requestId: data.requestId,
            },
            entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
            entityId: data.requestId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            requestId: data.requestId,
        };
    });
