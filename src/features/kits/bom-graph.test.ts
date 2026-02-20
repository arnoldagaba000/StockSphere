import { describe, expect, it } from "vitest";
import { createKitGraph, hasPath } from "@/features/kits/bom-graph";

describe("bom-graph", () => {
    it("detects transitive paths", () => {
        const graph = createKitGraph(
            ["A", "B", "C"],
            [
                { componentId: "B", kitId: "A" },
                { componentId: "C", kitId: "B" },
            ]
        );

        expect(hasPath(graph, "A", "C")).toBe(true);
        expect(hasPath(graph, "C", "A")).toBe(false);
    });

    it("supports disconnected kits", () => {
        const graph = createKitGraph(["A", "B"], []);
        expect(hasPath(graph, "A", "B")).toBe(false);
    });

    it("detects immediate cycles", () => {
        const graph = createKitGraph(["A"], [{ componentId: "A", kitId: "A" }]);
        expect(hasPath(graph, "A", "A")).toBe(true);
    });
});
