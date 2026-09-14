import { parseAsView } from "@/lib/views.ts";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { ViewContext } from "./use-view.ts";

export function ViewProvider({ children }: { children: ReactNode }) {
	const [view, setView] = useQueryState("view", parseAsView.withDefault("day").withOptions({ history: "push" }));

	return <ViewContext value={{ view, setView }}>{children}</ViewContext>;
}
