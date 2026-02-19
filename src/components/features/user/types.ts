export interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: string | null;
    banned: boolean | null;
}

export interface UserActionContext {
    isBusy: boolean;
    isCurrentUser: boolean;
    manageable: boolean;
}
