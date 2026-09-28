import { DangerLevelDots } from "@/components/danger-level-dots.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { dangerlevelStyles } from "@/lib/danger-levels.ts";
import type { TimeBucketStatus } from "@/lib/time-bucket-types.ts";
import { cn } from "@/lib/utils.ts";
import { getUnixTime, isToday, startOfHour } from "date-fns";
import { useView } from "../views/use-view.ts";
import { useWeekTimeGrid } from "./use-week-time-grid.ts";

// ensure alignment between time-labels and hour slots
const ROW_HEIGHT = "h-9";
const CELL_GAP = "gap-y-1";
const HEADER_HEIGHT = "h-10 sm:h-6";
const PADDING_Y = "py-1.5";

interface WeekWidgetProps {
	dayStartHour?: number;
	dayEndHour?: number;
	data: Array<TimeBucketStatus>;
	selectedDate?: Date;
	className?: string;
}

export function WeekWidget({ dayStartHour = 8, dayEndHour = 16, data, selectedDate, className }: WeekWidgetProps) {
	const formatDate = useFormatDate();
	const { date: contextDate, setDate } = useDate();
	const { setView } = useView();
	const displayedDate = selectedDate ?? contextDate;

	const { timeSlotSegments, timeBucketsByHour } = useWeekTimeGrid({
		displayedDate,
		dayStartHour,
		dayEndHour,
		data,
	});

	const handleHourClick = (date: TimeBucketStatus["time"]) => {
		setDate(date);
		setView("day");
	};

	return (
		<div className="overflow-hidden">
			<div className="isolate overflow-x-auto">
				<div className={cn("flex", className)}>
					{/* Time-label column */}
					<div className={cn("flex shrink-0 flex-col", CELL_GAP, PADDING_Y)}>
						{/* empty div because the time label column has no header */}
						<div className={HEADER_HEIGHT} />

						{timeSlotSegments[0].timeSlots.map((slot) => (
							<div key={`time-${getUnixTime(slot)}`} className={cn("pr-1 leading-0", ROW_HEIGHT)}>
								<span className="text-muted-foreground text-xs tabular-nums">
									{formatDate(slot, "HH:mm")}
								</span>
							</div>
						))}
					</div>

					{/* Day columns */}
					{timeSlotSegments.map((segment) => {
						const formattedDate = formatDate(segment.date, "yyyy-MM-dd");
						const today = isToday(segment.date);
						const weekday = formatDate(segment.date, "EEE");
						const weekdayLetter = formatDate(segment.date, "EEEEE");
						const dayNumber = formatDate(segment.date, "dd");

						return (
							<button
								key={getUnixTime(segment.date)}
								type="button"
								className={cn(
									"flex min-w-0 flex-1 flex-col rounded-xl p-1 text-left sm:min-w-20 sm:p-1.5",
									"cursor-pointer transition-colors hover:bg-secondary",
									CELL_GAP,
								)}
								onClick={() => handleHourClick(segment.date)}
								aria-label={`View day details for ${formattedDate}`}
							>
								<DayColumnHeader
									weekday={weekday}
									weekdayLetter={weekdayLetter}
									dayNumber={dayNumber}
									today={today}
								/>

								{/* Cells */}
								{segment.timeSlots.map((timeSlot, timeSlotIndex) => {
									const isFirstRow = timeSlotIndex === 0;
									const isLastRow = timeSlotIndex === segment.timeSlots.length - 1;
									const timeBucket = timeBucketsByHour.get(startOfHour(timeSlot).getTime());

									return (
										<Cell
											key={getUnixTime(timeSlot)}
											timeBucket={timeBucket}
											isFirstRow={isFirstRow}
											isLastRow={isLastRow}
										/>
									);
								})}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

interface DayColumnHeaderProps {
	weekday: string;
	weekdayLetter: string;
	dayNumber: string;
	today: boolean;
}

function DayColumnHeader({ weekday, weekdayLetter, dayNumber, today }: DayColumnHeaderProps) {
	const textColor = !today && "text-muted-foreground";

	return (
		<div className={cn("flex items-center justify-center px-1 text-xs sm:text-sm", HEADER_HEIGHT)}>
			<div className={cn("flex flex-col items-center justify-center gap-0.5 sm:hidden", textColor)}>
				<span className={cn(today && "font-semibold")}>{weekdayLetter}</span>
				<span
					className={cn(
						today && ["flex size-5 items-center justify-center rounded-full", "bg-foreground text-secondary"],
					)}
				>
					{dayNumber}
				</span>
			</div>

			<p className={cn("hidden items-center justify-center sm:flex", textColor, today && "font-semibold")}>
				{weekday}{" "}
				<span
					className={cn(
						"ml-1.5",
						today && ["flex size-6 items-center justify-center rounded-full", "bg-foreground text-secondary"],
					)}
				>
					{dayNumber}
				</span>
			</p>
		</div>
	);
}

interface CellProps {
	isFirstRow: boolean;
	isLastRow: boolean;
	timeBucket: TimeBucketStatus | undefined;
}

function Cell({ isFirstRow, isLastRow, timeBucket }: CellProps) {
	const dangerLevel = timeBucket?.dangerLevel;

	return (
		<div
			className={cn(
				"relative rounded-md border",
				isFirstRow && "rounded-t-xl",
				isLastRow && "rounded-b-xl",
				ROW_HEIGHT,
				dangerLevel && [dangerlevelStyles[dangerLevel].bgSubtle, dangerlevelStyles[dangerLevel].border],
			)}
		>
			{dangerLevel && <DangerLevelDots dangerLevel={dangerLevel} className="absolute right-1 bottom-1" />}
		</div>
	);
}
