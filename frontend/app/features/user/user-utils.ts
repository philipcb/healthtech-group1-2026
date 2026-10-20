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

export const OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER_ID = "33333333-3333-3333-3333-333333333333" as const;
export const OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE = "Aker Solutions Verdal" as const;

export const OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER: User = {
	...DEFAULT_USER,
	id: OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER_ID,
	name: "Mia Medisin",
	email: "mia.medisin@aker.com",
	role: "occupationalHealthService",
	jobDescription: "Bedriftslege",
	location: {
		...DEFAULT_USER.location,
		latitude: 63.7933,
		longitude: 11.4817,
		region: "Trøndelag",
		city: "Verdal",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
	},
};

export const OCCUPATIONAL_HYGIENIST_DEMO_USER_ID = "44444444-4444-4444-4444-444444444444" as const;

export const OCCUPATIONAL_HYGIENIST_DEMO_USER: User = {
	...DEFAULT_USER,
	id: OCCUPATIONAL_HYGIENIST_DEMO_USER_ID,
	name: "Hanne Hygiene",
	email: "hanne.hygiene@aker.com",
	role: "occupationalHygienist",
	jobDescription: "Yrkeshygieniker",
	// The same location as the foreman whose team the hygienist borrows, see `useOccupationalHygienistAreaData`
	location: {
		id: "11111111-1111-1111-1111-111111111111",
		latitude: 63.7933,
		longitude: 11.4817,
		country: "Norway",
		region: "Trøndelag",
		city: "Verdal",
		site: "Aker Solutions Verdal",
		building: "M-hallen",
	},
};

export const DEMO_FALLBACK_USERS: Partial<Record<User["role"], User>> = {
	occupationalHealthService: OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER,
	occupationalHygienist: OCCUPATIONAL_HYGIENIST_DEMO_USER,
};

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
