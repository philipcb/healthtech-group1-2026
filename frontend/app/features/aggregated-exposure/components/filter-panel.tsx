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
	/** The exposure filter, the one filter that's also shown on phones */
	exposure: LabelledControl;
	yards: Array<string>;
	selectedYard: string | null;
	onYardChange: (yard: string | null) => void;
	levelLabel: string;
	level: CompareLevel;
	onLevelChange: (level: CompareLevel) => void;
	/** The page's own compact filters, in the row after the yard, as they narrow the place too. In the dialog on phones */
	inlineFilters?: ReactNode;
	/** The page's own filters in the dialog on phones, after the level */
	dialogFilters?: ReactNode;
	/** The page's own rows under the filters, like the compare page's groups */
	children?: ReactNode;
};

/**
 * The filters the overview and compare pages share, so both pick their groups the same way. They sit in one row, with
 * the dropdowns named by their value, and only wrap on narrow screens. On phones the yard and level move into a dialog.
 * The row has no box of its own; only a page's rows under it, like the compare page's groups, are boxed with it.
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
	inlineFilters,
	dialogFilters,
	children,
}: FilterPanelProps) {
	const { t } = useTranslation();
	const { YardFilter } = useDashboardScope();
	const dialogLevelLabelId = useId();

	return (
		<section
			aria-label={label}
			className={cn("flex flex-col gap-3", children !== undefined && "rounded-xl border bg-card p-3")}
		>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
				<FilterDialog onReset={onReset} activeCount={activeDialogFilterCount} className="sm:hidden">
					{YardFilter && <YardFilter yards={yards} value={selectedYard} onValueChange={onYardChange} />}
					{dialogFilters}
					<div className="flex flex-col gap-1.5">
						<p id={dialogLevelLabelId} className="font-medium text-sm">
							{levelLabel}
						</p>
						<LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={dialogLevelLabelId} />
					</div>
				</FilterDialog>

				<InlineFilter label={t(($) => $.aggregatedExposure.exposureLabel)} hidesLabel={true}>
					{exposure}
				</InlineFilter>
				{YardFilter && (
					<div className="hidden sm:contents">
						<YardFilter yards={yards} value={selectedYard} onValueChange={onYardChange} hidesLabel={true} />
					</div>
				)}
				{inlineFilters && <div className="hidden sm:contents">{inlineFilters}</div>}
				<InlineFilter label={levelLabel} hiddenOnMobile={true}>
					{(labelId) => <LevelPicker level={level} onLevelChange={onLevelChange} labelledBy={labelId} />}
				</InlineFilter>
			</div>

			{children}
		</section>
	);
}

type InlineFilterProps = {
	label: string;
	/** For a control whose icons or value already say what it is. Screen readers still get the label */
	hidesLabel?: boolean;
	hiddenOnMobile?: boolean;
	children: LabelledControl;
};

/** A filter in the `FilterPanel`'s row, with its label in front of it */
function InlineFilter({ label, hidesLabel = false, hiddenOnMobile = false, children }: InlineFilterProps) {
	const labelId = useId();
	const isLabelling = typeof children === "function";

	return (
		<div className={cn("flex min-w-0 items-center gap-2", hiddenOnMobile && "hidden sm:flex")}>
			<p
				id={isLabelling ? labelId : undefined}
				aria-hidden={isLabelling ? undefined : true}
				className={hidesLabel ? "sr-only" : "text-muted-foreground text-sm"}
			>
				{label}
			</p>
			{isLabelling ? children(labelId) : children}
		</div>
	);
}

type FilterRowProps = {
	label: string;
	/** Shown under the label on phones only */
	hint?: string;
	hiddenOnMobile?: boolean;
	children: LabelledControl;
};

/** A `FilterPanel` row under the filters, for a control too big for the filter row */
export function FilterRow({ label, hint, hiddenOnMobile = false, children }: FilterRowProps) {
	const labelId = useId();
	const isLabelling = typeof children === "function";

	return (
		<div className={cn("flex min-w-0 flex-col gap-1.5 border-t pt-3", hiddenOnMobile && "hidden sm:flex")}>
			<div className="flex flex-col gap-1">
				<p
					id={isLabelling ? labelId : undefined}
					aria-hidden={isLabelling ? undefined : true}
					className="font-medium text-sm"
				>
					{label}
				</p>
				{hint && <p className="text-muted-foreground text-xs sm:hidden">{hint}</p>}
			</div>
			{isLabelling ? children(labelId) : children}
		</div>
	);
}
