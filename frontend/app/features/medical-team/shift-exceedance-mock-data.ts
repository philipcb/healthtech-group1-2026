// TODO: Placeholder until the backend has an aggregate endpoint for shift exceedances. Only returns aggregated counts
// per exposure, never data about individual people.

import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import { isSameMonth } from "date-fns";

export type ShiftExceedanceDto = {
	exposure: Exposure;
	peopleCount: number;
	shifts: Record<DangerLevel, number>;
	/** People with at least 1 and at least `n` shifts at or above the action value. Null when the group is too small. */
	peopleAboveAction: { atLeastOnce: number; atLeastN: number; n: number } | null;
};

// TODO: Placeholder, how many exceedances count as "repeated" is a medical decision that hasn't been made yet
const REPEATED_EXCEEDANCE_THRESHOLD = 3;

// Mirrors the small-group rule the backend is expected to apply
const MIN_GROUP_SIZE = 5;

type HallExposureMock = {
	peopleCount: number;
	shifts: Record<DangerLevel, number>;
	peopleAboveAction: { atLeastOnce: number; atLeastN: number };
};

const mockByHall: Record<string, Record<Exposure, Record<"month" | "year", HallExposureMock>>> = {
	"M-hallen": {
		dust: {
			month: {
				peopleCount: 27,
				shifts: { safe: 375, warning: 59, danger: 12 },
				peopleAboveAction: { atLeastOnce: 9, atLeastN: 5 },
			},
			year: {
				peopleCount: 27,
				shifts: { safe: 4061, warning: 498, danger: 100 },
				peopleAboveAction: { atLeastOnce: 12, atLeastN: 9 },
			},
		},
		noise: {
			month: {
				peopleCount: 30,
				shifts: { safe: 338, warning: 120, danger: 45 },
				peopleAboveAction: { atLeastOnce: 21, atLeastN: 13 },
			},
			year: {
				peopleCount: 30,
				shifts: { safe: 3420, warning: 1597, danger: 599 },
				peopleAboveAction: { atLeastOnce: 28, atLeastN: 23 },
			},
		},
		vibration: {
			month: {
				peopleCount: 12,
				shifts: { safe: 141, warning: 38, danger: 13 },
				peopleAboveAction: { atLeastOnce: 5, atLeastN: 2 },
			},
			year: {
				peopleCount: 12,
				shifts: { safe: 1722, warning: 411, danger: 137 },
				peopleAboveAction: { atLeastOnce: 7, atLeastN: 4 },
			},
		},
	},
	"Hall 2": {
		dust: {
			month: {
				peopleCount: 21,
				shifts: { safe: 286, warning: 36, danger: 7 },
				peopleAboveAction: { atLeastOnce: 7, atLeastN: 4 },
			},
			year: {
				peopleCount: 21,
				shifts: { safe: 3191, warning: 439, danger: 88 },
				peopleAboveAction: { atLeastOnce: 8, atLeastN: 7 },
			},
		},
		noise: {
			month: {
				peopleCount: 24,
				shifts: { safe: 274, warning: 93, danger: 35 },
				peopleAboveAction: { atLeastOnce: 18, atLeastN: 12 },
			},
			year: {
				peopleCount: 24,
				shifts: { safe: 2601, warning: 1114, danger: 418 },
				peopleAboveAction: { atLeastOnce: 24, atLeastN: 21 },
			},
		},
		vibration: {
			month: {
				peopleCount: 9,
				shifts: { safe: 127, warning: 18, danger: 6 },
				peopleAboveAction: { atLeastOnce: 3, atLeastN: 2 },
			},
			year: {
				peopleCount: 9,
				shifts: { safe: 1368, warning: 235, danger: 78 },
				peopleAboveAction: { atLeastOnce: 4, atLeastN: 3 },
			},
		},
	},
	"Hall 3": {
		dust: {
			month: {
				peopleCount: 10,
				shifts: { safe: 144, warning: 10, danger: 2 },
				peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
			},
			year: {
				peopleCount: 10,
				shifts: { safe: 1631, warning: 114, danger: 23 },
				peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
			},
		},
		noise: {
			month: {
				peopleCount: 12,
				shifts: { safe: 134, warning: 37, danger: 14 },
				peopleAboveAction: { atLeastOnce: 6, atLeastN: 4 },
			},
			year: {
				peopleCount: 12,
				shifts: { safe: 1601, warning: 416, danger: 156 },
				peopleAboveAction: { atLeastOnce: 7, atLeastN: 6 },
			},
		},
		vibration: {
			month: {
				peopleCount: 4,
				shifts: { safe: 58, warning: 6, danger: 2 },
				peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
			},
			year: {
				peopleCount: 4,
				shifts: { safe: 637, warning: 85, danger: 28 },
				peopleAboveAction: { atLeastOnce: 3, atLeastN: 2 },
			},
		},
	},
};

/** Mock of the future endpoint. Every month uses the same values, and the entire yard is the sum of its halls. */
export function fetchShiftExceedance({
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
	const period = isSameMonth(start, end) ? "month" : "year";

	const rows = exposures.map((exposure): ShiftExceedanceDto => {
		const hallMocks = hallsInScope.flatMap((h) => mockByHall[h]?.[exposure][period] ?? []);
		const peopleCount = hallMocks.reduce((sum, mock) => sum + mock.peopleCount, 0);

		return {
			exposure,
			peopleCount,
			shifts: {
				safe: hallMocks.reduce((sum, mock) => sum + mock.shifts.safe, 0),
				warning: hallMocks.reduce((sum, mock) => sum + mock.shifts.warning, 0),
				danger: hallMocks.reduce((sum, mock) => sum + mock.shifts.danger, 0),
			},
			peopleAboveAction:
				peopleCount < MIN_GROUP_SIZE
					? null
					: {
							atLeastOnce: hallMocks.reduce((sum, mock) => sum + mock.peopleAboveAction.atLeastOnce, 0),
							atLeastN: hallMocks.reduce((sum, mock) => sum + mock.peopleAboveAction.atLeastN, 0),
							n: REPEATED_EXCEEDANCE_THRESHOLD,
						},
		};
	});

	return Promise.resolve(rows);
}
