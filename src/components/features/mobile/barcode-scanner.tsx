import { useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BarcodeScannerProps {
    disabled?: boolean;
    onDetected: (value: string) => void;
}

interface ScannerState {
    error: string | null;
    isStarting: boolean;
    isStreaming: boolean;
    isSupported: boolean;
    manualValue: string;
}

type ScannerAction = Partial<ScannerState>;
interface DetectedBarcode {
    rawValue?: string;
}

interface BarcodeDetectorLike {
    detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
    new (options: { formats: string[] }): BarcodeDetectorLike;
}

const getBarcodeDetectorConstructor = (): BarcodeDetectorConstructor | null => {
    if (typeof window === "undefined") {
        return null;
    }
    const maybeConstructor = (
        window as Window & {
            BarcodeDetector?: BarcodeDetectorConstructor;
        }
    ).BarcodeDetector;

    return typeof maybeConstructor === "function" ? maybeConstructor : null;
};

const scannerReducer = (
    state: ScannerState,
    patch: ScannerAction
): ScannerState => ({
    ...state,
    ...patch,
});

const SCAN_INTERVAL_MS = 350;
const getScannerErrorMessage = (error: unknown): string => {
    if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
            return "Camera permission denied. Allow camera access or use manual barcode entry.";
        }
        if (error.name === "NotFoundError") {
            return "No camera detected on this device. Use manual barcode entry.";
        }
        if (error.name === "NotReadableError" || error.name === "AbortError") {
            return "Camera is unavailable. It may be in use by another app.";
        }
        if (error.name === "SecurityError") {
            return "Camera access requires a secure context (HTTPS or localhost).";
        }
    }

    return "Unable to access camera. Use manual barcode entry instead.";
};

export function BarcodeScanner({
    disabled = false,
    onDetected,
}: BarcodeScannerProps) {
    const [state, setState] = useReducer(scannerReducer, {
        error: null,
        isSupported: getBarcodeDetectorConstructor() !== null,
        isStarting: false,
        isStreaming: false,
        manualValue: "",
    });

    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const detectorRef = useRef<BarcodeDetectorLike | null>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
            }
            if (streamRef.current) {
                for (const track of streamRef.current.getTracks()) {
                    track.stop();
                }
            }
        };
    }, []);

    const stopScanning = () => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (streamRef.current) {
            for (const track of streamRef.current.getTracks()) {
                track.stop();
            }
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setState({ isStreaming: false });
    };

    const startScanning = async () => {
        if (!(state.isSupported && videoRef.current)) {
            setState({
                error: "Camera barcode scanning is not supported here.",
            });
            return;
        }
        const BarcodeDetectorImpl = getBarcodeDetectorConstructor();
        if (!BarcodeDetectorImpl) {
            setState({
                error: "Camera barcode scanning is not supported here.",
            });
            return;
        }

        setState({ error: null, isStarting: true });
        await navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: { facingMode: "environment" },
            })
            .then(async (stream) => {
                streamRef.current = stream;
                if (!videoRef.current) {
                    throw new Error("Video element unavailable.");
                }
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                detectorRef.current = new BarcodeDetectorImpl({
                    formats: [
                        "ean_13",
                        "ean_8",
                        "code_128",
                        "qr_code",
                        "upc_a",
                    ],
                });

                intervalRef.current = window.setInterval(async () => {
                    if (!(videoRef.current && detectorRef.current)) {
                        return;
                    }
                    const barcodes = await detectorRef.current.detect(
                        videoRef.current
                    );
                    const value = barcodes[0]?.rawValue?.trim();
                    if (value) {
                        onDetected(value);
                        stopScanning();
                    }
                }, SCAN_INTERVAL_MS);

                setState({ isStarting: false, isStreaming: true });
            })
            .catch((error: unknown) => {
                stopScanning();
                setState({
                    error: getScannerErrorMessage(error),
                    isStarting: false,
                });
            });
    };

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
                <p className="font-medium text-sm">Barcode Scan</p>
                {state.isStreaming ? (
                    <Button
                        disabled={disabled}
                        onClick={stopScanning}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        Stop Camera
                    </Button>
                ) : (
                    <Button
                        disabled={
                            disabled || !state.isSupported || state.isStarting
                        }
                        onClick={() => {
                            startScanning().catch(() => undefined);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        {state.isStarting ? "Starting..." : "Scan with Camera"}
                    </Button>
                )}
            </div>

            {state.isStreaming ? (
                <video
                    className="w-full rounded-md border"
                    muted
                    playsInline
                    ref={videoRef}
                >
                    <track
                        kind="captions"
                        label="Barcode scanner feed"
                        srcLang="en"
                    />
                </video>
            ) : null}

            {state.error ? (
                <p className="text-destructive text-xs">{state.error}</p>
            ) : null}
            {state.isSupported ? null : (
                <p className="text-muted-foreground text-xs">
                    Camera scanning is not supported in this browser. Use manual
                    barcode entry.
                </p>
            )}

            <div className="space-y-2">
                <Label htmlFor="manual-barcode">Manual barcode entry</Label>
                <div className="flex gap-2">
                    <Input
                        disabled={disabled}
                        id="manual-barcode"
                        onChange={(event) =>
                            setState({ manualValue: event.target.value })
                        }
                        placeholder="Enter barcode"
                        value={state.manualValue}
                    />
                    <Button
                        disabled={
                            disabled || state.manualValue.trim().length === 0
                        }
                        onClick={() => {
                            onDetected(state.manualValue.trim());
                            setState({ manualValue: "" });
                        }}
                        type="button"
                        variant="secondary"
                    >
                        Use
                    </Button>
                </div>
            </div>
        </div>
    );
}
