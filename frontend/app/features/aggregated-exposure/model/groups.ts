import type { TranslateFn } from "@/i18n/config.ts";
import type { AggregatedOverviewResponseDto, SampleDto } from "@/lib/api/generated/models/index.ts";
import { type DustField, type Exposure, type ExposureFilter, type ExposureUnit, exposures } from "@/lib/exposures.ts";
import { getThreshold, type Threshold } from "@/lib/thresholds.ts";
import { formatExposureValue } from "@/lib/utils.ts";

/** Groups with fewer people than this are never returned by the backend */
export const MIN_GROUP_SIZE = 5;

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

export function hideUnavailableAverages(averages: SampleDto["averages"]): SampleDto["averages"] {
	return { ...averages, ...Object.fromEntries(unavailableExposures.map((exposure) => [exposure, null])) };
}

/** One occupation in one hall */
export type GroupSummary = Omit<SampleDto, "hall" | "occupation"> & { hall: string; occupation: string };

/**
 * The aggregate API's groups, for `useGetAggregateGroups`'s `select`. The backend decides which sites the user sees:
 * every site, for both management and the occupational health service. Where each value comes from in the aggregate
 * database:
 * - dust: the average TWA of the `dustField` asked for, PM1 by default, such as `DustAverage.AveragePm1Twa`.
 * - noise: average LAeq, `NoiseAverage.AverageLaeq`. An arithmetic average of decibels, which underestimates the
 *   energy average.
 * - vibration: `VibrationAverage.AverageExposure`, each hour the average of the workers' total points so far that day.
 *   A worker's total holds until midnight in Oslo, so each day's last hour is the average of the workers' daily totals.
 *   The overview averages those days, and the trend shows each day's last hour.
 */
export function toGroupSummaries({ units, groups }: AggregatedOverviewResponseDto) {
	const summaries = groups.map((group) => ({ ...group, averages: hideUnavailableAverages(group.averages) }));

	return {
		units,
		// The backend also sends whole sites, whole halls and one occupation across a site, which the site map doesn't show
		groups: summaries.flatMap(
			({ groupId, site, hall, occupation, workerCount, averages }): Array<GroupSummary> =>
				hall === null || occupation === null
					? []
					: [{ groupId, site, hall, occupation, workerCount, averages }],
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
 * - vibration: 100 / 400 points apply to a person's daily points, while the value is the average of the workers' daily
 *   totals, so a group average below a threshold can still include workers above it.
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

/** Highest first, with missing averages last */
export function compareAverages(averageA: number | null, averageB: number | null) {
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

export const NO_VALUE = "—";

/** A share like 0.125 as "13 %", or "—" when the backend has no share, so no data doesn't read as 0 % */
export function formatShare(share?: number) {
	return share === undefined ? NO_VALUE : `${Math.round(share * 100)} %`;
}

/**
 * The measured hours a share is taken over, like "Average per worker and day · 200 hours measured". Left out without a share, and for the
 * days the aggregate job stored before it counted the hours, which have 0 hours.
 */
export function formatHourBasis(share: number | undefined, hourCount: number, t: TranslateFn, language: string) {
	if (share === undefined || hourCount === 0) {
		return undefined;
	}

	return t(($) => $.aggregatedExposure.group.hourBasis, {
		count: hourCount,
		hours: getThresholdNumberFormat(language).format(hourCount),
	});
}

export function getMetricLabel(exposure: Exposure, dustField: DustField, t: TranslateFn) {
	return exposure === "dust"
		? t(($) => $.aggregatedExposure.metrics.dust, { dustField: t(($) => $.exposures.dustFields[dustField]) })
		: t(($) => $.aggregatedExposure.metrics[exposure]);
}

// The same for every exposure, since the backend's time over the thresholds is a share of hours for all of them
export function getShareLabels(t: TranslateFn) {
	return {
		action: t(($) => $.aggregatedExposure.group.timeOverAction),
		limit: t(($) => $.aggregatedExposure.group.timeOverLimit),
	};
}

export function getThresholdNumberFormat(language: string) {
	return new Intl.NumberFormat(language === "no" ? "nb-NO" : "en-US");
}
