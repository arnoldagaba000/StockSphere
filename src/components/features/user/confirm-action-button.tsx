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
}: ConfirmActionButtonProps) => (
    <Tooltip>
        <AlertDialog>
            <AlertDialogTrigger
                disabled={disabled}
                render={
                    <TooltipTrigger
                        render={
                            <Button
                                disabled={disabled}
                                size="sm"
                                variant={variant}
                            >
                                {label}
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
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
);

export default ConfirmActionButton;
