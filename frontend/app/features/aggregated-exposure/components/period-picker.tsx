import { DatePicker } from "@/components/date-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import {
	aggregatedExposurePeriods,
	type GroupPeriod,
	getPeriodLabel,
	getSelectableYears,
	type PeriodSelection,
} from "@/features/aggregated-exposure/model/period.ts";
import { DayViewIcon, MonthViewIcon } from "@/features/views/views.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { TIMEZONE_NAME } from "@/i18n/locale.ts";
import { today as getToday } from "@/lib/date.ts";
import { TZDate } from "@date-fns/tz";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, type LucideIcon, Rows3Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

// The operator's icons for a day and a month, and one for a year, which only the aggregated pages have
const PERIOD_ICONS = {
	day: DayViewIcon,
	month: MonthViewIcon,
	year: Rows3Icon,
} as const satisfies Record<GroupPeriod, LucideIcon>;

type PeriodPickerProps<Period extends GroupPeriod> = {
	selection: PeriodSelection<Period>;
	/** The periods the page has. Only the group page has the day period. */
	periods?: ReadonlyArray<Period>;
};

/**
 * A page's content with the period picker in a column on the right, as wide as on the operator's pages. On smaller
 * screens the picker is a button above the content.
 */
export function PeriodPickerLayout<Period extends GroupPeriod>({
	selection,
	periods,
	children,
}: PeriodPickerProps<Period> & { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_calc(var(--spacing)*73)] lg:items-start lg:gap-6">
			<aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
				<PeriodPicker selection={selection} periods={periods} />
			</aside>
			<div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">{children}</div>
		</div>
	);
}

/**
 * The aggregated pages' day, month or year, picked with the same controls, calendar and layout as the operator's date
 * and view picker (`DateAndViewPicker`). Days, months and years before the selectable ones or after today can't be
 * picked.
 */
export function PeriodPicker<Period extends GroupPeriod>({
	selection,
	// The pages without `periods` are those whose selection only has these
	periods = aggregatedExposurePeriods as ReadonlyArray<GroupPeriod> as ReadonlyArray<Period>,
}: PeriodPickerProps<Period>) {
	const { t } = useTranslation();
	const { period, setPeriod, day, setDay, month, setMonth, year, setYear } = selection;
	const today = getToday();
	const firstYear = Math.min(...getSelectableYears());
	const firstDay = new TZDate(firstYear, 0, 1, TIMEZONE_NAME);

	const pick = (date: Date) => {
		if (period === "day") {
			setDay(date.getDate());
		}
		setMonth(date.getMonth());
		setYear(date.getFullYear());
	};
	// A day, a month or a year back or forward, keeping the month for a year
	const move = (step: -1 | 1) =>
		pick(
			period === "day"
				? new TZDate(year, month, day + step, TIMEZONE_NAME)
				: period === "month"
					? new Date(year, month + step)
					: new Date(year + step, month),
		);

	const isCurrent =
		year === today.getFullYear() &&
		(period === "year" || (month === today.getMonth() && (period === "month" || day === today.getDate())));
	const isFirst = year === firstYear && (period === "year" || (month === 0 && (period === "month" || day === 1)));
	const isAfterToday =
		year > today.getFullYear() ||
		(period !== "year" &&
			year === today.getFullYear() &&
			(month > today.getMonth() || (period === "day" && month === today.getMonth() && day > today.getDate())));

	const previousString = t(($) => $.viewPicker.previous);
	const todayString = t(($) => $.viewPicker.today);
	const nextString = t(($) => $.viewPicker.next);

	const viewPicker = (
		<div className="flex flex-col gap-2">
			<div className="flex justify-center">
				<ToggleGroup
					type="single"
					value={period}
					variant="outline"
					aria-label={t(($) => $.aggregatedExposure.period.label)}
					className="inline-grid w-full auto-cols-fr grid-flow-col"
					onValueChange={(value: string) => {
						// Value is an empty string when clicking the already selected item, so we need this check to avoid
						// deselecting.
						const selectedPeriod = periods.find((candidate) => candidate === value);
						if (selectedPeriod) setPeriod(selectedPeriod);
					}}
				>
					{periods.map((value) => {
						const Icon: LucideIcon = PERIOD_ICONS[value];
						const label = t(($) => $.aggregatedExposure.period[value]);

						return (
							<ToggleGroupItem key={value} value={value} aria-label={label}>
								<div className="flex items-center gap-2">
									<Icon className="size-4" />
									<p className="text-sm">{label}</p>
								</div>
							</ToggleGroupItem>
						);
					})}
				</ToggleGroup>
			</div>

			<div className="grid grid-cols-3 items-center gap-2">
				<Button
					title={previousString}
					size="xs"
					variant="ghost"
					className="px-1!"
					onClick={() => move(-1)}
					disabled={isFirst}
				>
					<ChevronLeftIcon className="size-3.5 shrink-0" />
					<p className="truncate text-xs">{previousString}</p>
				</Button>

				<Button
					title={todayString}
					size="xs"
					variant="ghost"
					className="px-1!"
					onClick={() => pick(today)}
					disabled={isCurrent}
				>
					<CalendarIcon className="size-3.5 shrink-0" />
					<p className="truncate text-xs">{todayString}</p>
				</Button>

				<Button
					title={nextString}
					size="xs"
					variant="ghost"
					className="px-1!"
					onClick={() => move(1)}
					disabled={isCurrent || isAfterToday}
				>
					<p className="truncate text-xs">{nextString}</p>
					<ChevronRightIcon className="size-3.5 shrink-0" />
				</Button>
			</div>
		</div>
	);

	const datePicker =
		period === "year" ? (
			<YearPicker selection={selection} />
		) : period === "day" ? (
			<DatePicker
				mode="day"
				date={new TZDate(year, month, day, TIMEZONE_NAME)}
				onDateChange={pick}
				startMonth={firstDay}
				endMonth={today}
				disabled={[{ before: firstDay }, { after: today }]}
			/>
		) : (
			<DatePicker
				mode="month"
				showWeekNumber={true}
				date={new TZDate(year, month, 1, TIMEZONE_NAME)}
				onDateChange={pick}
				startMonth={firstDay}
				endMonth={today}
				disabled={[{ before: firstDay }, { after: today }]}
			/>
		);

	return (
		<>
			<div className="lg:hidden">
				<Dialog>
					{/* Shows the period, which nothing else on a smaller screen does. The accessible name keeps the action
					    and includes the visible text. */}
					<DialogTrigger asChild={true}>
						<Button variant="outline" className="w-full">
							<CalendarIcon aria-hidden="true" className="size-4" />
							<span className="sr-only">{`${t(($) => $.datePicker.openLabel)}: `}</span>
							<span className="tabular-nums">{getPeriodLabel(selection, t)}</span>
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t(($) => $.datePicker.dialogTitle)}</DialogTitle>
						</DialogHeader>
						<div className="flex flex-col gap-4">
							{viewPicker}
							<div className="flex justify-center">{datePicker}</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			<div className="hidden lg:flex lg:flex-col lg:gap-4">
				<Card muted={true}>{viewPicker}</Card>
				<Card muted={true}>{datePicker}</Card>
			</div>
		</>
	);
}

/** The selectable years in place of the calendar, with the calendar's summary of the selection under them */
function YearPicker({ selection }: { selection: Pick<PeriodSelection<GroupPeriod>, "year" | "setYear"> }) {
	const { t, i18n } = useTranslation();
	const formatDate = useFormatDate();
	const isEn = i18n.language === "en";
	const start = new TZDate(selection.year, 0, 1, TIMEZONE_NAME);
	const end = new TZDate(selection.year, 11, 31, TIMEZONE_NAME);

	return (
		<div className="flex w-65 flex-col gap-2">
			<fieldset className="grid grid-cols-3 gap-1">
				<legend className="sr-only">{t(($) => $.aggregatedExposure.period.selectYear)}</legend>
				{getSelectableYears()
					.toSorted((a, b) => a - b)
					.map((year) => (
						<Button
							key={year}
							variant={year === selection.year ? "default" : "ghost"}
							size="sm"
							aria-pressed={year === selection.year}
							className="tabular-nums"
							onClick={() => selection.setYear(year)}
						>
							{year}
						</Button>
					))}
			</fieldset>
			<p className="mt-2 text-wrap text-muted-foreground text-xs">
				{t(($) => $.views.dateSelectionMultiple, {
					startDate: formatDate(start, isEn ? "MMM d" : "d. MMM"),
					endDate: formatDate(end, isEn ? "MMM d, yyyy" : "d. MMM yyyy"),
				})}
			</p>
		</div>
	);
}
