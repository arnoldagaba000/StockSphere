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
}: UserRoleSelectProps) => (
    <Select
        disabled={disabled}
        onValueChange={(nextValue) => onChange(nextValue as AppUserRole)}
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

export default UserRoleSelect;
