import { DashboardScopeContext } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { useManagementScope } from "@/features/management/use-management-scope.ts";
import { Outlet } from "react-router";

export default function ManagementLayout() {
	const scope = useManagementScope();

	return (
		<DashboardScopeContext value={scope}>
			<Outlet />
		</DashboardScopeContext>
	);
}
