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
		const isOccupationalHealthServiceRoute = pathname.startsWith("/occupational-health-service");

		if (user.role === "operator" && (isForemanRoute || isOccupationalHealthServiceRoute)) {
			navigate("/operator", { replace: true });
		}

		if (user.role === "foreman" && (isOperatorRoute || isOccupationalHealthServiceRoute)) {
			navigate("/foreman", { replace: true });
		}

		if (user.role === "occupationalHealthService" && (isOperatorRoute || isForemanRoute)) {
			navigate("/occupational-health-service", { replace: true });
		}
	}, [user?.role, location.pathname, navigate]);
}
