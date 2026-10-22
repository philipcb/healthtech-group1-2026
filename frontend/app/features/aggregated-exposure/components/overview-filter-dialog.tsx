import { ExposureFilterToggle } from "@/features/aggregated-exposure/components/exposure-filter-toggle.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { GroupLevelToggle } from "@/features/aggregated-exposure/components/group-level-toggle.tsx";
import { HallFilter } from "@/features/aggregated-exposure/components/hall-filter.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";

type OverviewFilterDialogProps = {
	yards: Array<string>;
	selectedYard: string | null;
	halls: Array<string>;
	selectedHall: string | null;
	className?: string;
};

export function OverviewFilterDialog({
	yards,
	selectedYard,
	halls,
	selectedHall,
	className,
}: OverviewFilterDialogProps) {
	const { YardFilter } = useDashboardScope();
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

	return (
		<FilterDialog
			periodSelection={periodSelection}
			showsPeriod={true}
			onReset={resetOverviewFilters}
			className={className}
		>
			<ExposureFilterToggle value={exposureFilter} onValueChange={setExposureFilter} />
			<GroupLevelToggle value={level} onValueChange={setLevel} />
			{YardFilter && <YardFilter yards={yards} value={selectedYard} onValueChange={setYard} />}
			<HallFilter halls={halls} value={selectedHall} onValueChange={setHall} />
		</FilterDialog>
	);
}
