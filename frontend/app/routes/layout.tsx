import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { HomeLink } from "@/features/layout/home-link.tsx";
import { getLinks } from "@/features/layout/nav-links.ts";
import { NavTabs } from "@/features/layout/nav-tabs.tsx";
import { NotificationBell } from "@/features/layout/notification-bell.tsx";
import { useRoleRedirect } from "@/features/layout/use-role-redirect.ts";
import { UserDropdown } from "@/features/layout/user-dropdown.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import "leaflet/dist/leaflet.css";

export default function Layout() {
	const { t } = useTranslation();
	const { user } = useUser();

	useRoleRedirect();

	const links = getLinks(t, user?.role ?? null);

	const desktopHeader = (
		<>
			<HomeLink />

			<nav className="flex list-none items-center rounded-full">
				<NavTabs routes={links} />
			</nav>
		</>
	);

	return (
		<SidebarProvider defaultOpen={false}>
			<SidebarInset>
				<div className="mx-auto w-full max-w-[90rem]">
					<header className="sticky top-0 z-40 mx-5 flex items-center justify-between bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
						{desktopHeader}

						<div className="flex flex-row items-center gap-4">
							<NotificationBell />

							<UserDropdown />
						</div>
					</header>

					<main className="m-5 items-center justify-center">
						<Outlet />
					</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
