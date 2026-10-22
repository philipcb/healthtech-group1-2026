import { toFrontendUser, type User } from "@/features/user/user.ts";
import { KARI_NORDMANN_ID, OLA_NORDMANN_ID } from "@/features/user/user-utils.ts";
import { useGetUsers } from "@/lib/api/generated/user.ts";

const priorityUserIds: Array<string> = [OLA_NORDMANN_ID, KARI_NORDMANN_ID];

export function useSortedDemoUsers(): Array<User> {
	const { data: users } = useGetUsers();

	return (users ?? []).map(toFrontendUser).toSorted((a, b) => {
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
}
