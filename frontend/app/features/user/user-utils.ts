import type { User } from "@/features/user/user.ts";
import { now } from "@/lib/date.ts";

export const USER_STORAGE_KEY = "demo_user_id" as const;

export const OLA_NORDMANN_ID = "12345678-1234-5678-1234-567812345678" as const;
export const KARI_NORDMANN_ID = "87654321-8765-4321-8765-432187654321" as const;

export const DEFAULT_USER: User = {
	id: KARI_NORDMANN_ID,
	name: "Kari Nordmann",
	email: "kari.nordmann@aker.com",
	role: "operator",
	jobDescription: "Sveiser",
	createdAt: now(),
	location: {
		id: "22222222-2222-2222-2222-222222222222",
		latitude: 60.29278334510331,
		longitude: 5.279473042646057,
		country: "Norway",
		region: "Bergen",
		city: "Bergen",
		site: "Aker Solutions Sandsli",
		building: "Bygg 1",
	},
};

/**
 * Demo users that only existed in the frontend, before the backend had users with these roles. A stored one is
 * dropped, since the backend doesn't know it.
 */
export const REMOVED_DEMO_USER_IDS: ReadonlyArray<string> = [
	"33333333-3333-3333-3333-333333333333",
	"44444444-4444-4444-4444-444444444444",
];

export function getStoredUser(): User {
	try {
		const stored = localStorage.getItem(USER_STORAGE_KEY);

		if (stored) {
			return JSON.parse(stored) as User;
		}
	} catch (error) {
		console.error("Failed to parse user from local storage", error);
	}

	return DEFAULT_USER;
}

export const createLocationName = (location: User["location"]) =>
	location.building ? `${location.building}, ${location.site}` : location.site;
