import { useUser } from "@/features/user/user-context.tsx";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

export function useRoleRedirect() {
	const { user } = useUser();
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if (!user?.role) {
			return;
		}

		const pathname = location.pathname;

		const isOperatorRoute = pathname.startsWith("/operator");
		const isForemanRoute = pathname.startsWith("/foreman");
		const isMedicalTeamRoute = pathname.startsWith("/medical-team");

		if (user.role === "operator" && (isForemanRoute || isMedicalTeamRoute)) {
			navigate("/operator", { replace: true });
		}

		if (user.role === "foreman" && (isOperatorRoute || isMedicalTeamRoute)) {
			navigate("/foreman", { replace: true });
		}

		if (user.role === "medicalTeam" && (isOperatorRoute || isForemanRoute)) {
			navigate("/medical-team", { replace: true });
		}
	}, [user?.role, location.pathname, navigate]);
}
