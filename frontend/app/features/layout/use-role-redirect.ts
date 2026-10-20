import type { User } from "@/features/user/user.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

/** Each role's own pages, which every other role is sent away from */
const homeByRole: Record<User["role"], string> = {
	operator: "/operator",
	foreman: "/foreman",
	occupationalHealthService: "/occupational-health-service",
	management: "/management",
};

export function useRoleRedirect() {
	const { user } = useUser();
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if (!user?.role) {
			return;
		}

		const pathname = location.pathname;
		const isOtherRolesRoute = Object.entries(homeByRole).some(
			([role, home]) => role !== user.role && pathname.startsWith(home),
		);

		if (isOtherRolesRoute) {
			navigate(homeByRole[user.role], { replace: true });
		}
	}, [user?.role, location.pathname, navigate]);
}
