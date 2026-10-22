import { DashboardScopeContext } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { useOccupationalHealthServiceScope } from "@/features/occupational-health-service/use-occupational-health-service-scope.ts";
import { Outlet } from "react-router";

export default function OccupationalHealthServiceLayout() {
	const scope = useOccupationalHealthServiceScope();

	return (
		<DashboardScopeContext value={scope}>
			<Outlet />
		</DashboardScopeContext>
	);
}
