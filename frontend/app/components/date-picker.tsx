import { useFormatDate } from "@/hooks/use-format-date.ts";
import { TIMEZONE, TIMEZONE_NAME } from "@/i18n/locale.ts";
import { cn } from "@/lib/utils.ts";
import { buttonVariants } from "@/ui/button.tsx";
import { Calendar, CalendarDayButton } from "@/ui/calendar.tsx";
import { TZDate } from "@date-fns/tz";
import { addMonths, addWeeks, startOfMonth, startOfWeek, subMilliseconds } from "date-fns";
import { type ComponentProps, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type DayButton, type DayPickerProps, useDayPicker, type WeekNumberProps } from "react-day-picker";
import { useTranslation } from "react-i18next";

type DatePickerProps = Omit<
	DayPickerProps,
	"mode" | "required" | "defaultMonth" | "onSelect" | "selected" | "timeZone" | "weekStartsOn"
> & {
	onDateChange: (date: TZDate) => void;
	date: TZDate;
	mode?: "day" | "week" | "month";
	withFooter?: boolean;
	// Makes the week numbers clickable. Called with the week's first selectable day in the shown month.
	onWeekSelect?: (date: TZDate) => void;
};

// In week and month mode the whole period is the selection, so the clicked day must not also look selected. The cell
// keeps aria-selected; only the day's own highlight is dropped.
function PeriodDayButton({ modifiers, ...props }: ComponentProps<typeof DayButton>) {
	return <CalendarDayButton modifiers={{ ...modifiers, selected: false }} {...props} />;
}

const WeekSelectContext = createContext<((date: TZDate) => void) | null>(null);

// Picks the week's first day inside the shown month, so a week starting in the previous month doesn't flip the calendar
// back a month. Weeks with no selectable day (outside min/max dates) can't be clicked.
function SelectableWeekNumber({ week, children, ...props }: WeekNumberProps) {
	const { t } = useTranslation();
	const { getModifiers } = useDayPicker();
	const onWeekSelect = useContext(WeekSelectContext);

	if (!onWeekSelect) {
		return (
			<td {...props}>
				<div className="flex size-(--cell-size) h-full items-center justify-center text-center">{children}</div>
			</td>
		);
	}

	const day = week.days.find((weekDay) => !(weekDay.outside || getModifiers(weekDay).disabled));

	return (
		<td {...props}>
			<button
				type="button"
				disabled={!day}
				aria-label={t(($) => $.datePicker.selectWeek, { week: week.weekNumber })}
				onClick={() => day && onWeekSelect(new TZDate(day.date, TIMEZONE_NAME))}
				className={cn(
					buttonVariants({ variant: "ghost", size: "icon" }),
					"size-(--cell-size) font-normal text-[0.8rem] text-muted-foreground",
				)}
			>
				{children}
			</button>
		</td>
	);
}

export function DatePicker({
	mode = "day",
	date,
	onDateChange,
	locale,
	className,
	withFooter = true,
	onWeekSelect,
	...props
}: DatePickerProps) {
	const formatDate = useFormatDate();
	const { t, i18n } = useTranslation();

	const [month, setMonth] = useState<Date>(date);

	useEffect(() => {
		if (!date) {
			return;
		}

		setMonth(date);
	}, [date]);

	const rangeStart = useMemo(() => {
		if (mode === "day") {
			return undefined;
		}

		if (mode === "week") {
			return startOfWeek(date, { weekStartsOn: 1, in: TIMEZONE });
		}

		return startOfMonth(date, { in: TIMEZONE });
	}, [mode, date]);

	const rangeEnd = useMemo(() => {
		if (mode === "day" || !rangeStart) {
			return undefined;
		}

		const addFn = mode === "week" ? addWeeks : addMonths;

		return subMilliseconds(addFn(rangeStart, 1, { in: TIMEZONE }), 1);
	}, [mode, rangeStart]);

	const handleDayClick = useCallback(
		(clickedDate: Date) => {
			const tzDate = new TZDate(clickedDate, TIMEZONE_NAME);

			onDateChange(tzDate);
		},
		[onDateChange],
	);

	const calendarProps = {
		locale: locale || { code: i18n.language },
		defaultMonth: date,
		timeZone: TIMEZONE_NAME,
		weekStartsOn: 1,
		...props,
	} as const satisfies Partial<DayPickerProps>;

	const modifiers =
		mode === "day"
			? undefined
			: {
					highlighted: { from: rangeStart, to: rangeEnd },
					rangeStart: rangeStart ?? false,
					rangeEnd: rangeEnd ?? false,
				};

	const modifiersClassNames =
		mode === "day"
			? undefined
			: {
					highlighted: "bg-accent text-accent-foreground",
					rangeStart: "rounded-l-xl",
					rangeEnd: "rounded-r-xl",
				};

	const selectionDetail = formatSelection(
		rangeStart && rangeEnd ? [rangeStart, rangeEnd] : date,
		i18n.language,
		formatDate,
	);

	const selectionRecap = selectionDetail.date
		? t(($) => $.views.dateSelectionSingle, { date: selectionDetail.date })
		: t(($) => $.views.dateSelectionMultiple, {
				startDate: selectionDetail.startDate,
				endDate: selectionDetail.endDate,
			});

	return (
		<WeekSelectContext value={onWeekSelect ?? null}>
			<Calendar
				mode="single"
				className={cn("w-65 bg-transparent p-0", className)}
				required={true}
				month={month}
				onMonthChange={(monthDate) => setMonth(monthDate)}
				selected={date}
				onSelect={handleDayClick}
				modifiers={modifiers}
				captionLayout="dropdown"
				components={{
					WeekNumber: SelectableWeekNumber,
					...(mode === "day" ? {} : { DayButton: PeriodDayButton }),
				}}
				modifiersClassNames={{
					today: "[&>button]:font-bold",
					...modifiersClassNames,
				}}
				footer={
					withFooter ? (
						<p className="mt-2 text-wrap text-muted-foreground text-xs">{selectionRecap}</p>
					) : undefined
				}
				{...calendarProps}
			/>
		</WeekSelectContext>
	);
}

function formatSelection(
	dates: TZDate | [TZDate, TZDate],
	locale: string,
	formatDate: ReturnType<typeof useFormatDate>,
) {
	const isEn = locale === "en";

	if (!Array.isArray(dates)) {
		return {
			date: formatDate(dates, isEn ? "MMM d, yyyy" : "d. MMM yyyy"),
		};
	}

	const [start, end] = dates;

	const startStr = formatDate(start, isEn ? "MMM d" : "d. MMM");
	const endStr = formatDate(end, isEn ? "MMM d, yyyy" : "d. MMM yyyy");

	return { startDate: startStr, endDate: endStr };
}
