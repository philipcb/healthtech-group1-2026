import type { MedicalPeriod } from "@/features/medical-team/medical-team-groups.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import { useState } from "react";

export const monthKeys = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
] as const;

export type PeriodSelection = {
	period: MedicalPeriod;
	setPeriod: (period: MedicalPeriod) => void;
	/** Zero-based month index, as returned by `Date#getMonth` */
	month: number;
	setMonth: (month: number) => void;
	year: number;
	setYear: (year: number) => void;
};

export function usePeriodSelection(): PeriodSelection {
	const [period, setPeriod] = useState<MedicalPeriod>("month");
	const [month, setMonth] = useState(() => new Date().getMonth());
	const [year, setYear] = useState(() => new Date().getFullYear());

	return { period, setPeriod, month, setMonth, year, setYear };
}

export function getMonthLabel(month: number, t: TranslateFn) {
	return t(($) => $.medicalTeamDashboard.months[monthKeys[month]]);
}

export function getPeriodLabel(
	{ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">,
	t: TranslateFn,
) {
	return period === "month" ? `${getMonthLabel(month, t)} ${year}` : year.toString();
}
