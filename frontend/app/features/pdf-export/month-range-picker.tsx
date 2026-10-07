import { Button } from "@/components/ui/button.tsx";
import { TIMEZONE, TIMEZONE_NAME } from "@/i18n/locale.ts";
import { MAX_PERIOD_MONTHS, type PdfPeriod } from "@/lib/pdf/period.ts";
import { TZDate } from "@date-fns/tz";
import { addMonths, differenceInCalendarMonths, getYear, startOfMonth } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface MonthRangePickerProps {
	value: PdfPeriod;
	onChange: (period: PdfPeriod) => void;
}

/**
 * Picks a period of whole months: a year stepper above a grid of the year's
 * months. The first click picks the start month, the second the end month.
 * The pending start survives stepping between years, so a period can span
 * several. Clicking a month before the start begins a new selection instead.
 */
export function MonthRangePicker({ value, onChange }: MonthRangePickerProps) {
	const { t, i18n } = useTranslation();
	const [shownYear, setShownYear] = useState(() => getYear(value.endMonth, { in: TIMEZONE }));
	// Set between the first and the second click: the start month waiting for its end.
	const [pendingStart, setPendingStart] = useState<TZDate | null>(null);
	const [hoveredMonth, setHoveredMonth] = useState<TZDate | null>(null);

	const currentMonth = startOfMonth(TIMEZONE(new Date()), { in: TIMEZONE });
	const months = Array.from({ length: 12 }, (_, i) => new TZDate(shownYear, i, 1, TIMEZONE_NAME));

	// Future months have no data yet. While picking the end, months that would
	// make the period longer than the maximum are off limits too.
	const isDisabled = (month: TZDate) =>
		month > currentMonth || (pendingStart !== null && month > addMonths(pendingStart, MAX_PERIOD_MONTHS - 1));

	const handleClick = (month: TZDate) => {
		if (pendingStart === null || month < pendingStart) {
			setPendingStart(month);
			onChange({ startMonth: month, endMonth: month });
			return;
		}
		setPendingStart(null);
		onChange({ startMonth: pendingStart, endMonth: month });
	};

	// While picking the end, highlight the period up to the hovered month.
	const shown =
		pendingStart && hoveredMonth && hoveredMonth >= pendingStart && !isDisabled(hoveredMonth)
			? { startMonth: pendingStart, endMonth: hoveredMonth }
			: value;
	const shownStart = startOfMonth(shown.startMonth, { in: TIMEZONE }).getTime();
	const shownEnd = startOfMonth(shown.endMonth, { in: TIMEZONE }).getTime();

	// Norwegian month names are lowercase.
	const formatMonth = (month: TZDate, options: Intl.DateTimeFormatOptions) => {
		const text = month.toLocaleDateString(i18n.language, options);
		return text.charAt(0).toLocaleUpperCase(i18n.language) + text.slice(1);
	};

	const monthCount = differenceInCalendarMonths(value.endMonth, value.startMonth, { in: TIMEZONE }) + 1;
	const startText = formatMonth(value.startMonth, { month: "long", year: "numeric" });
	const endText = formatMonth(value.endMonth, { month: "long", year: "numeric" });
	const periodText = monthCount === 1 ? startText : `${startText} – ${endText}`;

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center justify-between">
				<Button
					title={t(($) => $.viewPicker.previous)}
					size="icon-sm"
					variant="ghost"
					onClick={() => setShownYear((year) => year - 1)}
				>
					<ChevronLeftIcon />
				</Button>
				<span className="font-semibold text-lg tabular-nums">{shownYear}</span>
				<Button
					title={t(($) => $.viewPicker.next)}
					size="icon-sm"
					variant="ghost"
					onClick={() => setShownYear((year) => year + 1)}
					disabled={shownYear >= getYear(currentMonth)}
				>
					<ChevronRightIcon />
				</Button>
			</div>

			<div className="grid grid-cols-4 gap-1">
				{months.map((month) => {
					const time = month.getTime();
					const isEndpoint = time === shownStart || time === shownEnd;
					const isInside = time > shownStart && time < shownEnd;
					return (
						<Button
							key={time}
							variant={isEndpoint ? "default" : isInside ? "secondary" : "ghost"}
							aria-pressed={isEndpoint || isInside}
							disabled={isDisabled(month)}
							onClick={() => handleClick(month)}
							onMouseEnter={() => setHoveredMonth(month)}
							onMouseLeave={() => setHoveredMonth(null)}
						>
							{formatMonth(month, { month: "short" })}
						</Button>
					);
				})}
			</div>

			<p className="text-center text-muted-foreground text-sm">
				{pendingStart
					? t(($) => $.pdf.chooseEndMonth, { years: MAX_PERIOD_MONTHS / 12 })
					: `${periodText} (${t(($) => $.pdf.periodMonthCount, { count: monthCount })})`}
			</p>
		</div>
	);
}
