// TODO: Placeholder until the backend has an endpoint for active people. Only returns an aggregated count, never data
// about individual people.

import type { TZDate } from "@date-fns/tz";
import { isSameMonth } from "date-fns";

export type ActivePeopleDto = {
	/** Null when the group is too small to show */
	activePeople: number | null;
};

// Mirrors the small-group rule the backend is expected to apply
const MIN_GROUP_SIZE = 5;

// Matches the shift exceedance mock: everyone in a hall has noise measurements, so the number of people with noise
// measurements is also the number of active people
const activePeopleByHall: Record<string, Record<"month" | "year", number>> = {
	"M-hallen": { month: 30, year: 34 },
	"Hall 2": { month: 24, year: 27 },
	"Hall 3": { month: 12, year: 14 },
};

/**
 * Mock of the future endpoint: the number of unique people who registered at least one measurement during the period.
 * The entire yard is the sum of its halls.
 */
export function fetchActivePeople({
	halls,
	hall,
	start,
	end,
}: {
	yardId: string;
	halls: Array<string>;
	hall: string | null;
	start: TZDate;
	end: TZDate;
}): Promise<ActivePeopleDto> {
	const hallsInScope = hall ? [hall] : halls;
	const period = isSameMonth(start, end) ? "month" : "year";

	const activePeople = hallsInScope.reduce((sum, h) => sum + (activePeopleByHall[h]?.[period] ?? 0), 0);

	return Promise.resolve({ activePeople: activePeople < MIN_GROUP_SIZE ? null : activePeople });
}
