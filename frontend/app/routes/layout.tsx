import { Button } from "@/components/ui/button.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { HomeLink } from "@/features/layout/home-link.tsx";
import { getLinks } from "@/features/layout/nav-links.ts";
import { NavTabs } from "@/features/layout/nav-tabs.tsx";
import { NotificationBell } from "@/features/layout/notification-bell.tsx";
import { ThemeSwitcher } from "@/features/layout/theme-switcher.tsx";
import { PrivacySettingsPopup } from "@/features/popups/privacy-settings-popup.tsx";
import { ProfilePopup } from "@/features/popups/profile-popup.tsx";
import { usePopup } from "@/features/popups/use-popup.ts";
import { DemoRoleSwitcher } from "@/features/user/demo-role-switcher.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { KARI_NORDMANN_ID, OLA_NORDMANN_ID } from "@/features/user/user-utils.ts";
import { type Language, useLanguagePreference } from "@/hooks/use-language-preference.ts";
import { usersQueryOptions } from "@/lib/api.ts";
import type { User } from "@/lib/dto/user.ts";
import { cn, shorthandName, userRoleToString } from "@/lib/utils.ts";
import { useQuery } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";
import { HatGlassesIcon, Languages, User as UserIcon } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

export default function Layout() {
	const { t } = useTranslation();

	const { user, setUser, isLoading: isUserLoading } = useUser();
	const { data: users } = useQuery(usersQueryOptions());

	// Sort Ola and Kari to the top, as they are the main demo users
	const priorityUserIds: Array<string> = [OLA_NORDMANN_ID, KARI_NORDMANN_ID];

	const sortedUsers = (users ?? []).toSorted((a, b) => {
		const aPriority = priorityUserIds.indexOf(a.id);
		const bPriority = priorityUserIds.indexOf(b.id);

		if (aPriority === bPriority) {
			return a.name.localeCompare(b.name);
		}

		if (aPriority === -1) {
			return 1;
		}

		if (bPriority === -1) {
			return -1;
		}

		return aPriority - bPriority;
	});

	const links = getLinks(t, user?.role ?? null);

	const location = useLocation();
	const navigate = useNavigate();
	// Redirect users to the appropriate base route if they try to access a route that doesn't match their role
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

							<UserDropdown user={user} users={sortedUsers} setUser={setUser} />
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

function UserDropdown({
	user,
	users,
	setUser,
}: {
	user: User | null;
	users: Array<User>;
	setUser: (user: User) => void;
}) {
	const { t } = useTranslation();
	const { language, setLanguage } = useLanguagePreference();

	const { visible: profilePopupVisible, openPopup: openProfilePopup, closePopup: closeProfilePopup } = usePopup();

	const {
		visible: privacySettingsPopupVisible,
		openPopup: openPrivacySettingsPopup,
		closePopup: closePrivacySettingsPopup,
	} = usePopup();

	if (!user) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild={true}>
					<Button variant="ghost" className="h-11 max-w-[14rem] cursor-pointer gap-2 rounded-full pr-3 pl-1">
						<div className="flex size-9 items-center justify-center rounded-full bg-primary">
							<UserIcon className="size-5 text-primary-foreground" />
						</div>
						<div className="min-w-0 grow text-left leading-tight">
							<p className="truncate font-medium">{shorthandName(user.name)}</p>
							<p className="truncate text-foreground/60 text-xs">{user.location.site}</p>
						</div>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" sideOffset={10}>
					<DropdownMenuItem onSelect={openProfilePopup}>
						<UserIcon className="size-4" />
						<span>{t(($) => $.profile.title)}</span>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem onSelect={openPrivacySettingsPopup}>
						<HatGlassesIcon className="size-4" />
						<span>{t(($) => $.profile.privacySettings)}</span>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<ThemeSwitcher />

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Languages className="mr-2 size-4 text-muted-foreground" />
							<span>{t(($) => $.layout.language)}</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								value={language}
								onValueChange={(value) => setLanguage(value as Language)}
							>
								<DropdownMenuRadioItem value="en">{t(($) => $.language.english)}</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="no">
									{t(($) => $.language.norwegian)}
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DemoRoleSwitcher users={users} activeRole={user.role} onSelect={setUser} className="m-1 mt-4">
						{user.role && (
							<p className="my-2 text-sm text-zinc-600 dark:text-zinc-300">
								{t(($) => $.demo.currentRole)}{" "}
								<span className="font-semibold">{userRoleToString(user.role, t)}</span>
							</p>
						)}

						<Button
							type="button"
							className={cn(
								"mt-2 w-full text-sm text-zinc-600 dark:text-zinc-300",
								"bg-amber-200 hover:bg-amber-300 dark:bg-amber-900/75 dark:hover:bg-amber-800",
							)}
							asChild={true}
						>
							<Link to="/register">{t(($) => $.demo.navigate.toRegister)}</Link>
						</Button>
					</DemoRoleSwitcher>
				</DropdownMenuContent>
			</DropdownMenu>

			<ProfilePopup
				user={user}
				open={profilePopupVisible}
				onClose={closeProfilePopup}
				users={users}
				setUser={setUser}
			/>

			<PrivacySettingsPopup open={privacySettingsPopupVisible} onClose={closePrivacySettingsPopup} />
		</>
	);
}
