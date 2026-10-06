// TODO: Placeholder until the backend has an endpoint for active sensors. Only returns aggregated counts, never data
// about individual people.

import { isSameMonth } from "date-fns";
import { getMockGroups } from "./medical-team-mock-groups.ts";
import type { YardScope } from "./yard-filter-parsers.ts";

export type ActiveSensorsDto = {
	/** Null when the group of people wearing the sensors is too small to show */
	activeSensors: number | null;
};

// Mirrors the small-group rule the backend is expected to apply
const MIN_GROUP_SIZE = 5;

/** Mock of the future endpoint: the number of sensors that registered at least one measurement during the period */
export function fetchActiveSensors(scope: YardScope): Promise<ActiveSensorsDto> {
	const period = isSameMonth(scope.start, scope.end) ? "month" : "year";
	const groups = getMockGroups(scope);

	const activePeople = groups.reduce((sum, group) => sum + group.activePeople[period], 0);
	const activeSensors = groups.reduce((sum, group) => sum + group.activeSensors[period], 0);

	return Promise.resolve({ activeSensors: activePeople < MIN_GROUP_SIZE ? null : activeSensors });
}
