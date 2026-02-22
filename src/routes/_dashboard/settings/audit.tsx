import { createFileRoute } from "@tanstack/react-router";
import { useReducer } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    page: number;
    pageSize: number;
    userId: string;
}

const auditPageReducer = (
    state: AuditPageState,
    patch: Partial<AuditPageState>
): AuditPageState => ({
    ...state,
    ...patch,
});

const escapeCsvValue = (value: string): string => {
    const escapedValue = value.replaceAll('"', '""');
    return `"${escapedValue}"`;
};

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
        page: 1,
        pageSize: 20,
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
    const totalPages = Math.max(
        1,
        Math.ceil(filteredLogs.length / state.pageSize)
    );
    const currentPage = Math.min(state.page, totalPages);
    const pageStart = (currentPage - 1) * state.pageSize;
    const paginatedLogs = filteredLogs.slice(
        pageStart,
        pageStart + state.pageSize
    );
    const exportFilteredLogs = () => {
        if (filteredLogs.length === 0) {
            return;
        }

        const headers = [
            "createdAt",
            "userId",
            "userName",
            "userEmail",
            "userRole",
            "action",
            "entity",
            "entityId",
        ];
        const rows = filteredLogs.map((entry) =>
            [
                new Date(entry.createdAt).toISOString(),
                entry.user.id,
                entry.user.name ?? "",
                entry.user.email,
                entry.user.role,
                entry.action,
                entry.entity,
                entry.entityId,
            ]
                .map((field) => escapeCsvValue(String(field)))
                .join(",")
        );
        const csvText = [headers.join(","), ...rows].join("\n");
        const csvBlob = new Blob([csvText], {
            type: "text/csv;charset=utf-8",
        });
        const csvUrl = URL.createObjectURL(csvBlob);
        const linkElement = document.createElement("a");
        linkElement.href = csvUrl;
        linkElement.download = `audit-trail-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        linkElement.click();
        URL.revokeObjectURL(csvUrl);
    };

    return (
        <section className="w-full min-w-0 space-y-4">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">Audit Trail</h1>
                <p className="text-muted-foreground text-sm">
                    Review user activity and operational changes across the
                    platform.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Audit Trail</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <Input
                        onChange={(event) =>
                            setState({
                                action: event.target.value,
                                page: 1,
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
                                page: 1,
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
                                page: 1,
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle>
                            Activity Entries{" "}
                            <Badge className="ml-2" variant="outline">
                                {filteredLogs.length}
                            </Badge>
                        </CardTitle>
                        <Button
                            disabled={
                                !data.capabilities.canExport ||
                                filteredLogs.length === 0
                            }
                            onClick={exportFilteredLogs}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            Export CSV
                        </Button>
                    </div>
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
                                {paginatedLogs.length === 0 ? (
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
                                    paginatedLogs.map((entry) => (
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
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                        <div className="text-muted-foreground text-xs">
                            Showing {paginatedLogs.length} of{" "}
                            {filteredLogs.length} filtered entries (total{" "}
                            {data.logs.length}).
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                onChange={(event) =>
                                    setState({
                                        page: 1,
                                        pageSize: Number(event.target.value),
                                    })
                                }
                                value={state.pageSize}
                            >
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                            <Button
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setState({
                                        page: Math.max(1, currentPage - 1),
                                    })
                                }
                                size="sm"
                                type="button"
                                variant="outline"
                            >
                                Previous
                            </Button>
                            <span className="text-muted-foreground text-xs">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                disabled={currentPage >= totalPages}
                                onClick={() =>
                                    setState({
                                        page: Math.min(
                                            totalPages,
                                            currentPage + 1
                                        ),
                                    })
                                }
                                size="sm"
                                type="button"
                                variant="outline"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
