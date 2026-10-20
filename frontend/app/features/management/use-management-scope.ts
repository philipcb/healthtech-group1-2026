import type { DashboardScope } from "@/features/aggregated-exposure/model/scope.ts";
import { YardFilter } from "@/features/management/yard-filter.tsx";
import { useTranslation } from "react-i18next";
import { href } from "react-router";

/** Management sees every yard it has access to, which the backend decides, and can narrow it down to one */
export function useManagementScope(): DashboardScope {
	const { t } = useTranslation();

	return {
		site: null,
		title: t(($) => $.managementDashboard.title),
		overviewPath: href("/management"),
		getGroupPath: (groupId) => href("/management/groups/:groupId", { groupId }),
		showsGuidance: false,
		YardFilter,
	};
}
