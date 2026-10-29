import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { OptionToggle } from "@/features/aggregated-exposure/components/option-toggle.tsx";
import {
	type CompareLevel,
	comparePlaces,
	getCompareLevel,
	getComparePlace,
	isPerOccupation,
} from "@/features/aggregated-exposure/model/compare.ts";
import { Factory, MapPin, UsersRound } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

const placeIcons = { yard: MapPin, hall: Factory };

/** What the groups are: yards or buildings, and optionally each occupation in them. Shared by the overview and compare. */
export function LevelPicker({
	level,
	onLevelChange,
	labelledBy,
}: {
	level: CompareLevel;
	onLevelChange: (level: CompareLevel) => void;
	labelledBy: string;
}) {
	const { t } = useTranslation();
	const perOccupationId = useId();
	const place = getComparePlace(level);
	const perOccupation = isPerOccupation(level);

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
			<OptionToggle
				labelledBy={labelledBy}
				value={place}
				onValueChange={(nextPlace) => onLevelChange(getCompareLevel(nextPlace, perOccupation))}
				options={comparePlaces.map((option) => {
					const Icon = placeIcons[option];
					return {
						value: option,
						label: t(($) => $.aggregatedExposure.compare.level[option]),
						icon: <Icon aria-hidden="true" className="size-4" />,
					};
				})}
			/>
			<div className="flex items-center gap-2">
				<Checkbox
					id={perOccupationId}
					checked={perOccupation}
					onCheckedChange={(checked) => onLevelChange(getCompareLevel(place, checked === true))}
				/>
				<Label htmlFor={perOccupationId} className="font-normal">
					<UsersRound aria-hidden="true" className="size-4 text-muted-foreground" />
					{t(($) => $.aggregatedExposure.perOccupation)}
				</Label>
			</div>
		</div>
	);
}
