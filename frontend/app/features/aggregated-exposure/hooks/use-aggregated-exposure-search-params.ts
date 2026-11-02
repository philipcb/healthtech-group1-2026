import { type CompareLevel, compareLevels } from "@/features/aggregated-exposure/model/compare.ts";
import { type ExposureFilter, exposureFilters } from "@/features/aggregated-exposure/model/groups.ts";
import {
	aggregatedExposurePeriods,
	getSelectableYears,
	type PeriodSelection,
} from "@/features/aggregated-exposure/model/period.ts";
import { type DustField, defaultDustField, type Exposure, parseAsDustField, parseAsExposure } from "@/lib/exposures.ts";
import { createParser, parseAsNumberLiteral, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

const parseAsMonth = createParser<number>({
	parse: (value) => {
		const month = Number(value);
		return Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : null;
	},
	serialize: (month) => String(month + 1),
});

const today = new Date();

const searchParams = {
	exposure: parseAsExposure.withDefault("dust"),
	dustField: parseAsDustField.withDefault(defaultDustField),
	/**
	 * The exposures the overview's cards show, and sort by when only one is shown. Kept apart from `exposure`, so
	 * opening an exposure's details from a card doesn't change the overview's filter when going back.
	 */
	exposureFilter: parseAsStringLiteral(exposureFilters).withDefault("all"),
	period: parseAsStringLiteral(aggregatedExposurePeriods).withDefault("month"),
	month: parseAsMonth.withDefault(today.getMonth()),
	year: parseAsNumberLiteral(getSelectableYears()).withDefault(today.getFullYear()),
	yard: parseAsString,
	hall: parseAsString,
	/** What the overview's groups are, picked like the compare page's groups */
	level: parseAsStringLiteral(compareLevels).withDefault("hallOccupation"),
};

export function useAggregatedExposureSearchParams() {
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
		yard: params.yard,
		setYard: (yard: string | null) => void setParams({ yard, hall: null }),
		hall: params.hall,
		setHall: (hall: string | null) => void setParams({ hall }),
		level: params.level,
		setLevel: (level: CompareLevel) => void setParams({ level }),
		resetOverviewFilters: () =>
			void setParams({
				period: null,
				month: null,
				year: null,
				exposureFilter: null,
				level: null,
				yard: null,
				hall: null,
			}),
		resetGroupFilters: () =>
			void setParams({ period: null, month: null, year: null, exposure: null, dustField: null }),
		periodSelection,
	};
}
