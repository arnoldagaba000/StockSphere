import { describe, expect, test } from "vitest";
import { productsSearchSchema } from "../products/index.tsx";

describe("productsSearchSchema", () => {
    test("provides defaults when search params are missing", () => {
        const parsed = productsSearchSchema.parse({});

        expect({
            categoryId: parsed.categoryId ?? undefined,
            includeDescendants: parsed.includeDescendants ?? false,
            maxPrice: parsed.maxPrice ?? undefined,
            minPrice: parsed.minPrice ?? undefined,
            search: parsed.search ?? "",
            status: parsed.status ?? "active",
            trackBatch: parsed.trackBatch ?? "all",
            trackExpiry: parsed.trackExpiry ?? "all",
            trackSerial: parsed.trackSerial ?? "all",
        }).toEqual({
            categoryId: undefined,
            includeDescendants: false,
            maxPrice: undefined,
            minPrice: undefined,
            search: "",
            status: "active",
            trackBatch: "all",
            trackExpiry: "all",
            trackSerial: "all",
        });
    });

    test("coerces numeric values and trims invalid numbers", () => {
        const parsed = productsSearchSchema.parse({
            maxPrice: "12.5",
            minPrice: "abc",
        });

        expect(parsed.maxPrice).toBe(12.5);
        expect(parsed.minPrice).toBeUndefined();
    });

    test("respects provided filters", () => {
        const parsed = productsSearchSchema.parse({
            categoryId: "cat-1",
            includeDescendants: "true",
            search: "sku123",
            status: "inactive",
            trackBatch: "yes",
            trackExpiry: "no",
            trackSerial: "yes",
        });

        expect(parsed).toMatchObject({
            categoryId: "cat-1",
            includeDescendants: true,
            search: "sku123",
            status: "inactive",
            trackBatch: "yes",
            trackExpiry: "no",
            trackSerial: "yes",
        });
    });
});
