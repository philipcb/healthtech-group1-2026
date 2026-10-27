import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { CompareGroupPicker } from "@/features/aggregated-exposure/components/compare-group-picker.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterPanel, FilterRow } from "@/features/aggregated-exposure/components/filter-panel.tsx";
import type { ComparableGroup, ComparedEntry, CompareLevel } from "@/features/aggregated-exposure/model/compare.ts";
import type { PeriodSelection } from "@/features/aggregated-exposure/model/period.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
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
	const notice = lastChange
		? { message: lastChange.message, onUndo: lastChange.undo }
		: hiddenFromLink > 0
			? { message: t(($) => $.aggregatedExposure.compare.picker.hiddenFromLink, { count: hiddenFromLink }) }
			: undefined;

	return (
		<FilterPanel
			label={t(($) => $.aggregatedExposure.compare.setupLabel)}
			periodSelection={periodSelection}
			exposure={
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
			}
			yards={yards}
			selectedYard={selectedYard}
			onYardChange={onYardChange}
			levelLabel={t(($) => $.aggregatedExposure.compare.level.label)}
			level={level}
			onLevelChange={onLevelChange}
		>
			<FilterRow
				label={t(($) => $.aggregatedExposure.compare.picker.label)}
				hint={t(($) => $.aggregatedExposure.compare.level.current, {
					level: t(($) => $.aggregatedExposure.compare.level[level]),
				})}
			>
				{(labelId) => (
					<CompareGroupPicker
						options={options}
						entries={entries}
						isLoading={isLoading}
						onAdd={onAdd}
						onRemove={onRemove}
						onClear={onClear}
						notice={notice}
						labelledBy={labelId}
					/>
				)}
			</FilterRow>
		</FilterPanel>
	);
}
