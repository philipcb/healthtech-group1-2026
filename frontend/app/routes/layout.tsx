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
					<header className="sticky top-0 z-40 bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:mx-5">
						<div className="mx-5 flex items-center justify-between lg:mx-0">
							<HomeLink />

							<nav className="hidden list-none items-center rounded-full lg:flex">
								<NavTabs />
							</nav>

							<div className="flex flex-row items-center gap-4">
								<NotificationBell />

								<UserDropdown />
							</div>
						</div>
					</header>

					{/*
					  position: sticky can't produce a pinned bottom bar here without moving this nav
					  after <main> inside a min-height flex column, since sticky only pins once its
					  normal flow position would otherwise sit below the target offset. This nav
					  renders before <main>, so `fixed` is the correct tool here, not a shortcut.
					  The nav itself is click-through so only the floating pill blocks taps on the page beneath.
					*/}
					<nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex list-none items-center justify-center px-[clamp(0.75rem,4vw,1.5rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
						<NavTabs variant="floating" />
					</nav>

					<main className="mx-5 mt-5 mb-[calc(6rem+env(safe-area-inset-bottom))] items-center justify-center lg:mb-5">
						<Outlet />
					</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
