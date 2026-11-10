import { Button } from "@/components/ui/button.tsx";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer.tsx";
import { CompareGroupPicker } from "@/features/aggregated-exposure/components/compare-group-picker.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterPanel, FilterPanelDialog, FilterRow } from "@/features/aggregated-exposure/components/filter-panel.tsx";
import type { ComparableGroup, ComparedEntry, CompareLevel } from "@/features/aggregated-exposure/model/compare.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { Plus, UsersRound } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type CompareSetupProps = {
	exposure: Exposure;
	onExposureChange: (exposure: Exposure) => void;
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
};

export function CompareSetup({
	exposure,
	onExposureChange,
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
}: CompareSetupProps) {
	const { t } = useTranslation();
	const drawerTitleId = useId();
	const notice = lastChange
		? { message: lastChange.message, onUndo: lastChange.undo }
		: hiddenFromLink > 0
			? { message: t(($) => $.aggregatedExposure.compare.picker.hiddenFromLink, { count: hiddenFromLink }) }
			: undefined;

	const exposureToggle = (
		<ExposureToggle
			label={t(($) => $.aggregatedExposure.exposureLabel)}
			hidesLabel={true}
			value={exposure}
			onValueChange={onExposureChange}
		/>
	);
	const levelLabel = t(($) => $.aggregatedExposure.compare.level.label);
	const levelHint = t(($) => $.aggregatedExposure.compare.level.current, {
		level: t(($) => $.aggregatedExposure.compare.level[level]),
	});
	const needsGroups = entries.length < 2;

	return (
		<>
			{/* Phones: the same controls as the overview, then one button that opens the groups, so the results come
			    right after them */}
			<div className="flex flex-col gap-3 sm:hidden">
				<div className="flex items-center gap-2">
					<div className="min-w-0 grow">{exposureToggle}</div>
					<FilterPanelDialog
						yards={yards}
						selectedYard={selectedYard}
						onYardChange={onYardChange}
						levelLabel={levelLabel}
						level={level}
						onLevelChange={onLevelChange}
						className="shrink-0"
					/>
				</div>
				<Drawer>
					<DrawerTrigger asChild={true}>
						{/* Filled until two groups are picked, as nothing can be compared before that */}
						<Button variant={needsGroups ? "default" : "outline"} className="w-full">
							{needsGroups ? <Plus aria-hidden="true" /> : <UsersRound aria-hidden="true" />}
							{needsGroups
								? t(($) => $.aggregatedExposure.compare.picker.add)
								: t(($) => $.aggregatedExposure.compare.picker.count, { count: entries.length })}
						</Button>
					</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader className="text-left">
							<DrawerTitle id={drawerTitleId}>
								{t(($) => $.aggregatedExposure.compare.picker.label)}
							</DrawerTitle>
							<DrawerDescription>{levelHint}</DrawerDescription>
						</DrawerHeader>
						<div className="overflow-y-auto px-4 pb-8">
							<CompareGroupPicker
								options={options}
								entries={entries}
								isLoading={isLoading}
								onAdd={onAdd}
								onRemove={onRemove}
								onClear={onClear}
								notice={notice}
								labelledBy={drawerTitleId}
							/>
						</div>
					</DrawerContent>
				</Drawer>
			</div>

			<div className="max-sm:hidden">
				<FilterPanel
					label={t(($) => $.aggregatedExposure.compare.setupLabel)}
					// The dust fraction is picked in the comparison card's header, next to the chart it changes
					exposure={exposureToggle}
					yards={yards}
					selectedYard={selectedYard}
					onYardChange={onYardChange}
					levelLabel={levelLabel}
					level={level}
					onLevelChange={onLevelChange}
				>
					<FilterRow label={t(($) => $.aggregatedExposure.compare.picker.label)} hint={levelHint}>
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
			</div>
		</>
	);
}
