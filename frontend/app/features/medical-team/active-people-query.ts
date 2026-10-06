import { DEFAULT_REFETCH_INTERVAL } from "@/lib/api.ts";
import type { TZDate } from "@date-fns/tz";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { fetchActivePeople } from "./active-people-mock-data.ts";

export function activePeopleQueryOptions({
	yardId,
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
}) {
	return queryOptions({
		queryKey: ["medicalTeam", "activePeople", yardId, hall, start.getTime(), end.getTime()],
		queryFn: () => fetchActivePeople({ yardId, halls, hall, start, end }),
		staleTime: minutesToMilliseconds(10),
		refetchInterval: DEFAULT_REFETCH_INTERVAL,
		placeholderData: keepPreviousData,
		refetchIntervalInBackground: true,
	});
}
