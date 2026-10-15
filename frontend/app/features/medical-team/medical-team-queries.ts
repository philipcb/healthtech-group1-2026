import { DEFAULT_REFETCH_INTERVAL } from "@/lib/api.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { fetchActivePeople, fetchActiveSensors } from "./medical-team-mock-data.ts";
import { fetchShiftExceedance } from "./shift-exceedance-mock-data.ts";
import type { YardScope } from "./yard-filter-parsers.ts";

export type ActiveSensorsDto = {
	/** Null when the group of people wearing the sensors is too small to show */
	activeSensors: number | null;
};

export type ActivePeopleDto = {
	/** Null when the group is too small to show */
	activePeople: number | null;
};

export type ShiftExceedanceDto = {
	exposure: Exposure;
	peopleCount: number;
	shifts: Record<DangerLevel, number>;
	/** People with at least 1 and at least `n` shifts at or above the action value. Null when the group is too small. */
	peopleAboveAction: { atLeastOnce: number; atLeastN: number; n: number } | null;
};

export function activeSensorsQueryOptions(scope: YardScope) {
	const { yardId, hall, occupation, start, end } = scope;

	return queryOptions({
		queryKey: ["medicalTeam", "activeSensors", yardId, hall, occupation, start.getTime(), end.getTime()],
		queryFn: () => fetchActiveSensors(scope),
		staleTime: minutesToMilliseconds(10),
		refetchInterval: DEFAULT_REFETCH_INTERVAL,
		placeholderData: keepPreviousData,
		refetchIntervalInBackground: true,
	});
}

export function activePeopleQueryOptions(scope: YardScope) {
	const { yardId, hall, occupation, start, end } = scope;

	return queryOptions({
		queryKey: ["medicalTeam", "activePeople", yardId, hall, occupation, start.getTime(), end.getTime()],
		queryFn: () => fetchActivePeople(scope),
		staleTime: minutesToMilliseconds(10),
		refetchInterval: DEFAULT_REFETCH_INTERVAL,
		placeholderData: keepPreviousData,
		refetchIntervalInBackground: true,
	});
}

export function shiftExceedanceQueryOptions(scope: YardScope) {
	const { yardId, hall, occupation, start, end } = scope;

	return queryOptions({
		queryKey: ["medicalTeam", "shiftExceedance", yardId, hall, occupation, start.getTime(), end.getTime()],
		queryFn: () => fetchShiftExceedance(scope),
		staleTime: minutesToMilliseconds(10),
		refetchInterval: DEFAULT_REFETCH_INTERVAL,
		placeholderData: keepPreviousData,
		refetchIntervalInBackground: true,
	});
}
