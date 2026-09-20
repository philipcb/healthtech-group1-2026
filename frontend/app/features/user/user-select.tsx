import { Button } from "@/components/ui/button.tsx";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox.tsx";
import { getUserComboboxLabel, type UserComboboxUser } from "@/features/user/user-combobox-label.ts";
import { cn } from "@/lib/utils.ts";
import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export type UserSelectUser = UserComboboxUser;

interface UserSelectProps {
	users: Array<UserSelectUser>;
	value: string | null;
	onValueChange: (value: string | null) => void;
	placeholder: string;
	inputClassName?: string;
	contentClassName?: string;
	itemClassName?: string;
}

export function UserSelect({
	users,
	value,
	onValueChange,
	placeholder,
	inputClassName,
	contentClassName,
	itemClassName,
}: UserSelectProps) {
	const { t } = useTranslation();

	const disabled = !users || users.length === 0;

	const selectedUser = users.find((user) => user.id === value) ?? null;

	return (
		<div className="flex gap-1">
			<Combobox
				items={users}
				disabled={disabled}
				value={selectedUser ?? undefined}
				onValueChange={(nextUser: UserSelectUser | null) => onValueChange(nextUser?.id ?? null)}
				itemToStringValue={(user: UserSelectUser) => user.id}
				itemToStringLabel={getUserComboboxLabel}
			>
				<ComboboxInput
					placeholder={placeholder}
					disabled={disabled}
					className={cn(
						"w-full rounded-r-md rounded-l-xl bg-background font-medium dark:bg-input/30",
						inputClassName,
					)}
				/>
				<ComboboxContent className={cn("rounded-xl", contentClassName)}>
					<ComboboxList>
						{(user: UserSelectUser) => (
							<ComboboxItem key={user.id} value={user} className={cn("rounded-lg", itemClassName)}>
								{user.name}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>

			<Button
				aria-label={t(($) => $.foremanDashboard.overview.clearUserSelection)}
				variant="outline"
				size="icon"
				onClick={() => onValueChange(null)}
				disabled={disabled || value === null}
				className="rounded-r-xl"
			>
				<XIcon className="size-4" aria-hidden="true" />
			</Button>
		</div>
	);
}
