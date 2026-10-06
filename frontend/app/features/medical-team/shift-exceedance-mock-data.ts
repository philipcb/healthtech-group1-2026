// TODO: Placeholder until the backend has an aggregate endpoint for shift exceedances. Only returns aggregated counts
// per exposure, never data about individual people.

import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import { isSameMonth } from "date-fns";
import seedrandom from "seedrandom";

export type ShiftExceedanceDto = {
	exposure: Exposure;
	peopleCount: number;
	shifts: Record<DangerLevel, number>;
};

const peopleByHall: Record<string, number> = {
	"M-hallen": 30,
	"Hall 2": 24,
	"Hall 3": 12,
};

/** Not everyone wears every sensor, so vibration is measured for far fewer people than noise */
const sensorCoverage: Record<Exposure, number> = {
	dust: 0.9,
	noise: 1,
	vibration: 0.4,
};

/** Typical share of shifts over the action value (warning) and the limit value (danger) for each exposure */
const exceedanceRates: Record<Exposure, { warning: number; danger: number }> = {
	dust: { warning: 0.1, danger: 0.02 },
	noise: { warning: 0.24, danger: 0.09 },
	vibration: { warning: 0.15, danger: 0.05 },
};

/** Some halls are noisier and dustier than others */
const hallExposureFactor: Record<string, number> = {
	"M-hallen": 1.2,
	"Hall 2": 1,
	"Hall 3": 0.7,
};

const SHIFTS_PER_PERSON_PER_MONTH = 18;
const SHIFTS_PER_PERSON_PER_YEAR = 200;

/**
 * Mock of the future endpoint: the number of measured shifts in each danger level for each exposure during the period.
 * The same yard, hall and period always gives the same numbers.
 */
export function fetchShiftExceedance({
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
}): Promise<Array<ShiftExceedanceDto>> {
	const hallsInScope = hall ? [hall] : halls;
	const shiftsPerPerson = isSameMonth(start, end) ? SHIFTS_PER_PERSON_PER_MONTH : SHIFTS_PER_PERSON_PER_YEAR;

	const exposures = Object.keys(exceedanceRates) as Array<Exposure>;

	const result = exposures.map((exposure) =>
		hallsInScope.reduce<ShiftExceedanceDto>(
			(sum, h) => {
				const random = seedrandom(`${yardId}|${h}|${exposure}|${start.getTime()}|${end.getTime()}`);
				const people = Math.floor((peopleByHall[h] ?? 0) * sensorCoverage[exposure]);
				const attendance = 0.85 + random() * 0.1;
				const total = Math.round(people * shiftsPerPerson * attendance);

				const factor = (hallExposureFactor[h] ?? 1) * (0.8 + random() * 0.4);
				const danger = Math.round(total * exceedanceRates[exposure].danger * factor);
				const warning = Math.round(total * exceedanceRates[exposure].warning * factor);

				return {
					exposure,
					peopleCount: sum.peopleCount + people,
					shifts: {
						safe: sum.shifts.safe + total - warning - danger,
						warning: sum.shifts.warning + warning,
						danger: sum.shifts.danger + danger,
					},
				};
			},
			{ exposure, peopleCount: 0, shifts: { safe: 0, warning: 0, danger: 0 } },
		),
	);

	return Promise.resolve(result);
}
