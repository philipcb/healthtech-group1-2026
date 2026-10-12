import type { TranslateFn } from "@/i18n/config.ts";
import { type Exposure, type ExposureUnit, exposures } from "@/lib/exposures.ts";
import { getThreshold, type Threshold } from "@/lib/thresholds.ts";
import { formatExposureValue } from "@/lib/utils.ts";

/** Groups with fewer people than this are never returned to the medical team */
export const MIN_GROUP_SIZE = 5;

/**
 * What the overview shows a card for: a hall and occupation, or a whole hall. Whole halls are demo only, see
 * `HallSummary`.
 */
export const groupLevels = ["occupation", "hall"] as const;
export type GroupLevel = (typeof groupLevels)[number];

/** Which exposures the overview's cards show: every exposure, or only one, which the cards are then sorted by */
export const exposureFilters = ["all", ...exposures] as const;
export type ExposureFilter = (typeof exposureFilters)[number];

export function getShownExposures(filter: ExposureFilter): ReadonlyArray<Exposure> {
	return filter === "all" ? exposures : [filter];
}

/**
 * The existing action and limit values each exposure's bar is drawn against. They apply to a single person's exposure,
 * while the cards show group averages, so the colors place the group average on that scale rather than assess every
 * person in the group. How comparable each exposure's value is to its thresholds:
 * - dust: the PM1 TWA thresholds (7.5 / 15) have no documented source or unit in the project, so the comparison needs a
 *   professional assessment.
 * - noise: 80 / 85 dB apply to a person's daily exposure (LEX,8h), while the value is an arithmetic average of LAeq, so
 *   the measurement basis isn't the same and needs a professional assessment.
 * - vibration: 100 / 400 points apply to a person's daily points, the same basis as the value (average daily points per
 *   person), as long as the equipment's points follow the HSE points system, which the supplier hasn't confirmed.
 */
export const thresholdByExposure: Record<Exposure, Threshold> = {
	dust: getThreshold("dust", "pm1_twa"),
	noise: getThreshold("noise"),
	vibration: getThreshold("vibration"),
};

/** A group average without its unit, rounded the same way everywhere it's shown */
export function formatGroupNumber(value: number, unit: ExposureUnit, fractionDigits = unit === "ug" ? 0 : 1) {
	return formatExposureValue(value, unit, fractionDigits);
}

/** Points are written in lowercase, like the other units in the medical team's sentences */
export function getGroupUnitLabel(unit: ExposureUnit, t: TranslateFn) {
	return unit === "points" ? t(($) => $.medicalTeamDashboard.pointsUnit) : t(($) => $.exposures.units[unit]);
}

/** A group average with its unit */
export function formatGroupValue(value: number, unit: ExposureUnit, t: TranslateFn) {
	return `${formatGroupNumber(value, unit)} ${getGroupUnitLabel(unit, t)}`;
}

export function getGroupName({ hall, occupation }: { hall: string; occupation: string }, t: TranslateFn) {
	return `${hall} · ${getOccupationLabel(occupation, t)}`;
}

/** Highest first, with missing values last. `0` when they're the same, so the caller decides the order. */
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

/**
 * Compares the filter's exposure, highest first with missing values last. With every exposure shown, there's no single
 * value to compare, since different exposures' averages can't be compared, so it's `0` and the caller orders by name.
 */
export function compareByExposureFilter(
	averagesA: Record<Exposure, number | null>,
	averagesB: Record<Exposure, number | null>,
	filter: ExposureFilter,
) {
	return filter === "all" ? 0 : compareAverages(averagesA[filter], averagesB[filter]);
}

export function getHallName(hall: string, t: TranslateFn) {
	return `${hall} · ${t(($) => $.medicalTeamDashboard.wholeHall)}`;
}

export function getOccupationLabel(occupation: string, t: TranslateFn) {
	switch (occupation) {
		case "Welder":
			return t(($) => $.medicalTeamDashboard.occupations.welder);
		case "Technician":
			return t(($) => $.medicalTeamDashboard.occupations.technician);
		case "Electrician":
			return t(($) => $.medicalTeamDashboard.occupations.electrician);
		case "Fitter":
			return t(($) => $.medicalTeamDashboard.occupations.fitter);
		// An occupation without a translation is shown as it is, rather than labelled as another occupation
		default:
			return occupation;
	}
}
