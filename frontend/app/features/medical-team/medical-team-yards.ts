import { MEDICAL_TEAM_DEMO_USER_ID } from "@/features/user/user-utils.ts";

export type Yard = { id: string; name: string; halls: Array<string>; occupations: Array<string> };

const yards = {
	verdal: {
		id: "verdal",
		name: "Verdal",
		halls: ["M-hallen", "Hall 2", "Hall 3"],
		// TODO: Example occupations until the backend provides the list for a yard
		occupations: ["Welder", "Technician", "Electrician", "Fitter"],
	},
} satisfies Record<string, Yard>;

const yardIdByUserId: Record<string, keyof typeof yards> = {
	[MEDICAL_TEAM_DEMO_USER_ID]: "verdal",
};

/** A medical team user only has access to the yard they belong to */
export function getYardForUser(userId: string): Yard | null {
	const yardId = yardIdByUserId[userId];

	return yardId ? yards[yardId] : null;
}
