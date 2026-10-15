import {
	type ExposureFilter,
	exposureFilters,
	type GroupLevel,
	groupLevels,
} from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import {
	getSelectableYears,
	occupationalHealthServicePeriods,
	type PeriodSelection,
} from "@/features/occupational-health-service/occupational-health-service-period.ts";
import { type DustField, defaultDustField, type Exposure, parseAsDustField, parseAsExposure } from "@/lib/exposures.ts";
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
	/** The dust fraction shown in a group's details. The overview always shows PM1. Same name as in the operator's pages. */
	dustField: parseAsDustField.withDefault(defaultDustField),
	/**
	 * The exposures the overview's cards show, and sort by when only one is shown. Kept apart from `exposure`, so
	 * opening an exposure's details from a card doesn't change the overview's filter when going back.
	 */
	exposureFilter: parseAsStringLiteral(exposureFilters).withDefault("all"),
	period: parseAsStringLiteral(occupationalHealthServicePeriods).withDefault("month"),
	month: parseAsMonth.withDefault(today.getMonth()),
	year: parseAsNumberLiteral(getSelectableYears()).withDefault(today.getFullYear()),
	hall: parseAsString,
	/** What the overview shows a card for. Defaults to a hall and occupation, so existing links keep their meaning. */
	level: parseAsStringLiteral(groupLevels).withDefault("occupation"),
};

/**
 * The occupational health service's selection, kept in the URL so it's shared between the overview and a group's
 * details, and kept when navigating back.
 */
export function useOccupationalHealthServiceSearchParams() {
	// Not shallow, so React Router sees every change, and links built from its location, like going back from a group's
	// details or opening them from the overview, keep the current selection
	const [params, setParams] = useQueryStates(searchParams, { shallow: false });

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
		dustField: params.dustField,
		setDustField: (dustField: DustField) => void setParams({ dustField }),
		exposureFilter: params.exposureFilter,
		setExposureFilter: (exposureFilter: ExposureFilter) => void setParams({ exposureFilter }),
		hall: params.hall,
		setHall: (hall: string | null) => void setParams({ hall }),
		level: params.level,
		setLevel: (level: GroupLevel) => void setParams({ level }),
		/** Sets every overview filter back to its default in one update, leaving the details' exposure as it is */
		resetOverviewFilters: () =>
			void setParams({ period: null, month: null, year: null, exposureFilter: null, level: null, hall: null }),
		/** Sets every filter on a group's details back to its default in one update, leaving the overview's as they are */
		resetGroupFilters: () =>
			void setParams({ period: null, month: null, year: null, exposure: null, dustField: null }),
		periodSelection,
	};
}
