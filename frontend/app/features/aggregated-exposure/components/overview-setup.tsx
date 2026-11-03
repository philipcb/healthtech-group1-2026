import { ExposureFilterToggle } from "@/components/exposure-filter-toggle.tsx";
import { FilterPanel } from "@/features/aggregated-exposure/components/filter-panel.tsx";
import { HallFilter } from "@/features/aggregated-exposure/components/hall-filter.tsx";
import {
	defaultOverviewLevel,
	useAggregatedExposureSearchParams,
} from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
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
	const { exposureFilter, setExposureFilter, setYard, setHall, level, setLevel, resetOverviewFilters } =
		useAggregatedExposureSearchParams();
	// A building can only be picked when the groups are buildings
	const showsHallFilter = getComparePlace(level) === "hall";
	const activeDialogFilterCount = [
		selectedYard !== null,
		showsHallFilter && selectedHall !== null,
		level !== defaultOverviewLevel,
	].filter(Boolean).length;

	return (
		<FilterPanel
			label={t(($) => $.aggregatedExposure.filters.title)}
			onReset={resetOverviewFilters}
			activeDialogFilterCount={activeDialogFilterCount}
			// The dust fraction is picked in the dust column's header, or above the list on phones, next to the values it changes
			exposure={(labelId) => (
				<ExposureFilterToggle
					value={exposureFilter}
					onValueChange={setExposureFilter}
					labelledBy={labelId}
					compact={true}
				/>
			)}
			yards={yards}
			selectedYard={selectedYard}
			onYardChange={setYard}
			levelLabel={t(($) => $.aggregatedExposure.overview.level.label)}
			level={level}
			onLevelChange={setLevel}
			inlineFilters={
				showsHallFilter && (
					<HallFilter halls={halls} value={selectedHall} onValueChange={setHall} hidesLabel={true} />
				)
			}
			dialogFilters={showsHallFilter && <HallFilter halls={halls} value={selectedHall} onValueChange={setHall} />}
		/>
	);
}
