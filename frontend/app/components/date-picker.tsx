import { TIMEZONE, TIMEZONE_NAME } from "@/i18n/locale.ts";
import { cn } from "@/lib/utils.ts";
import { Calendar } from "@/ui/calendar.tsx";
import { TZDate } from "@date-fns/tz";
import { addMonths, addWeeks, startOfMonth, startOfWeek, subMilliseconds } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DayPickerProps } from "react-day-picker";
import { useTranslation } from "react-i18next";

type DatePickerProps = Omit<
	DayPickerProps,
	"mode" | "required" | "defaultMonth" | "onSelect" | "selected" | "timeZone" | "weekStartsOn"
> & {
	onDateChange: (date: TZDate) => void;
	date: TZDate;
	mode?: "day" | "week" | "month";
};

export function DatePicker({ mode = "day", date, onDateChange, locale, className, ...props }: DatePickerProps) {
	const { i18n } = useTranslation();

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

	return (
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
			modifiersClassNames={{
				today: "[&>button]:font-bold",
				...modifiersClassNames,
			}}
			{...calendarProps}
		/>
	);
}
