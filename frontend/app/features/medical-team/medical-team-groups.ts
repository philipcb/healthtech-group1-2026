import type { TranslateFn } from "@/i18n/config.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { useState } from "react";

export type MedicalPeriod = "month" | "year";

export type ExposureAverage = {
	average: number;
	unit: string;
	percentOfActionValue: number;
};

export type PeriodAggregate = {
	peopleCount: number;
	averageTimeAboveActionPercent: number;
	averageValues: Record<Exposure, ExposureAverage>;
};

export type MedicalGroupAggregate = {
	id: string;
	site: string;
	hall: string;
	occupation: string;
	periods: Record<MedicalPeriod, PeriodAggregate>;
};

/** Groups with fewer people than this are never shown to the medical team */
export const MIN_GROUP_SIZE = 5;

/** Filter value that matches every hall or occupation */
export const ALL_FILTER_VALUE = "all";

/** Groups at the site that are large enough to be shown for the selected period */
export function getPrivacySafeGroups(
	groups: Array<MedicalGroupAggregate>,
	site: string,
	period: MedicalPeriod,
): Array<MedicalGroupAggregate> {
	return groups.filter((group) => group.site === site && group.periods[period].peopleCount >= MIN_GROUP_SIZE);
}

export function filterGroups(
	groups: Array<MedicalGroupAggregate>,
	{ hall, occupation }: { hall: string; occupation: string },
): Array<MedicalGroupAggregate> {
	return groups.filter(
		(group) =>
			(hall === ALL_FILTER_VALUE || group.hall === hall) &&
			(occupation === ALL_FILTER_VALUE || group.occupation === occupation),
	);
}

/** Hall and occupation filters for the given groups, plus the groups that match them */
export function useGroupFilters(groups: Array<MedicalGroupAggregate>) {
	const [hall, setHall] = useState(ALL_FILTER_VALUE);
	const [occupation, setOccupation] = useState(ALL_FILTER_VALUE);

	return {
		hall,
		setHall,
		occupation,
		setOccupation,
		halls: [...new Set(groups.map((group) => group.hall))],
		occupations: [...new Set(groups.map((group) => group.occupation))],
		visibleGroups: filterGroups(groups, { hall, occupation }),
	};
}

export function getHallLabel(hall: string, t: TranslateFn) {
	return hall === "M-hallen"
		? t(($) => $.medicalTeamDashboard.halls.mHall)
		: t(($) => $.medicalTeamDashboard.halls.hall2);
}

export function getOccupationLabel(occupation: string, t: TranslateFn) {
	switch (occupation) {
		case "Welder":
			return t(($) => $.medicalTeamDashboard.occupations.welder);
		case "Technician":
			return t(($) => $.medicalTeamDashboard.occupations.technician);
		case "Electrician":
			return t(($) => $.medicalTeamDashboard.occupations.electrician);
		default:
			return t(($) => $.medicalTeamDashboard.occupations.fitter);
	}
}
