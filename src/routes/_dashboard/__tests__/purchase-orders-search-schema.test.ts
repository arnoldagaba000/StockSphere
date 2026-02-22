import { describe, expect, test } from "vitest";
import { purchaseOrdersSearchSchema } from "../purchase-orders.tsx";

describe("purchaseOrdersSearchSchema", () => {
    test("defaults search params when missing", () => {
        const parsed = purchaseOrdersSearchSchema.parse({});

        expect({
            search: parsed.search ?? "",
            status: parsed.status ?? "all",
            supplierId: parsed.supplierId ?? "",
        }).toEqual({
            search: "",
            status: "all",
            supplierId: "",
        });
    });

    test("accepts known status values", () => {
        const parsed = purchaseOrdersSearchSchema.parse({
            status: "APPROVED",
            search: "po-123",
            supplierId: "supplier-1",
        });

        expect(parsed).toEqual({
            search: "po-123",
            status: "APPROVED",
            supplierId: "supplier-1",
        });
    });

    test("falls back to defaults on invalid values", () => {
        const parsed = purchaseOrdersSearchSchema.parse({
            status: "INVALID",
            supplierId: 123,
        });

        expect({
            search: parsed.search ?? "",
            status: parsed.status ?? "all",
            supplierId: parsed.supplierId ?? "",
        }).toEqual({
            search: "",
            status: "all",
            supplierId: "",
        });
    });
});
