import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import {
	type GroupLevel,
	groupLevels,
} from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import { Factory, UsersRound } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** Picks what the overview shows a card for. Whole halls are demo only, see `HallSummary`. */
export function GroupLevelToggle({
	value,
	onValueChange,
}: {
	value: GroupLevel;
	onValueChange: (level: GroupLevel) => void;
}) {
	const { t } = useTranslation();
	const labelId = useId();

	return (
		<div className="flex flex-col gap-1.5">
			<p id={labelId} className="font-medium text-sm">
				{t(($) => $.occupationalHealthServiceDashboard.overview.level.label)}
			</p>
			<ToggleGroup
				aria-labelledby={labelId}
				type="single"
				value={value}
				variant="outline"
				className="w-full sm:w-fit"
				onValueChange={(selected: string) => {
					const level = groupLevels.find((candidate) => candidate === selected);
					if (level) onValueChange(level);
				}}
			>
				<ToggleGroupItem value="hall" className="grow px-2 sm:grow-0 lg:px-3">
					<Factory aria-hidden="true" className="size-4" />
					<span className="text-xs lg:text-sm">
						{t(($) => $.occupationalHealthServiceDashboard.overview.level.hall)}
					</span>
				</ToggleGroupItem>
				<ToggleGroupItem value="occupation" className="grow px-2 sm:grow-0 lg:px-3">
					<UsersRound aria-hidden="true" className="size-4" />
					<span className="text-xs lg:text-sm">
						{t(($) => $.occupationalHealthServiceDashboard.overview.level.occupation)}
					</span>
				</ToggleGroupItem>
			</ToggleGroup>
		</div>
	);
}
