import { useUser } from "@/features/user/user-context.tsx";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

export function useRoleRedirect() {
	const { user, isLoading: isUserLoading } = useUser();
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if (!user?.role || isUserLoading) {
			return;
		}

		const pathname = location.pathname;

		const isOperatorRoute = pathname.startsWith("/operator");
		const isForemanRoute = pathname.startsWith("/foreman");

		if (user.role === "operator" && isForemanRoute) {
			navigate("/operator", { replace: true });
		}

		if (user.role === "foreman" && isOperatorRoute) {
			navigate("/foreman", { replace: true });
		}
	}, [user?.role, location.pathname, navigate, isUserLoading]);
}
