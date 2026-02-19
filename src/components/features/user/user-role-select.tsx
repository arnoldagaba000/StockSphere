import { useState } from "react";
import toast from "react-hot-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { type AppUserRole, USER_ROLES } from "@/lib/auth/roles";
import { formatRole } from "./role-utils";

interface UserRoleSelectProps {
    canAssignSuperAdmin: boolean;
    disabled?: boolean;
    onChange: (role: AppUserRole) => Promise<void>;
    value: AppUserRole;
}

const UserRoleSelect = ({
    canAssignSuperAdmin,
    disabled = false,
    onChange,
    value,
}: UserRoleSelectProps) => {
    const [isPending, setIsPending] = useState(false);
    const handleValueChange = (nextValue: AppUserRole | null): void => {
        if (!nextValue) {
            return;
        }

        setIsPending(true);
        onChange(nextValue)
            .catch((error) => {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to update role.";
                toast.error(message);
            })
            .finally(() => {
                setIsPending(false);
            });
    };

    return (
        <Select
            disabled={disabled || isPending}
            onValueChange={handleValueChange}
            value={value}
        >
            <SelectTrigger className="w-44">
                <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
                {USER_ROLES.map((roleOption) => (
                    <SelectItem
                        disabled={
                            !canAssignSuperAdmin && roleOption === "SUPER_ADMIN"
                        }
                        key={roleOption}
                        value={roleOption}
                    >
                        {formatRole(roleOption)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default UserRoleSelect;
