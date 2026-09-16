import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
} from "@/components/ui/combobox.tsx";
import { getUserComboboxLabel } from "@/features/user/user-combobox-label.ts";
import type { User } from "@/lib/dto/user.ts";
import type { ComboboxRootProps } from "@base-ui/react";

type UserSearchProps<Multiple extends boolean = false> = Exclude<ComboboxRootProps<User, Multiple>, "placeholder"> & {
	users: Array<User>;
	placeholder: string;
	emptyLabel: string;
};

export const UserSearch = <Multiple extends boolean = false>({
	users,
	placeholder,
	emptyLabel,
	...props
}: UserSearchProps<Multiple>) => {
	return (
		<Combobox
			{...props}
			items={users}
			// God knows why I have to explicitly type this one but not the other
			itemToStringValue={(user: User) => user.id}
			itemToStringLabel={getUserComboboxLabel}
		>
			{props.multiple && props.value && Array.isArray(props.value) ? (
				<div className="flex flex-col gap-2">
					<ComboboxInput className="w-73" placeholder={placeholder} showTrigger={false} />
					<ComboboxChips className="min-h-0 w-73 border-0 bg-transparent p-0 shadow-none focus-within:border-transparent focus-within:ring-0 has-data-[slot=combobox-chip]:px-0 **:data-[slot=combobox-chip-remove]:ml-0 **:data-[slot=combobox-chip-remove]:size-4 dark:bg-transparent">
						<ComboboxValue>
							{props.value.map((item) => (
								<ComboboxChip key={item.id}>{item.name}</ComboboxChip>
							))}
						</ComboboxValue>
					</ComboboxChips>
				</div>
			) : (
				<ComboboxInput placeholder={placeholder} />
			)}
			<ComboboxContent>
				<ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
				<ComboboxList>
					{(user: User) => (
						<ComboboxItem key={user.id} value={user}>
							{user.name}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
};
