import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { type User, UserRoleSchema } from "@/lib/dto/user.ts";
import { cn, userRoleToString } from "@/lib/utils.ts";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type DemoRoleSwitcherProps = {
	users: Array<User> | undefined;
	onSelect: (user: User) => void;
	activeRole?: User["role"] | null;
	size?: ComponentProps<typeof Button>["size"];
	className?: string;
	children?: ReactNode;
};

export const DemoRoleSwitcher = ({ users, onSelect, activeRole, size, className, children }: DemoRoleSwitcherProps) => {
	const { t } = useTranslation();

	return (
		<div className={cn("rounded-lg bg-yellow-100 p-2 dark:bg-amber-950", className)}>
			<h3 className="font-semibold text-sm text-zinc-600 dark:text-zinc-300">{"DEMO"}</h3>

			<div className="mt-2 flex gap-2.5">
				{users && users.length > 0 ? (
					Object.keys(UserRoleSchema.enum).map((role) => {
						const roleValue = role as User["role"];
						const isActive = activeRole === roleValue;

						return (
							<Button
								key={role}
								type="button"
								size={size}
								className={cn(
									"flex-1 text-sm text-zinc-600 dark:text-zinc-300",
									"bg-amber-200 hover:bg-amber-300 dark:bg-amber-900/75 dark:hover:bg-amber-800",
									isActive && "bg-amber-300 dark:bg-amber-800",
								)}
								onClick={() => {
									const userWithRole = users.find((u) => u.role === roleValue);
									if (userWithRole) {
										onSelect(userWithRole);
									}
								}}
							>
								{userRoleToString(roleValue, t)}
							</Button>
						);
					})
				) : (
					<Skeleton className="h-6 w-36 bg-amber-200 dark:bg-amber-900/75" />
				)}
			</div>

			{children}
		</div>
	);
};
