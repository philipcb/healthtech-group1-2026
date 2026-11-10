import { formatGroupNumber } from "@/features/aggregated-exposure/model/groups.ts";
import { TIMEZONE, TIMEZONE_NAME } from "@/i18n/locale.ts";
import type { TrendPointDto } from "@/lib/api/generated/models/index.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";
import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, eachMonthOfInterval, max, startOfDay } from "date-fns";

const Y_AXIS_PADDING = 0.1;
const MAX_DAYS_WITH_DAY_TICKS = 62;
// The room the comparison chart keeps right of its plot, for the groups' names at the end of their lines
const END_LABEL_WIDTH = 160;

/** The comparison chart's right margin. Phones have no room for the names, so they're listed above the chart, with the values, instead. */
export function getComparisonChartMarginRight(isMobile: boolean) {
	return isMobile ? 0 : END_LABEL_WIDTH;
}

// The backend sends each day as its midnight in Oslo, which is the start of the day in the app's time zone
export function toTrendDay(time: Date) {
	return startOfDay(time, { in: TIMEZONE });
}

/** A point's place on a chart's time axis: its hour when the chart shows one day, otherwise its day */
export function toTrendTime(time: Date, day: Date | undefined) {
	return day === undefined ? toTrendDay(time) : time;
}

const HOURS_BETWEEN_TICKS = 3;

/**
 * Every few hours of one day in Norwegian time, from midnight to the next midnight. Made from the day's local hours, so
 * the ticks stay on whole local hours on the days daylight saving time starts or ends, which are 23 and 25 hours long.
 */
export function getHourTicks(day: Date, hoursBetweenTicks = HOURS_BETWEEN_TICKS) {
	return Array.from({ length: 24 / hoursBetweenTicks + 1 }, (_, index) =>
		new TZDate(
			day.getFullYear(),
			day.getMonth(),
			day.getDate(),
			index * hoursBetweenTicks,
			TIMEZONE_NAME,
		).getTime(),
	);
}

export function getTrendTicks(timestamps: Array<number>) {
	const firstDay = timestamps[0] ?? 0;
	const lastDay = timestamps.at(-1) ?? 0;
	const showsMonths = differenceInCalendarDays(lastDay, firstDay, { in: TIMEZONE }) > MAX_DAYS_WITH_DAY_TICKS;
	const ticks = showsMonths
		? eachMonthOfInterval({ start: firstDay, end: lastDay }, { in: TIMEZONE }).map((month) =>
				max([month, firstDay]).getTime(),
			)
		: timestamps;

	return { ticks, showsMonths };
}

export function getTrendYDomain(values: Array<number>, threshold: Threshold | null): [number, number] {
	const scaleValues = threshold === null ? values : [...values, threshold.warning, threshold.danger];

	return [Math.min(...scaleValues) * (1 - Y_AXIS_PADDING), Math.max(...scaleValues) * (1 + Y_AXIS_PADDING)];
}

export function formatTrendTick(value: number, unit: ExposureUnit) {
	return formatGroupNumber(value, unit, value < 10 ? 1 : 0);
}

export function countHiddenDays(points: Array<TrendPointDto>) {
	return points.filter((point) => point.value === null).length;
}

export function fillTrendGaps(
	values: Array<number | null | undefined>,
	timestamps: Array<number>,
	bridgesHidden: boolean,
): Array<number | null> {
	const isAnchor = (value: number | null | undefined) =>
		bridgesHidden ? typeof value === "number" : value !== undefined;

	return values.map((value, index) => {
		if (typeof value === "number") return value;
		if (value === null && !bridgesHidden) return null;

		const previous = values.findLastIndex(
			(candidate, candidateIndex) => candidateIndex < index && isAnchor(candidate),
		);
		const next = values.findIndex((candidate, candidateIndex) => candidateIndex > index && isAnchor(candidate));
		const from = values[previous];
		const to = values[next];
		if (typeof from !== "number" || typeof to !== "number") return null;

		const share = (timestamps[index] - timestamps[previous]) / (timestamps[next] - timestamps[previous]);
		return from + (to - from) * share;
	});
}
