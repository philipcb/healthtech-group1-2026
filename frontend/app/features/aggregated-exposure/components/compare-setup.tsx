import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { CompareGroupPicker } from "@/features/aggregated-exposure/components/compare-group-picker.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { OptionToggle } from "@/features/aggregated-exposure/components/option-toggle.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	type ComparableGroup,
	type ComparedEntry,
	type CompareLevel,
	comparePlaces,
	getCompareLevel,
	getComparePlace,
	isPerOccupation,
} from "@/features/aggregated-exposure/model/compare.ts";
import type { PeriodSelection } from "@/features/aggregated-exposure/model/period.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { Factory, MapPin, UsersRound } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type CompareSetupProps = {
	exposure: Exposure;
	onExposureChange: (exposure: Exposure) => void;
	dustField: DustField;
	onDustFieldChange: (dustField: DustField) => void;
	level: CompareLevel;
	onLevelChange: (level: CompareLevel) => void;
	yards: Array<string>;
	selectedYard: string | null;
	onYardChange: (yard: string | null) => void;
	entries: Array<ComparedEntry>;
	options: Array<ComparableGroup>;
	isLoading: boolean;
	onAdd: (groupIds: Array<string>) => void;
	onRemove: (groupId: string) => void;
	onClear: () => void;
	lastChange?: { message: string; undo: () => void };
	hiddenFromLink: number;
	periodSelection: PeriodSelection;
};

export function CompareSetup({
	exposure,
	onExposureChange,
	dustField,
	onDustFieldChange,
	level,
	onLevelChange,
	yards,
	selectedYard,
	onYardChange,
	entries,
	options,
	isLoading,
	onAdd,
	onRemove,
	onClear,
	lastChange,
	hiddenFromLink,
	periodSelection,
}: CompareSetupProps) {
	const { t } = useTranslation();
	const { YardFilter } = useDashboardScope();
	const levelLabelId = useId();
	const dialogLevelLabelId = useId();
	const groupsLabelId = useId();
	const notice = lastChange
		? { message: lastChange.message, onUndo: lastChange.undo }
		: hiddenFromLink > 0
			? { message: t(($) => $.aggregatedExposure.compare.picker.hiddenFromLink, { count: hiddenFromLink }) }
			: undefined;

	return (
		<>
			<FilterDialog periodSelection={periodSelection} showsPeriod={true} className="sm:hidden">
				{YardFilter && <YardFilter yards={yards} value={selectedYard} onValueChange={onYardChange} />}
				<div className="flex flex-col gap-1.5">
					<p id={dialogLevelLabelId} className="font-medium text-sm">
						{t(($) => $.aggregatedExposure.compare.level.label)}
					</p>
					<LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={dialogLevelLabelId} />
				</div>
			</FilterDialog>

			<section
				aria-label={t(($) => $.aggregatedExposure.compare.setupLabel)}
				className="grid gap-x-4 gap-y-3 rounded-xl border bg-card p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start"
			>
				<p aria-hidden="true" className="font-medium text-sm sm:pt-2">
					{t(($) => $.aggregatedExposure.exposureLabel)}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<ExposureToggle
						label={t(($) => $.aggregatedExposure.exposureLabel)}
						hidesLabel={true}
						value={exposure}
						onValueChange={onExposureChange}
					/>
					{exposure === "dust" && (
						<DustFieldTabs
							value={dustField}
							onValueChange={onDustFieldChange}
							ariaLabel={t(($) => $.aggregatedExposure.group.dustFieldLabel)}
						/>
					)}
				</div>

				{YardFilter && (
					<>
						<p aria-hidden="true" className="hidden font-medium text-sm sm:block sm:pt-2">
							{t(($) => $.aggregatedExposure.filters.yard)}
						</p>
						<div className="hidden sm:block">
							<YardFilter
								yards={yards}
								value={selectedYard}
								onValueChange={onYardChange}
								hidesLabel={true}
							/>
						</div>
					</>
				)}

				<p id={levelLabelId} className="hidden font-medium text-sm sm:block sm:pt-2">
					{t(($) => $.aggregatedExposure.compare.level.label)}
				</p>
				<div className="hidden sm:block">
					<LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={levelLabelId} />
				</div>

				<div className="flex flex-col gap-1 sm:pt-1.5">
					<p id={groupsLabelId} className="font-medium text-sm">
						{t(($) => $.aggregatedExposure.compare.picker.label)}
					</p>
					<p className="text-muted-foreground text-xs sm:hidden">
						{t(($) => $.aggregatedExposure.compare.level.current, {
							level: t(($) => $.aggregatedExposure.compare.level[level]),
						})}
					</p>
				</div>
				<CompareGroupPicker
					options={options}
					entries={entries}
					isLoading={isLoading}
					onAdd={onAdd}
					onRemove={onRemove}
					onClear={onClear}
					notice={notice}
					labelledBy={groupsLabelId}
				/>
			</section>
		</>
	);
}

const placeIcons = { yard: MapPin, hall: Factory };

function LevelPicker({
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
					{t(($) => $.aggregatedExposure.compare.level.perOccupation)}
				</Label>
			</div>
		</div>
	);
}
