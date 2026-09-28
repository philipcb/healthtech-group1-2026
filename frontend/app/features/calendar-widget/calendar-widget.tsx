/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: CustomDay is intentionally defined inside CalendarView for prop access. */

import { DangerLevelDots } from "@/components/danger-level-dots.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { getLocale, TIMEZONE } from "@/i18n/locale.ts";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { toTZDate } from "@/lib/date.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { TimeBucketStatus } from "@/lib/time-bucket-types.ts";
import { capitalize, cn } from "@/lib/utils.ts";
import type { TZDate } from "@date-fns/tz";
import { addDays, eachDayOfInterval, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { CalendarDay, Modifiers } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { useDate } from "../date-picker/use-date.ts";
import { useView } from "../views/use-view.ts";

const WEEK_ROW_GAP = "gap-1.5 sm:gap-3";

type CalendarProps = {
	selectedDay: TZDate;
	exposureType?: Exposure;
	data: Array<TimeBucketStatus>;
	headerRight?: React.ReactNode;
};

export function CalendarWidget({ selectedDay, data }: CalendarProps) {
	const { i18n } = useTranslation();
	const { setDate } = useDate();
	const { setView } = useView();

	const safeDays = data.filter((d) => d.dangerLevel === "safe").map((d) => d.time);

	const warningDays = data.filter((d) => d.dangerLevel === "warning").map((d) => d.time);

	const dangerDays = data.filter((d) => d.dangerLevel === "danger").map((d) => d.time);

	function handleDayClick(clickedDay: TZDate) {
		const selectedDate = startOfDay(clickedDay);
		setDate(selectedDate);
		setView("day");
	}

	return (
		<div className="mx-auto w-full max-w-4xl">
			<Calendar
				locale={getLocale(i18n.language)}
				month={selectedDay}
				hideNavigation={true}
				showWeekNumber={true}
				weekStartsOn={1}
				onDayClick={(clickedDay) => handleDayClick(toTZDate(clickedDay))}
				components={{
					DayButton: (props) => <CustomDay {...props} handleDayClick={handleDayClick} data={data} />,
					Weekdays: () => <CustomWeekdays selectedDay={selectedDay} />,
				}}
				modifiers={{
					safe: safeDays,
					warning: warningDays,
					danger: dangerDays,
				}}
				className="w-full bg-transparent px-1 py-0 text-foreground sm:px-2"
				classNames={{
					week: cn("mt-3 flex w-full", WEEK_ROW_GAP),
					month_caption: "hidden",
					day: "max-h-20 relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
				}}
				captionLayout="label"
				buttonVariant="default"
				mode="single"
			/>
		</div>
	);
}

function CustomWeekdays({ selectedDay }: { selectedDay: TZDate }) {
	const formatDate = useFormatDate();

	const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
	const weekdays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

	return (
		<thead aria-hidden="true">
			<tr className={cn("flex", WEEK_ROW_GAP)}>
				{weekdays.map((day) => (
					<th
						key={day.toISOString()}
						scope="col"
						className="flex-1 select-none rounded-md font-normal text-[0.8rem] text-muted-foreground"
					>
						<span className="sm:hidden">{formatDate(day, "EEEEE")}</span>
						<span className="hidden sm:inline">{capitalize(formatDate(day, "EEEEEE"))}</span>
					</th>
				))}
			</tr>
		</thead>
	);
}

const todaySmBorderStyles: Record<DangerLevel, string> = {
	danger: "sm:border-danger-border",
	warning: "sm:border-warning-border",
	safe: "sm:border-safe-border",
};

function getDayDangerLevel(day: TZDate, data: Array<TimeBucketStatus>): DangerLevel | null {
	const dayStatus = data.find((d) => isSameDay(d.time, day, { in: TIMEZONE }));

	if (dayStatus) {
		return dayStatus.dangerLevel;
	}

	return null;
}

type CustomDayProps = {
	data: Array<TimeBucketStatus>;
	day: CalendarDay;
	modifiers: Modifiers;
	className?: string;
	handleDayClick: (day: TZDate) => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
function CustomDay({ data, day, className, handleDayClick, ...buttonProps }: CustomDayProps) {
	const dangerLevel = getDayDangerLevel(toTZDate(day.date), data);
	const disabled = dangerLevel === null;
	const isToday = buttonProps.modifiers?.today;

	const bgClassname = dangerLevel
		? cn(
				"border-2",
				dangerlevelStyles[dangerLevel].bgSubtle,
				dangerlevelStyles[dangerLevel].border,
				isToday && cn("border-black", todaySmBorderStyles[dangerLevel]),
			)
		: "";

	return (
		<button
			type="button"
			disabled={disabled}
			className={cn("relative h-full w-full rounded-lg", className)}
			{...buttonProps}
		>
			<div
				className={cn(
					"h-full w-full rounded-lg",
					!disabled && "cursor-pointer hover:brightness-85",
					bgClassname,
				)}
			/>
			<span
				className={cn(
					"pointer-events-none absolute inset-0 flex items-center justify-center text-sm",
					disabled && "text-muted-foreground",
				)}
			>
				<span className="flex flex-col items-center justify-center gap-0.5 sm:hidden">
					<span>{day.date.getDate()}</span>
					<span className="h-1 w-3" />
				</span>

				<span
					className={cn(
						"hidden size-7 items-center justify-center rounded-full sm:flex",
						isToday && "bg-foreground text-background",
					)}
				>
					{day.date.getDate()}
				</span>
			</span>

			<DangerLevelDots
				dangerLevel={dangerLevel ?? null}
				className="pointer-events-none absolute right-1 bottom-1 sm:right-2 sm:bottom-2"
			/>
		</button>
	);
}