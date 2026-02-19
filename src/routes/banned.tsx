import { createFileRoute, Link } from "@tanstack/react-router";
import z from "zod";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const searchSchema = z.object({
    reason: z.string().optional(),
});

export const Route = createFileRoute("/banned")({
    component: BannedPage,
    validateSearch: searchSchema,
});

function BannedPage() {
    const search = Route.useSearch();

    return (
        <section className="mx-auto flex min-h-svh w-full max-w-xl items-center p-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Account Restricted</CardTitle>
                    <CardDescription>
                        Your account has been banned from accessing this system.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <p>
                        If you believe this is a mistake, contact your
                        administrator and provide your account email.
                    </p>
                    {search.reason ? (
                        <p className="rounded-md bg-muted p-3 text-muted-foreground">
                            {search.reason}
                        </p>
                    ) : null}
                    <p>
                        You can go back to <Link to="/login">login</Link> after
                        your ban has been lifted.
                    </p>
                </CardContent>
            </Card>
        </section>
    );
}
