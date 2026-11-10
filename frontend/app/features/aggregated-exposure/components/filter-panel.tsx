import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { LevelPicker } from "@/features/aggregated-exposure/components/level-picker.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import type { CompareLevel } from "@/features/aggregated-exposure/model/compare.ts";
import { cn } from "@/lib/utils.ts";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

/**
 * A function gets the label's ID, for a control that's named by the label. Otherwise the control names itself, and
 * the label is hidden from screen readers so it isn't read twice.
 */
type LabelledControl = ReactNode | ((labelId: string) => ReactNode);

type FilterPanelProps = {
	label: string;
	/** Puts the filters back to the defaults, from the dialog on phones */
	onReset?: () => void;
	/** How many of the filters that are in the dialog on phones aren't the defaults */
	activeDialogFilterCount?: number;
	/** The exposure row, the one filter that's also shown on phones */
	exposure: LabelledControl;
	yards: Array<string>;
	selectedYard: string | null;
	onYardChange: (yard: string | null) => void;
	levelLabel: string;
	level: CompareLevel;
	onLevelChange: (level: CompareLevel) => void;
	/** The page's own filters in the dialog on phones, after the yard, as they narrow the place too */
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
	onReset,
	activeDialogFilterCount = 0,
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

	const filterDialog = (
		<FilterPanelDialog
			onReset={onReset}
			activeCount={activeDialogFilterCount}
			yards={yards}
			selectedYard={selectedYard}
			onYardChange={onYardChange}
			levelLabel={levelLabel}
			level={level}
			onLevelChange={onLevelChange}
			dialogFilters={dialogFilters}
			className="shrink-0 sm:hidden"
		/>
	);
	// Phones: the dialog with the other filters opens from beside the exposure, so the two share one row
	const withFilterDialog = (control: ReactNode) => (
		<div className="flex items-center gap-2">
			<div className="min-w-0 grow">{control}</div>
			{filterDialog}
		</div>
	);

	return (
		// Phones: no box around the filters, so they read as the page's controls rather than one more card
		<section
			aria-label={label}
			className="grid gap-x-4 gap-y-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-y-3 sm:rounded-xl sm:border sm:bg-card sm:p-3"
		>
			{/* The exposure toggle names itself, and on phones its options say what it is */}
			<FilterRow label={t(($) => $.aggregatedExposure.exposureLabel)} hiddenLabelOnMobile={true}>
				{typeof exposure === "function"
					? (labelId) => withFilterDialog(exposure(labelId))
					: withFilterDialog(exposure)}
			</FilterRow>
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
	);
}

/** The yard and level, which are in a dialog on phones */
export function FilterPanelDialog({
	onReset,
	activeCount,
	yards,
	selectedYard,
	onYardChange,
	levelLabel,
	level,
	onLevelChange,
	dialogFilters,
	className,
}: Pick<
	FilterPanelProps,
	"onReset" | "yards" | "selectedYard" | "onYardChange" | "levelLabel" | "level" | "onLevelChange" | "dialogFilters"
> & { activeCount?: number; className?: string }) {
	const { YardFilter } = useDashboardScope();
	const levelLabelId = useId();

	return (
		<FilterDialog onReset={onReset} activeCount={activeCount} className={className}>
			{YardFilter && <YardFilter yards={yards} value={selectedYard} onValueChange={onYardChange} />}
			{dialogFilters}
			<div className="flex flex-col gap-1.5">
				<p id={levelLabelId} className="font-medium text-sm">
					{levelLabel}
				</p>
				<LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={levelLabelId} />
			</div>
		</FilterDialog>
	);
}

type FilterRowProps = {
	label: string;
	/** Shown under the label on phones only */
	hint?: string;
	hiddenOnMobile?: boolean;
	/** Only the control is shown on phones, for a control whose options already say what it is */
	hiddenLabelOnMobile?: boolean;
	children: LabelledControl;
};

/** One labeled row of a `FilterPanel` */
export function FilterRow({
	label,
	hint,
	hiddenOnMobile = false,
	hiddenLabelOnMobile = false,
	children,
}: FilterRowProps) {
	const labelId = useId();
	const isLabelling = typeof children === "function";

	return (
		<>
			<div
				className={cn(
					"flex flex-col gap-1 sm:pt-2",
					hiddenOnMobile && "hidden sm:flex",
					// Out of the layout on phones, but it still names the control for screen readers
					hiddenLabelOnMobile && "max-sm:sr-only",
				)}
			>
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
