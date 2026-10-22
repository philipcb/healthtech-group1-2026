import type { DashboardScope } from "@/features/aggregated-exposure/model/scope.ts";
import { createContext, useContext } from "react";

/** Provided by each role's layout route, see `DashboardScope` */
export const DashboardScopeContext = createContext<DashboardScope | undefined>(undefined);

export function useDashboardScope() {
	const context = useContext(DashboardScopeContext);

	if (context === undefined) {
		throw new Error("useDashboardScope must be used within a DashboardScopeContext");
	}

	return context;
}
