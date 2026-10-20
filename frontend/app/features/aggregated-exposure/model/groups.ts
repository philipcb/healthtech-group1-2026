import type { TranslateFn } from "@/i18n/config.ts";
import type { AggregatedOverviewResponseDto, SampleDto } from "@/lib/api/generated/models/index.ts";
import { type DustField, type Exposure, type ExposureUnit, exposures } from "@/lib/exposures.ts";
import { getThreshold, type Threshold } from "@/lib/thresholds.ts";
import { formatExposureValue } from "@/lib/utils.ts";

/** Groups with fewer people than this are never returned by the backend */
export const MIN_GROUP_SIZE = 5;

export const groupLevels = ["occupation", "hall"] as const;
export type GroupLevel = (typeof groupLevels)[number];

export const exposureFilters = ["all", ...exposures] as const;
export type ExposureFilter = (typeof exposureFilters)[number];

export function getShownExposures(filter: ExposureFilter): ReadonlyArray<Exposure> {
	return filter === "all" ? exposures : [filter];
}

/**
 * Exposures the aggregate API has values for, but not values that can be shown as what the dashboard says they are.
 * They're shown as unavailable instead, and their trends aren't requested. None at the moment.
 */
export const unavailableExposures = [] as const satisfies ReadonlyArray<Exposure>;
export type UnavailableExposure = (typeof unavailableExposures)[number];

export function isExposureUnavailable(exposure: Exposure): exposure is UnavailableExposure {
	return (unavailableExposures as ReadonlyArray<Exposure>).includes(exposure);
}

/** One occupation in one hall */
export type GroupSummary = Omit<SampleDto, "hall" | "occupation"> & { hall: string; occupation: string };

/**
 * The aggregate API's groups, for `useGetAggregateGroups`'s `select`. The backend decides which sites the user sees:
 * the occupational health service its own, management every site. Where each value comes from in the aggregate
 * database:
 * - dust: average PM1 TWA, `DustAverage.AveragePm1Twa`.
 * - noise: average LAeq, `NoiseAverage.AverageLaeq`. An arithmetic average of decibels, which underestimates the
 *   energy average.
 * - vibration: `VibrationAverage.AverageExposure`, the group's average per hour. The overview averages each day's
 *   hours, and the trend shows each day's last hour.
 */
export function toGroupSummaries({ units, groups }: AggregatedOverviewResponseDto) {
	const hiddenAverages = Object.fromEntries(unavailableExposures.map((exposure) => [exposure, null]));

	return {
		units,
		// The backend only sends groups of one occupation in one hall, but the DTO allows a missing hall or occupation
		groups: groups.flatMap(
			({ groupId, site, hall, occupation, averages }): Array<GroupSummary> =>
				hall === null || occupation === null
					? []
					: [{ groupId, site, hall, occupation, averages: { ...averages, ...hiddenAverages } }],
		),
	};
}

/**
 * The existing action and limit values each exposure's bar is drawn against. They apply to a single person's exposure,
 * while the cards show group averages, so the colors place the group average on that scale rather than assess every
 * person in the group. How comparable each exposure's value is to its thresholds:
 * - dust: the PM1 TWA thresholds (7.5 / 15) have no documented source or unit in the project, so the comparison needs a
 *   professional assessment.
 * - noise: 80 / 85 dB apply to a person's daily exposure (LEX,8h), while the value is an arithmetic average of LAeq, so
 *   the measurement basis isn't the same and needs a professional assessment.
 * - vibration: 100 / 400 points apply to a person's daily points, while the value is the group's average points per
 *   tool session, so the measurement basis isn't the same and needs a professional assessment.
 */
export const thresholdByExposure: Record<Exposure, Threshold> = {
	dust: getThreshold("dust", "pm1_twa"),
	noise: getThreshold("noise"),
	vibration: getThreshold("vibration"),
};

export function getGroupThreshold(exposure: Exposure, dustField: DustField): Threshold {
	return exposure === "dust" ? getThreshold("dust", dustField) : thresholdByExposure[exposure];
}

export function formatGroupNumber(value: number, unit: ExposureUnit, fractionDigits = unit === "ug" ? 0 : 1) {
	return formatExposureValue(value, unit, fractionDigits);
}

export function getGroupUnitLabel(unit: ExposureUnit, t: TranslateFn) {
	return unit === "points" ? t(($) => $.aggregatedExposure.pointsUnit) : t(($) => $.exposures.units[unit]);
}

export function formatGroupValue(value: number, unit: ExposureUnit, t: TranslateFn) {
	return `${formatGroupNumber(value, unit)} ${getGroupUnitLabel(unit, t)}`;
}

export function getGroupName({ hall, occupation }: { hall: string; occupation: string }, t: TranslateFn) {
	return `${hall} · ${getOccupationLabel(occupation, t)}`;
}

function compareAverages(averageA: number | null, averageB: number | null) {
	if (averageA === averageB) {
		return 0;
	}

	if (averageA === null) {
		return 1;
	}

	if (averageB === null) {
		return -1;
	}

	return averageB - averageA;
}

export function compareByExposureFilter(
	averagesA: Record<Exposure, number | null>,
	averagesB: Record<Exposure, number | null>,
	filter: ExposureFilter,
) {
	return filter === "all" ? 0 : compareAverages(averagesA[filter], averagesB[filter]);
}

export function getOccupationLabel(occupation: string, t: TranslateFn) {
	switch (occupation) {
		case "Welder":
			return t(($) => $.aggregatedExposure.occupations.welder);
		case "Technician":
			return t(($) => $.aggregatedExposure.occupations.technician);
		case "Electrician":
			return t(($) => $.aggregatedExposure.occupations.electrician);
		case "Fitter":
			return t(($) => $.aggregatedExposure.occupations.fitter);
		default:
			return occupation;
	}
}
