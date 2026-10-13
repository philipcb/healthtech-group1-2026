import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { type ExposureFilter, exposureFilters } from "@/features/medical-team/medical-team-groups.ts";
import { exposures } from "@/lib/exposures.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** Picks which exposures the overview's cards show: every exposure, or only one */
export function ExposureFilterToggle({
	value,
	onValueChange,
}: {
	value: ExposureFilter;
	onValueChange: (filter: ExposureFilter) => void;
}) {
	const { t } = useTranslation();
	const labelId = useId();

	return (
		<div className="flex flex-col gap-1.5">
			<p id={labelId} className="font-medium text-sm">
				{t(($) => $.medicalTeamDashboard.overview.exposureFilter.label)}
			</p>
			<ToggleGroup
				aria-labelledby={labelId}
				type="single"
				value={value}
				variant="outline"
				className="w-full sm:w-fit"
				onValueChange={(selected: string) => {
					const filter = exposureFilters.find((candidate) => candidate === selected);
					if (filter) onValueChange(filter);
				}}
			>
				<ToggleGroupItem value="all" className="grow px-2 sm:grow-0 lg:px-3">
					<span className="text-xs lg:text-sm">
						{t(($) => $.medicalTeamDashboard.overview.exposureFilter.all)}
					</span>
				</ToggleGroupItem>
				{exposures.map((exposure) => (
					<ToggleGroupItem key={exposure} value={exposure} className="grow px-2 sm:grow-0 lg:px-3">
						<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
						<span className="text-xs lg:text-sm">{t(($) => $.exposures[exposure])}</span>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
