import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
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
		dustField,
		setDustField,
		setYard,
		setHall,
		level,
		setLevel,
		resetOverviewFilters,
		periodSelection,
	} = useAggregatedExposureSearchParams();
	// A building can only be picked when the groups are buildings
	const showsHallFilter = getComparePlace(level) === "hall";
	const showsDust = exposureFilter === "all" || exposureFilter === "dust";

	return (
		<FilterPanel
			label={t(($) => $.aggregatedExposure.filters.title)}
			periodSelection={periodSelection}
			onReset={resetOverviewFilters}
			exposure={(labelId) => (
				<div className="flex flex-wrap items-center gap-2">
					<ExposureFilterToggle
						value={exposureFilter}
						onValueChange={setExposureFilter}
						labelledBy={labelId}
					/>
					{showsDust && (
						<DustFieldTabs
							value={dustField}
							onValueChange={setDustField}
							ariaLabel={t(($) => $.aggregatedExposure.group.dustFieldLabel)}
						/>
					)}
				</div>
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
