import { DEFAULT_REFETCH_INTERVAL } from "@/lib/api.ts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { fetchActivePeople } from "./active-people-mock-data.ts";
import type { YardScope } from "./yard-filter-parsers.ts";

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
