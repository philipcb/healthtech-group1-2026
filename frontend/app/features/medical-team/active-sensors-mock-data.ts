// TODO: Placeholder until the backend has an endpoint for active sensors. Only returns aggregated counts, never data
// about individual people.

import type { TZDate } from "@date-fns/tz";
import { isSameMonth } from "date-fns";
import seedrandom from "seedrandom";

export type ActiveSensorsDto = { activeSensors: number };

const sensorsInUseByHall: Record<string, number> = {
	"M-hallen": 42,
	"Hall 2": 36,
	"Hall 3": 18,
};

/**
 * Mock of the future endpoint: the number of sensors that registered at least one measurement during the period.
 * The same yard, hall and period always gives the same number.
 */
export function fetchActiveSensors({
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
}): Promise<ActiveSensorsDto> {
	const hallsInScope = hall ? [hall] : halls;
	// Every sensor in use reports at some point during a year, so only a single month can miss some of them. This keeps
	// the yearly count from ever being lower than the count for a month in that year.
	const isSingleMonth = isSameMonth(start, end);

	const activeSensors = hallsInScope.reduce((sum, h) => {
		const random = seedrandom(`${yardId}|${h}|${start.getTime()}|${end.getTime()}`);
		const sensorsInUse = sensorsInUseByHall[h] ?? 0;

		const inactiveSensors = isSingleMonth ? Math.floor(random() * 4) : 0;

		return sum + Math.max(0, sensorsInUse - inactiveSensors);
	}, 0);

	return Promise.resolve({ activeSensors });
}
