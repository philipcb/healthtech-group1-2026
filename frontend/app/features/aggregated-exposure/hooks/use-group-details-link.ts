import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { type To, useLocation } from "react-router";

export function useGroupDetailsLink() {
	const { search } = useLocation();
	const { getGroupPath } = useDashboardScope();

	return (groupId: string, exposure: Exposure): To => {
		const searchParams = new URLSearchParams(search);
		searchParams.set("exposure", exposure);

		return { pathname: getGroupPath(groupId), search: `?${searchParams}` };
	};
}
