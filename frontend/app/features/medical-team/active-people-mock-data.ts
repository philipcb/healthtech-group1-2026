// TODO: Placeholder until the backend has an endpoint for active people. Only returns an aggregated count, never data
// about individual people.

import { isSameMonth } from "date-fns";
import { getMockGroups } from "./medical-team-mock-groups.ts";
import type { YardScope } from "./yard-filter-parsers.ts";

export type ActivePeopleDto = {
	/** Null when the group is too small to show */
	activePeople: number | null;
};

// Mirrors the small-group rule the backend is expected to apply
const MIN_GROUP_SIZE = 5;

/**
 * Mock of the future endpoint: the number of unique people who registered at least one measurement during the period.
 * The entire yard is the sum of its halls.
 */
export function fetchActivePeople(scope: YardScope): Promise<ActivePeopleDto> {
	const period = isSameMonth(scope.start, scope.end) ? "month" : "year";

	const activePeople = getMockGroups(scope).reduce((sum, group) => sum + group.activePeople[period], 0);

	return Promise.resolve({ activePeople: activePeople < MIN_GROUP_SIZE ? null : activePeople });
}
