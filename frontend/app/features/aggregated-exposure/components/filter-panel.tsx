import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { LevelPicker } from "@/features/aggregated-exposure/components/level-picker.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import type { CompareLevel } from "@/features/aggregated-exposure/model/compare.ts";
import type { PeriodSelection } from "@/features/aggregated-exposure/model/period.ts";
import { cn } from "@/lib/utils.ts";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

type FilterPanelProps = {
	label: string;
	periodSelection: PeriodSelection;
	onReset?: () => void;
	/** The exposure row, the one filter that's also shown on phones */
	exposure: FilterRowProps["children"];
	yards: Array<string>;
	selectedYard: string | null;
	onYardChange: (yard: string | null) => void;
	levelLabel: string;
	level: CompareLevel;
	onLevelChange: (level: CompareLevel) => void;
	/** The page's own filters in the dialog on phones, after the level */
	dialogFilters?: ReactNode;
	/** The page's own rows, after the level */
	children?: ReactNode;
};

/**
 * The filters the overview and compare pages share, so both pick their groups the same way. On phones the yard and level
 * move into a dialog.
 */
export function FilterPanel({
	label,
	periodSelection,
	onReset,
	exposure,
	yards,
	selectedYard,
	onYardChange,
	levelLabel,
	level,
	onLevelChange,
	dialogFilters,
	children,
}: FilterPanelProps) {
	const { t } = useTranslation();
	const { YardFilter } = useDashboardScope();
	const dialogLevelLabelId = useId();

	return (
		<>
			<FilterDialog periodSelection={periodSelection} showsPeriod={true} onReset={onReset} className="sm:hidden">
				{YardFilter && <YardFilter yards={yards} value={selectedYard} onValueChange={onYardChange} />}
				<div className="flex flex-col gap-1.5">
					<p id={dialogLevelLabelId} className="font-medium text-sm">
						{levelLabel}
					</p>
					<LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={dialogLevelLabelId} />
				</div>
				{dialogFilters}
			</FilterDialog>

			<section
				aria-label={label}
				className="grid gap-x-4 gap-y-3 rounded-xl border bg-card p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start"
			>
				<FilterRow label={t(($) => $.aggregatedExposure.exposureLabel)}>{exposure}</FilterRow>
				{YardFilter && (
					<FilterRow label={t(($) => $.aggregatedExposure.filters.yard)} hiddenOnMobile={true}>
						<YardFilter yards={yards} value={selectedYard} onValueChange={onYardChange} hidesLabel={true} />
					</FilterRow>
				)}
				<FilterRow label={levelLabel} hiddenOnMobile={true}>
					{(labelId) => <LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={labelId} />}
				</FilterRow>
				{children}
			</section>
		</>
	);
}

type FilterRowProps = {
	label: string;
	/** Shown under the label on phones only */
	hint?: string;
	hiddenOnMobile?: boolean;
	/**
	 * A function gets the label's ID, for a control that's named by the label. Otherwise the control names itself, and
	 * the label is hidden from screen readers so it isn't read twice.
	 */
	children: ReactNode | ((labelId: string) => ReactNode);
};

/** One labeled row of a `FilterPanel` */
export function FilterRow({ label, hint, hiddenOnMobile = false, children }: FilterRowProps) {
	const labelId = useId();
	const isLabelling = typeof children === "function";

	return (
		<>
			<div className={cn("flex flex-col gap-1 sm:pt-2", hiddenOnMobile && "hidden sm:flex")}>
				<p
					id={isLabelling ? labelId : undefined}
					aria-hidden={isLabelling ? undefined : true}
					className="font-medium text-sm"
				>
					{label}
				</p>
				{hint && <p className="text-muted-foreground text-xs sm:hidden">{hint}</p>}
			</div>
			<div className={cn("min-w-0", hiddenOnMobile && "hidden sm:block")}>
				{isLabelling ? children(labelId) : children}
			</div>
		</>
	);
}
