export const createKitGraph = (
    kitIds: string[],
    edges: Array<{ componentId: string; kitId: string }>
): Map<string, string[]> => {
    const graph = new Map<string, string[]>();
    for (const kitId of kitIds) {
        graph.set(kitId, []);
    }
    for (const edge of edges) {
        if (!graph.has(edge.kitId)) {
            graph.set(edge.kitId, []);
        }
        graph.get(edge.kitId)?.push(edge.componentId);
    }
    return graph;
};

export const hasPath = (
    graph: Map<string, string[]>,
    fromId: string,
    targetId: string
): boolean => {
    const visited = new Set<string>();
    const stack: string[] = [fromId];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) {
            continue;
        }
        if (current === targetId) {
            return true;
        }

        visited.add(current);
        const children = graph.get(current) ?? [];
        for (const child of children) {
            stack.push(child);
        }
    }

    return false;
};
