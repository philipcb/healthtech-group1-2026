import { ExposureFilterToggle } from "@/features/medical-team/exposure-filter-toggle.tsx";
import { GroupLevelToggle } from "@/features/medical-team/group-level-toggle.tsx";
import { HallFilter } from "@/features/medical-team/hall-filter.tsx";
import { MedicalFilterDialog } from "@/features/medical-team/medical-filter-dialog.tsx";
import { useMedicalTeamSearchParams } from "@/features/medical-team/medical-team-search-params.ts";

type OverviewFilterDialogProps = {
	/** The halls that can be picked, decided by the groups */
	halls: Array<string>;
	/** Only a hall that's in `halls`, or `null` for every hall, the same hall the results are filtered by */
	selectedHall: string | null;
	className?: string;
};

/** Every overview filter in one dialog, with the period next to the button, since phones don't show it elsewhere */
export function OverviewFilterDialog({ halls, selectedHall, className }: OverviewFilterDialogProps) {
	const { exposureFilter, setExposureFilter, setHall, level, setLevel, resetOverviewFilters, periodSelection } =
		useMedicalTeamSearchParams();

	return (
		<MedicalFilterDialog
			periodSelection={periodSelection}
			showsPeriod={true}
			onReset={resetOverviewFilters}
			className={className}
		>
			<ExposureFilterToggle value={exposureFilter} onValueChange={setExposureFilter} />
			<GroupLevelToggle value={level} onValueChange={setLevel} />
			<HallFilter halls={halls} value={selectedHall} onValueChange={setHall} />
		</MedicalFilterDialog>
	);
}
