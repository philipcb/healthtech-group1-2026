import { Button } from "@/components/ui/button.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { TIMEZONE } from "@/i18n/locale.ts";
import { today } from "@/lib/date.ts";
import { cn } from "@/lib/utils.ts";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";
import { isAfter, isBefore, isEqual, isSameMonth, isSameWeek, isToday } from "date-fns";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDate } from "../date-picker/use-date.ts";
import { useView } from "./use-view.ts";
import { DayViewIcon, MonthViewIcon, WeekViewIcon } from "./views.ts";

interface ViewPickerProps {
	withNavigationButtons?: boolean;
	className?: string;
	allowedViews?: Array<View>;
	minDate?: TZDate;
	maxDate?: TZDate;
}

export function ViewPicker({
	className,
	withNavigationButtons = false,
	allowedViews,
	minDate,
	maxDate,
}: ViewPickerProps) {
	const { view, setView } = useView();
	const { date, navigate, setDate } = useDate();
	const { t } = useTranslation();
	const views = allowedViews ?? ["day", "week", "month"];

	const previousTarget = minDate && isBefore(navigate.previousValue, minDate) ? minDate : navigate.previousValue;
	const nextTarget = maxDate && isAfter(navigate.nextValue, maxDate) ? maxDate : navigate.nextValue;

	const canNavigatePrevious = !isEqual(previousTarget, date);
	const canNavigateNext = !isEqual(nextTarget, date);

	const isCurrentPeriod =
		view === "day"
			? isToday(date, { in: TIMEZONE })
			: view === "week"
				? isSameWeek(date, today(), { weekStartsOn: 1, in: TIMEZONE })
				: isSameMonth(date, today(), { in: TIMEZONE });

	const previousString = t(($) => $.viewPicker.previousPeriod[view]);
	const currentString = t(($) => $.viewPicker.current[view]);
	const nextString = t(($) => $.viewPicker.nextPeriod[view]);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex justify-center">
				<ToggleGroup
					type="single"
					value={view}
					variant="outline"
					className={cn("inline-grid w-full auto-cols-fr grid-flow-col", className)}
					onValueChange={(value: View) => {
						// Value is an empty string when clicking the already selected item, so we need this check to avoid
						// deselecting.
						if (value) {
							setView(value);
						}
					}}
				>
					{views.includes("day") && (
						<ToggleGroupItem value="day" aria-label={t(($) => $.views.day)}>
							<div className="flex items-center gap-2">
								<DayViewIcon className="size-4" />
								<p className="text-sm">{t(($) => $.views.day)}</p>
							</div>
						</ToggleGroupItem>
					)}

					{views.includes("week") && (
						<ToggleGroupItem value="week" aria-label={t(($) => $.views.week)}>
							<div className="flex items-center gap-2">
								<WeekViewIcon className="size-4" />
								<p className="text-sm">{t(($) => $.views.week)}</p>
							</div>
						</ToggleGroupItem>
					)}

					{views.includes("month") && (
						<ToggleGroupItem value="month" aria-label={t(($) => $.views.month)}>
							<div className="flex items-center gap-2">
								<MonthViewIcon className="size-4" />
								<p className="text-sm">{t(($) => $.views.month)}</p>
							</div>
						</ToggleGroupItem>
					)}
				</ToggleGroup>
			</div>

			{withNavigationButtons && (
				<div className="flex items-center justify-center gap-1">
					<Button
						title={previousString}
						aria-label={previousString}
						size="icon-sm"
						variant="ghost"
						onClick={() => setDate(previousTarget)}
						disabled={!canNavigatePrevious}
					>
						<ChevronLeftIcon className="size-4" />
					</Button>

					<Button
						size="sm"
						variant="ghost"
						className="min-w-0"
						onClick={() => setDate(today())}
						disabled={isCurrentPeriod}
					>
						<CalendarIcon className="size-3.5 shrink-0" />
						<span className="truncate">{currentString}</span>
					</Button>

					<Button
						title={nextString}
						aria-label={nextString}
						size="icon-sm"
						variant="ghost"
						onClick={() => setDate(nextTarget)}
						disabled={!canNavigateNext}
					>
						<ChevronRightIcon className="size-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
