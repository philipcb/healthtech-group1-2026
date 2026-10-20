import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { useManagementScope } from "@/features/management/use-management-scope.ts";
import { useTranslation } from "react-i18next";

/**
 * The aggregate API only allows the occupational health service (`OHSOnly`), and only for its own site, so management's
 * pages have no data and nothing is requested. They're rendered in a `DashboardScopeContext` with management's scope
 * once the backend gives management access.
 */
export default function ManagementLayout() {
	const { t } = useTranslation();
	const { title } = useManagementScope();

	return (
		<div className="flex w-full flex-col gap-5">
			<header className="border-b pb-5">
				<h1 className="font-medium text-2xl">{title}</h1>
			</header>
			<EmptyState
				title={t(($) => $.managementDashboard.unavailable.title)}
				description={t(($) => $.managementDashboard.unavailable.description)}
			/>
		</div>
	);
}
