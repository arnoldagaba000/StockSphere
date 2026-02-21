import { createFileRoute } from "@tanstack/react-router";
import { useReducer } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getActivityLogs } from "@/features/audit/get-activity-logs";

interface AuditPageState {
    action: string;
    entity: string;
    userId: string;
}

const auditPageReducer = (
    state: AuditPageState,
    patch: Partial<AuditPageState>
): AuditPageState => ({
    ...state,
    ...patch,
});

export const Route = createFileRoute("/_dashboard/settings/audit")({
    component: AuditSettingsPage,
    loader: async () =>
        await getActivityLogs({
            data: {},
        }),
});

function AuditSettingsPage() {
    const data = Route.useLoaderData();
    const [state, setState] = useReducer(auditPageReducer, {
        action: "",
        entity: "",
        userId: "",
    });

    const filteredLogs = data.logs.filter((entry) => {
        if (
            state.action.trim() &&
            !entry.action
                .toLowerCase()
                .includes(state.action.trim().toLowerCase())
        ) {
            return false;
        }

        if (
            state.entity.trim() &&
            !entry.entity
                .toLowerCase()
                .includes(state.entity.trim().toLowerCase())
        ) {
            return false;
        }

        if (state.userId.trim() && entry.userId !== state.userId.trim()) {
            return false;
        }

        return true;
    });

    return (
        <section className="w-full min-w-0 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Audit Trail</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <Input
                        onChange={(event) =>
                            setState({
                                action: event.target.value,
                            })
                        }
                        placeholder="Filter by action"
                        value={state.action}
                    />
                    <Input
                        disabled={!data.capabilities.canFilterByEntity}
                        onChange={(event) =>
                            setState({
                                entity: event.target.value,
                            })
                        }
                        placeholder={
                            data.capabilities.canFilterByEntity
                                ? "Filter by entity"
                                : "Entity filter requires manager+ role"
                        }
                        value={state.entity}
                    />
                    <Input
                        disabled={!data.capabilities.canFilterByUser}
                        onChange={(event) =>
                            setState({
                                userId: event.target.value,
                            })
                        }
                        placeholder={
                            data.capabilities.canFilterByUser
                                ? "Filter by user ID"
                                : "User filter requires manager+ role"
                        }
                        value={state.userId}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Activity Entries{" "}
                        <Badge className="ml-2" variant="outline">
                            {filteredLogs.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                    <div className="w-full overflow-x-auto">
                        <Table className="min-w-[760px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Entity ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            className="text-center text-muted-foreground"
                                            colSpan={5}
                                        >
                                            No activity found for current
                                            filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <span className="whitespace-nowrap">
                                                    {new Date(
                                                        entry.createdAt
                                                    ).toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-64 space-y-0.5">
                                                    <p className="font-medium text-sm">
                                                        {entry.user.name ??
                                                            entry.user.email}
                                                    </p>
                                                    <p className="truncate text-muted-foreground text-xs">
                                                        {entry.user.role} ·{" "}
                                                        {entry.user.id}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {entry.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {entry.entity}
                                            </TableCell>
                                            <TableCell className="max-w-56 truncate font-mono text-xs">
                                                {entry.entityId}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="pt-3 text-muted-foreground text-xs">
                        Loaded latest {data.logs.length} entries.
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
