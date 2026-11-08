import { type CompareLevel, compareLevels } from "@/features/aggregated-exposure/model/compare.ts";
import {
	aggregatedExposurePeriods,
	getDefaultDay,
	getSelectableYears,
	type PeriodSelection,
} from "@/features/aggregated-exposure/model/period.ts";
import { TIMEZONE_NAME } from "@/i18n/locale.ts";
import {
	type DustField,
	defaultDustField,
	type Exposure,
	type ExposureFilter,
	exposureFilters,
	parseAsDustField,
	parseAsExposure,
} from "@/lib/exposures.ts";
import { TZDate } from "@date-fns/tz";
import { getDaysInMonth } from "date-fns";
import { createParser, parseAsNumberLiteral, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

const parseAsMonth = createParser<number>({
	parse: (value) => {
		const month = Number(value);
		return Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : null;
	},
	serialize: (month) => String(month + 1),
});

const parseAsDay = createParser<number>({
	parse: (value) => {
		const day = Number(value);
		return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
	},
	serialize: String,
});

const today = new Date();

/** What the overview's groups are until another level is picked */
export const defaultOverviewLevel: CompareLevel = "hallOccupation";

const searchParams = {
	exposure: parseAsExposure.withDefault("dust"),
	dustField: parseAsDustField.withDefault(defaultDustField),
	/**
	 * The exposures the overview's cards show, and sort by when only one is shown. Kept apart from `exposure`, so
	 * opening an exposure's details from a card doesn't change the overview's filter when going back.
	 */
	exposureFilter: parseAsStringLiteral(exposureFilters).withDefault("all"),
	period: parseAsStringLiteral(aggregatedExposurePeriods).withDefault("month"),
	/** Without a default, so the day period starts on the day `getDefaultDay` picks for the month */
	day: parseAsDay,
	month: parseAsMonth.withDefault(today.getMonth()),
	year: parseAsNumberLiteral(getSelectableYears()).withDefault(today.getFullYear()),
	yard: parseAsString,
	hall: parseAsString,
	/** What the overview's groups are, picked like the compare page's groups */
	level: parseAsStringLiteral(compareLevels).withDefault(defaultOverviewLevel),
};

/** The search params of the period, which the management pages share, so it's kept when switching between them */
export const periodSearchParamKeys = ["period", "day", "month", "year"] as const satisfies Array<
	keyof typeof searchParams
>;

export function useAggregatedExposureSearchParams() {
	const [params, setParams] = useQueryStates(searchParams);
	// A day from the link that the month doesn't have, like 31 in February, is its last day
	const selectedDay = Math.min(
		params.day ?? getDefaultDay(params.month, params.year),
		getDaysInMonth(new TZDate(params.year, params.month, 1, TIMEZONE_NAME)),
	);

	const periodSelection: PeriodSelection = {
		period: params.period,
		// A new period starts on its default day, not one from an earlier day period
		setPeriod: (period) => void setParams({ period, day: null }),
		day: selectedDay,
		setDay: (day) => void setParams({ day }),
		month: params.month,
		setMonth: (month) => void setParams({ month }),
		year: params.year,
		setYear: (year) => void setParams({ year }),
	};

	return {
		exposure: params.exposure,
		setExposure: (exposure: Exposure) => void setParams({ exposure }),
		dustField: params.dustField,
		setDustField: (dustField: DustField) => void setParams({ dustField }),
		exposureFilter: params.exposureFilter,
		setExposureFilter: (exposureFilter: ExposureFilter) => void setParams({ exposureFilter }),
		yard: params.yard,
		setYard: (yard: string | null) => void setParams({ yard, hall: null }),
		hall: params.hall,
		setHall: (hall: string | null) => void setParams({ hall }),
		level: params.level,
		setLevel: (level: CompareLevel) => void setParams({ level }),
		// The period has its own picker, so it isn't one of the filters this resets
		resetOverviewFilters: () => void setParams({ exposureFilter: null, level: null, yard: null, hall: null }),
		resetGroupFilters: () =>
			void setParams({ period: null, day: null, month: null, year: null, exposure: null, dustField: null }),
		periodSelection,
	};
}
