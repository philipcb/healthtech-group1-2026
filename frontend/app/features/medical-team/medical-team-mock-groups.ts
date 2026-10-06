// TODO: Placeholder until the backend has aggregate endpoints for the medical team. The occupations are examples, not
// final values. Hall and occupation are independent, so the same occupation can work in several halls.

import type { YardScope } from "./yard-filter-parsers.ts";

type MockGroup = {
	hall: string;
	occupation: string;
	/** Everyone in the mock has noise measurements, so this matches the noise people in the shift exceedance mock */
	activePeople: Record<"month" | "year", number>;
	activeSensors: Record<"month" | "year", number>;
};

const mockGroups: Array<MockGroup> = [
	{
		hall: "M-hallen",
		occupation: "Welder",
		activePeople: { month: 10, year: 11 },
		activeSensors: { month: 13, year: 14 },
	},
	{
		hall: "M-hallen",
		occupation: "Technician",
		activePeople: { month: 8, year: 9 },
		activeSensors: { month: 11, year: 11 },
	},
	{
		hall: "M-hallen",
		occupation: "Electrician",
		activePeople: { month: 4, year: 5 },
		activeSensors: { month: 5, year: 6 },
	},
	{
		hall: "M-hallen",
		occupation: "Fitter",
		activePeople: { month: 8, year: 9 },
		activeSensors: { month: 11, year: 11 },
	},
	{
		hall: "Hall 2",
		occupation: "Welder",
		activePeople: { month: 9, year: 10 },
		activeSensors: { month: 14, year: 14 },
	},
	{
		hall: "Hall 2",
		occupation: "Technician",
		activePeople: { month: 9, year: 10 },
		activeSensors: { month: 13, year: 13 },
	},
	{
		hall: "Hall 2",
		occupation: "Fitter",
		activePeople: { month: 6, year: 7 },
		activeSensors: { month: 9, year: 9 },
	},
	{
		hall: "Hall 3",
		occupation: "Technician",
		activePeople: { month: 9, year: 10 },
		activeSensors: { month: 13, year: 13 },
	},
	{
		hall: "Hall 3",
		occupation: "Electrician",
		activePeople: { month: 3, year: 4 },
		activeSensors: { month: 5, year: 5 },
	},
];

/** Does a mock row belong to the selected hall and occupation? */
export function isInScope(row: { hall: string; occupation: string }, { hall, occupation }: YardScope): boolean {
	return (hall === null || row.hall === hall) && (occupation === null || row.occupation === occupation);
}

export function getMockGroups(scope: YardScope): Array<MockGroup> {
	return mockGroups.filter((group) => isInScope(group, scope));
}
