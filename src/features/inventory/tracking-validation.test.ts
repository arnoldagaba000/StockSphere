import { describe, expect, test } from "bun:test";
import { validateRequiredTrackingFields } from "@/features/inventory/tracking-validation";

describe("validateRequiredTrackingFields", () => {
    test("passes when no tracking fields are required", () => {
        expect(() =>
            validateRequiredTrackingFields(
                {
                    trackByBatch: false,
                    trackByExpiry: false,
                    trackBySerialNumber: false,
                },
                {}
            )
        ).not.toThrow();
    });

    test("requires batch number for batch-tracked product", () => {
        expect(() =>
            validateRequiredTrackingFields(
                {
                    trackByBatch: true,
                    trackByExpiry: false,
                    trackBySerialNumber: false,
                },
                {
                    batchNumber: null,
                }
            )
        ).toThrow("This product requires a batch number.");
    });

    test("requires expiry date for expiry-tracked product", () => {
        expect(() =>
            validateRequiredTrackingFields(
                {
                    trackByBatch: false,
                    trackByExpiry: true,
                    trackBySerialNumber: false,
                },
                {
                    expiryDate: null,
                }
            )
        ).toThrow("This product requires an expiry date.");
    });

    test("requires serial number for serial-tracked product", () => {
        expect(() =>
            validateRequiredTrackingFields(
                {
                    trackByBatch: false,
                    trackByExpiry: false,
                    trackBySerialNumber: true,
                },
                {
                    serialNumber: "",
                }
            )
        ).toThrow("This product requires a serial number.");
    });

    test("passes when all required values are provided", () => {
        expect(() =>
            validateRequiredTrackingFields(
                {
                    trackByBatch: true,
                    trackByExpiry: true,
                    trackBySerialNumber: true,
                },
                {
                    batchNumber: "BATCH-001",
                    expiryDate: new Date("2027-01-01T00:00:00.000Z"),
                    serialNumber: "SER-001",
                }
            )
        ).not.toThrow();
    });
});
