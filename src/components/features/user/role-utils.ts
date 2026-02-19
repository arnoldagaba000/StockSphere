export const formatRole = (role: string | null | undefined): string => {
    if (!role) {
        return "Viewer";
    }

    return role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};
