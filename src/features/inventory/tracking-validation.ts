interface TrackingConfig {
    trackByBatch: boolean;
    trackByExpiry: boolean;
    trackBySerialNumber: boolean;
}

interface TrackingInput {
    batchNumber?: string | null;
    expiryDate?: Date | null;
    serialNumber?: string | null;
}

const hasNonEmptyValue = (value: string | null | undefined): boolean =>
    typeof value === "string" && value.trim().length > 0;

export const validateRequiredTrackingFields = (
    trackingConfig: TrackingConfig,
    trackingInput: TrackingInput
): void => {
    if (
        trackingConfig.trackByBatch &&
        !hasNonEmptyValue(trackingInput.batchNumber)
    ) {
        throw new Error("This product requires a batch number.");
    }
    if (trackingConfig.trackByExpiry && !trackingInput.expiryDate) {
        throw new Error("This product requires an expiry date.");
    }
    if (
        trackingConfig.trackBySerialNumber &&
        !hasNonEmptyValue(trackingInput.serialNumber)
    ) {
        throw new Error("This product requires a serial number.");
    }
};
