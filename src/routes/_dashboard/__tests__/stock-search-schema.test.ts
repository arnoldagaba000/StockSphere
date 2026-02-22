import { describe, expect, test } from "vitest";
import { stockSearchSchema } from "../stock.tsx";

describe("stockSearchSchema", () => {
    test("defaults when params are missing", () => {
        const parsed = stockSearchSchema.parse({});

        expect(parsed).toEqual({});
    });

    test("coerces movement page to string and ignores invalid numbers", () => {
        const parsed = stockSearchSchema.parse({
            movementPage: 3,
            movementPageSize: 50,
            search: "bin",
        });

        expect(parsed.movementPage).toBe("1");
        expect(parsed.movementPageSize).toBe("25");
        expect(parsed.search).toBe("bin");
    });

    test("strips unknown movement filters to defaults", () => {
        const parsed = stockSearchSchema.parse({
            movementType: undefined,
            movementWarehouseId: null,
            status: "INACTIVE",
        });

        expect(parsed).toMatchObject({
            movementType: undefined,
            movementWarehouseId: "",
            status: "INACTIVE",
        });
    });
});
