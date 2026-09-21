import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { HomeLink } from "@/features/layout/home-link.tsx";
import { NavTabs } from "@/features/layout/nav-tabs.tsx";
import { NotificationBell } from "@/features/layout/notification-bell.tsx";
import { useRoleRedirect } from "@/features/layout/use-role-redirect.ts";
import { UserDropdown } from "@/features/layout/user-dropdown.tsx";
import { Outlet } from "react-router";
import "leaflet/dist/leaflet.css";

export default function Layout() {
	useRoleRedirect();

	return (
		<SidebarProvider defaultOpen={false}>
			<SidebarInset>
				<div className="mx-auto w-full max-w-[90rem]">
					<header className="sticky top-0 z-40 mx-5 flex items-center justify-between bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
						<HomeLink />

						<nav className="hidden list-none items-center rounded-full md:flex">
							<NavTabs />
						</nav>

						<div className="flex flex-row items-center gap-4">
							<NotificationBell />

							<UserDropdown />
						</div>
					</header>

					{/*
					  position: sticky can't produce a pinned bottom bar here without moving this nav
					  after <main> inside a min-height flex column, since sticky only pins once its
					  normal flow position would otherwise sit below the target offset. This nav
					  renders before <main>, so `fixed` is the correct tool here, not a shortcut.
					*/}
					<nav className="fixed inset-x-0 bottom-0 z-40 flex list-none items-center justify-center border-t bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
						<NavTabs />
					</nav>

					<main className="mx-5 mt-5 mb-24 items-center justify-center md:mb-5">
						<Outlet />
					</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
