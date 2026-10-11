import {
	getSelectableYears,
	medicalPeriods,
	type PeriodSelection,
} from "@/features/medical-team/medical-team-period.ts";
import { type Exposure, parseAsExposure } from "@/lib/exposures.ts";
import { createParser, parseAsNumberLiteral, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

/** The URL shows months as 1-12, while `Date` and the rest of the code use 0-11 */
const parseAsMonth = createParser<number>({
	parse: (value) => {
		const month = Number(value);
		return Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : null;
	},
	serialize: (month) => String(month + 1),
});

const today = new Date();

const searchParams = {
	/** The exposure shown in a group's details */
	exposure: parseAsExposure.withDefault("dust"),
	/**
	 * The exposure the overview sorts by. Kept apart from `exposure`, so opening another exposure from a group card
	 * doesn't change the overview's sorting when going back.
	 */
	sort: parseAsExposure.withDefault("dust"),
	period: parseAsStringLiteral(medicalPeriods).withDefault("month"),
	month: parseAsMonth.withDefault(today.getMonth()),
	year: parseAsNumberLiteral(getSelectableYears()).withDefault(today.getFullYear()),
	hall: parseAsString,
};

/**
 * The medical team's selection, kept in the URL so it's shared between the overview and a group's details, and kept
 * when navigating back.
 */
export function useMedicalTeamSearchParams() {
	const [params, setParams] = useQueryStates(searchParams);

	const periodSelection: PeriodSelection = {
		period: params.period,
		setPeriod: (period) => void setParams({ period }),
		month: params.month,
		setMonth: (month) => void setParams({ month }),
		year: params.year,
		setYear: (year) => void setParams({ year }),
	};

	return {
		exposure: params.exposure,
		setExposure: (exposure: Exposure) => void setParams({ exposure }),
		sort: params.sort,
		setSort: (sort: Exposure) => void setParams({ sort }),
		hall: params.hall,
		setHall: (hall: string | null) => void setParams({ hall }),
		periodSelection,
	};
}
