import { useState } from "react";
import toast from "react-hot-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfirmActionButtonProps {
    confirmDescription: string;
    confirmTitle: string;
    disabled?: boolean;
    label: string;
    onConfirm: () => Promise<void>;
    tooltip: string;
    variant?: "destructive" | "outline";
}

const ConfirmActionButton = ({
    confirmDescription,
    confirmTitle,
    disabled = false,
    label,
    onConfirm,
    tooltip,
    variant = "outline",
}: ConfirmActionButtonProps) => {
    const [isPending, setIsPending] = useState(false);
    const isDisabled = disabled || isPending;

    const handleConfirm = async (): Promise<void> => {
        if (isPending) {
            return;
        }

        try {
            setIsPending(true);
            await onConfirm();
            setIsPending(false);
        } catch (error) {
            setIsPending(false);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to perform action.";
            toast.error(message);
        }
    };

    return (
        <Tooltip>
            <AlertDialog>
                <AlertDialogTrigger
                    disabled={isDisabled}
                    render={
                        <TooltipTrigger
                            render={
                                <Button
                                    disabled={isDisabled}
                                    size="sm"
                                    variant={variant}
                                >
                                    {isPending ? "Working..." : label}
                                </Button>
                            }
                        />
                    }
                />
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isPending}
                            onClick={handleConfirm}
                        >
                            {isPending ? "Working..." : "Confirm"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
};

export default ConfirmActionButton;
