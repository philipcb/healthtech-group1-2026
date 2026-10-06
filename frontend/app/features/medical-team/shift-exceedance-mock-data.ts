// TODO: Placeholder until the backend has an aggregate endpoint for shift exceedances. Only returns aggregated counts
// per exposure, never data about individual people. The occupations are examples, not final values.

import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { isSameMonth } from "date-fns";
import { isInScope } from "./medical-team-mock-groups.ts";
import type { YardScope } from "./yard-filter-parsers.ts";

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

type ExposureMock = {
	peopleCount: number;
	shifts: Record<DangerLevel, number>;
	peopleAboveAction: { atLeastOnce: number; atLeastN: number };
};

type GroupMock = {
	hall: string;
	occupation: string;
	/** A missing exposure means nobody in the group was measured for it */
	exposures: Partial<Record<Exposure, Record<"month" | "year", ExposureMock>>>;
};

const mockGroups: Array<GroupMock> = [
	{
		hall: "M-hallen",
		occupation: "Welder",
		exposures: {
			dust: {
				month: {
					peopleCount: 10,
					shifts: { safe: 113, warning: 42, danger: 10 },
					peopleAboveAction: { atLeastOnce: 5, atLeastN: 4 },
				},
				year: {
					peopleCount: 10,
					shifts: { safe: 1289, warning: 354, danger: 83 },
					peopleAboveAction: { atLeastOnce: 7, atLeastN: 7 },
				},
			},
			noise: {
				month: {
					peopleCount: 10,
					shifts: { safe: 96, warning: 52, danger: 20 },
					peopleAboveAction: { atLeastOnce: 9, atLeastN: 6 },
				},
				year: {
					peopleCount: 11,
					shifts: { safe: 872, warning: 679, danger: 266 },
					peopleAboveAction: { atLeastOnce: 11, atLeastN: 11 },
				},
			},
			vibration: {
				month: {
					peopleCount: 3,
					shifts: { safe: 39, warning: 7, danger: 2 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 3,
					shifts: { safe: 473, warning: 75, danger: 20 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
			},
		},
	},
	{
		hall: "M-hallen",
		occupation: "Technician",
		exposures: {
			dust: {
				month: {
					peopleCount: 6,
					shifts: { safe: 95, warning: 4, danger: 0 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 6,
					shifts: { safe: 997, warning: 35, danger: 3 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
			},
			noise: {
				month: {
					peopleCount: 8,
					shifts: { safe: 113, warning: 17, danger: 4 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
				year: {
					peopleCount: 9,
					shifts: { safe: 1217, warning: 222, danger: 48 },
					peopleAboveAction: { atLeastOnce: 5, atLeastN: 2 },
				},
			},
			vibration: {
				month: {
					peopleCount: 2,
					shifts: { safe: 30, warning: 2, danger: 0 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 2,
					shifts: { safe: 356, warning: 20, danger: 2 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
			},
		},
	},
	{
		hall: "M-hallen",
		occupation: "Electrician",
		exposures: {
			dust: {
				month: {
					peopleCount: 3,
					shifts: { safe: 48, warning: 2, danger: 0 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 3,
					shifts: { safe: 503, warning: 14, danger: 1 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
			},
			noise: {
				month: {
					peopleCount: 4,
					shifts: { safe: 59, warning: 7, danger: 1 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 0 },
				},
				year: {
					peopleCount: 5,
					shifts: { safe: 703, warning: 103, danger: 20 },
					peopleAboveAction: { atLeastOnce: 3, atLeastN: 1 },
				},
			},
		},
	},
	{
		hall: "M-hallen",
		occupation: "Fitter",
		exposures: {
			dust: {
				month: {
					peopleCount: 8,
					shifts: { safe: 119, warning: 11, danger: 2 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
				year: {
					peopleCount: 8,
					shifts: { safe: 1272, warning: 95, danger: 13 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
			},
			noise: {
				month: {
					peopleCount: 8,
					shifts: { safe: 70, warning: 44, danger: 20 },
					peopleAboveAction: { atLeastOnce: 8, atLeastN: 6 },
				},
				year: {
					peopleCount: 9,
					shifts: { safe: 628, warning: 593, danger: 265 },
					peopleAboveAction: { atLeastOnce: 9, atLeastN: 9 },
				},
			},
			vibration: {
				month: {
					peopleCount: 7,
					shifts: { safe: 72, warning: 29, danger: 11 },
					peopleAboveAction: { atLeastOnce: 3, atLeastN: 2 },
				},
				year: {
					peopleCount: 7,
					shifts: { safe: 893, warning: 316, danger: 115 },
					peopleAboveAction: { atLeastOnce: 4, atLeastN: 3 },
				},
			},
		},
	},
	{
		hall: "Hall 2",
		occupation: "Welder",
		exposures: {
			dust: {
				month: {
					peopleCount: 9,
					shifts: { safe: 108, warning: 27, danger: 6 },
					peopleAboveAction: { atLeastOnce: 4, atLeastN: 3 },
				},
				year: {
					peopleCount: 9,
					shifts: { safe: 1190, warning: 329, danger: 75 },
					peopleAboveAction: { atLeastOnce: 5, atLeastN: 5 },
				},
			},
			noise: {
				month: {
					peopleCount: 9,
					shifts: { safe: 90, warning: 44, danger: 17 },
					peopleAboveAction: { atLeastOnce: 9, atLeastN: 6 },
				},
				year: {
					peopleCount: 10,
					shifts: { safe: 811, warning: 519, danger: 201 },
					peopleAboveAction: { atLeastOnce: 10, atLeastN: 10 },
				},
			},
			vibration: {
				month: {
					peopleCount: 3,
					shifts: { safe: 45, warning: 4, danger: 1 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 1 },
				},
				year: {
					peopleCount: 3,
					shifts: { safe: 488, warning: 57, danger: 15 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 1 },
				},
			},
		},
	},
	{
		hall: "Hall 2",
		occupation: "Technician",
		exposures: {
			dust: {
				month: {
					peopleCount: 6,
					shifts: { safe: 91, warning: 3, danger: 0 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 6,
					shifts: { safe: 1022, warning: 37, danger: 3 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 1 },
				},
			},
			noise: {
				month: {
					peopleCount: 9,
					shifts: { safe: 129, warning: 18, danger: 4 },
					peopleAboveAction: { atLeastOnce: 3, atLeastN: 1 },
				},
				year: {
					peopleCount: 10,
					shifts: { safe: 1278, warning: 208, danger: 45 },
					peopleAboveAction: { atLeastOnce: 7, atLeastN: 4 },
				},
			},
			vibration: {
				month: {
					peopleCount: 1,
					shifts: { safe: 16, warning: 1, danger: 0 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 1,
					shifts: { safe: 178, warning: 8, danger: 1 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
			},
		},
	},
	{
		hall: "Hall 2",
		occupation: "Fitter",
		exposures: {
			dust: {
				month: {
					peopleCount: 6,
					shifts: { safe: 87, warning: 6, danger: 1 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
				year: {
					peopleCount: 6,
					shifts: { safe: 979, warning: 73, danger: 10 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
			},
			noise: {
				month: {
					peopleCount: 6,
					shifts: { safe: 55, warning: 31, danger: 14 },
					peopleAboveAction: { atLeastOnce: 6, atLeastN: 5 },
				},
				year: {
					peopleCount: 7,
					shifts: { safe: 512, warning: 387, danger: 172 },
					peopleAboveAction: { atLeastOnce: 7, atLeastN: 7 },
				},
			},
			vibration: {
				month: {
					peopleCount: 5,
					shifts: { safe: 66, warning: 13, danger: 5 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 1 },
				},
				year: {
					peopleCount: 5,
					shifts: { safe: 702, warning: 170, danger: 62 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 2 },
				},
			},
		},
	},
	{
		hall: "Hall 3",
		occupation: "Technician",
		exposures: {
			dust: {
				month: {
					peopleCount: 8,
					shifts: { safe: 115, warning: 8, danger: 2 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 1 },
				},
				year: {
					peopleCount: 8,
					shifts: { safe: 1299, warning: 95, danger: 20 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 1 },
				},
			},
			noise: {
				month: {
					peopleCount: 9,
					shifts: { safe: 99, warning: 29, danger: 11 },
					peopleAboveAction: { atLeastOnce: 4, atLeastN: 3 },
				},
				year: {
					peopleCount: 10,
					shifts: { safe: 1120, warning: 312, danger: 120 },
					peopleAboveAction: { atLeastOnce: 5, atLeastN: 5 },
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
	},
	{
		hall: "Hall 3",
		occupation: "Electrician",
		exposures: {
			dust: {
				month: {
					peopleCount: 2,
					shifts: { safe: 29, warning: 2, danger: 0 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
				year: {
					peopleCount: 2,
					shifts: { safe: 332, warning: 19, danger: 3 },
					peopleAboveAction: { atLeastOnce: 1, atLeastN: 0 },
				},
			},
			noise: {
				month: {
					peopleCount: 3,
					shifts: { safe: 35, warning: 8, danger: 3 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
				year: {
					peopleCount: 4,
					shifts: { safe: 481, warning: 104, danger: 36 },
					peopleAboveAction: { atLeastOnce: 2, atLeastN: 1 },
				},
			},
		},
	},
];

/**
 * Mock of the future endpoint. Every month uses the same values, and the result is the sum of the groups in the selected
 * hall and occupation.
 */
export function fetchShiftExceedance(scope: YardScope): Promise<Array<ShiftExceedanceDto>> {
	const period = isSameMonth(scope.start, scope.end) ? "month" : "year";
	const groupsInScope = mockGroups.filter((group) => isInScope(group, scope));

	const rows = exposures.map((exposure): ShiftExceedanceDto => {
		const mocks = groupsInScope.flatMap((group) => group.exposures[exposure]?.[period] ?? []);
		const peopleCount = mocks.reduce((sum, mock) => sum + mock.peopleCount, 0);

		return {
			exposure,
			peopleCount,
			shifts: {
				safe: mocks.reduce((sum, mock) => sum + mock.shifts.safe, 0),
				warning: mocks.reduce((sum, mock) => sum + mock.shifts.warning, 0),
				danger: mocks.reduce((sum, mock) => sum + mock.shifts.danger, 0),
			},
			peopleAboveAction:
				peopleCount < MIN_GROUP_SIZE
					? null
					: {
							atLeastOnce: mocks.reduce((sum, mock) => sum + mock.peopleAboveAction.atLeastOnce, 0),
							atLeastN: mocks.reduce((sum, mock) => sum + mock.peopleAboveAction.atLeastN, 0),
							n: REPEATED_EXCEEDANCE_THRESHOLD,
						},
		};
	});

	return Promise.resolve(rows);
}
