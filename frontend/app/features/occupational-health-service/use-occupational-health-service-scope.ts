import type { DashboardScope } from "@/features/aggregated-exposure/model/scope.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useTranslation } from "react-i18next";
import { href } from "react-router";

/** The occupational health service only sees its own yard, so it has no yard filter */
export function useOccupationalHealthServiceScope(): DashboardScope {
	const { t } = useTranslation();
	const { user } = useUser();

	return {
		site: user.location.site,
		title: t(($) => $.occupationalHealthServiceDashboard.title),
		description: t(($) => $.occupationalHealthServiceDashboard.description),
		showsGuidance: true,
		overviewPath: href("/occupational-health-service"),
		getGroupPath: (groupId) => href("/occupational-health-service/groups/:groupId", { groupId }),
	};
}
