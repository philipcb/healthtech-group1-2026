import { ExposureFilterToggle } from "@/features/aggregated-exposure/components/exposure-filter-toggle.tsx";
import { FilterPanel, FilterRow } from "@/features/aggregated-exposure/components/filter-panel.tsx";
import { HallFilter } from "@/features/aggregated-exposure/components/hall-filter.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { getComparePlace } from "@/features/aggregated-exposure/model/compare.ts";
import { useTranslation } from "react-i18next";

type OverviewSetupProps = {
	yards: Array<string>;
	selectedYard: string | null;
	halls: Array<string>;
	selectedHall: string | null;
};

export function OverviewSetup({ yards, selectedYard, halls, selectedHall }: OverviewSetupProps) {
	const { t } = useTranslation();
	const {
		exposureFilter,
		setExposureFilter,
		setYard,
		setHall,
		level,
		setLevel,
		resetOverviewFilters,
		periodSelection,
	} = useAggregatedExposureSearchParams();
	// A building can only be picked when the groups are buildings
	const showsHallFilter = getComparePlace(level) === "hall";

	return (
		<FilterPanel
			label={t(($) => $.aggregatedExposure.filters.title)}
			periodSelection={periodSelection}
			onReset={resetOverviewFilters}
			exposure={(labelId) => (
				<ExposureFilterToggle value={exposureFilter} onValueChange={setExposureFilter} labelledBy={labelId} />
			)}
			yards={yards}
			selectedYard={selectedYard}
			onYardChange={setYard}
			levelLabel={t(($) => $.aggregatedExposure.overview.level.label)}
			level={level}
			onLevelChange={setLevel}
			dialogFilters={showsHallFilter && <HallFilter halls={halls} value={selectedHall} onValueChange={setHall} />}
		>
			{showsHallFilter && (
				<FilterRow label={t(($) => $.aggregatedExposure.filters.hall)} hiddenOnMobile={true}>
					<HallFilter halls={halls} value={selectedHall} onValueChange={setHall} hidesLabel={true} />
				</FilterRow>
			)}
		</FilterPanel>
	);
}
