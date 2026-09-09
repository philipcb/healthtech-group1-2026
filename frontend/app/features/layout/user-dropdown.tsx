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
import { ThemeSwitcher } from "@/features/layout/theme-switcher.tsx";
import { useSortedDemoUsers } from "@/features/layout/use-sorted-demo-users.ts";
import { PrivacySettingsPopup } from "@/features/popups/privacy-settings-popup.tsx";
import { ProfilePopup } from "@/features/popups/profile-popup.tsx";
import { usePopup } from "@/features/popups/use-popup.ts";
import { DemoRoleSwitcher } from "@/features/user/demo-role-switcher.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { type Language, useLanguagePreference } from "@/hooks/use-language-preference.ts";
import { cn, shorthandName, userRoleToString } from "@/lib/utils.ts";
import { HatGlassesIcon, Languages, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function UserDropdown() {
	const { t } = useTranslation();
	const { user, setUser } = useUser();
	const { language, setLanguage } = useLanguagePreference();
	const users = useSortedDemoUsers();

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

			<ProfilePopup user={user} open={profilePopupVisible} onClose={closeProfilePopup} />

			<PrivacySettingsPopup open={privacySettingsPopupVisible} onClose={closePrivacySettingsPopup} />
		</>
	);
}
