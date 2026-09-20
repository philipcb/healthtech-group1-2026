export type UserComboboxUser = { id: string; name: string };

export function getUserComboboxLabel(user: UserComboboxUser): string {
	return user.name;
}
