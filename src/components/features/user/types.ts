export interface ManagedUser {
    banned: boolean | null;
    email: string;
    id: string;
    name: string;
    role: string | null;
}

export interface UserActionContext {
    isBusy: boolean;
    isCurrentUser: boolean;
    manageable: boolean;
}
