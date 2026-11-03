import { formatGroupNumber } from "@/features/aggregated-exposure/model/groups.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import type { TrendPointDto } from "@/lib/api/generated/models/index.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";
import { differenceInCalendarDays, eachMonthOfInterval, max, startOfDay, startOfISOWeek, startOfMonth } from "date-fns";

const Y_AXIS_PADDING = 0.1;
const MAX_DAYS_WITH_DAY_TICKS = 62;
// The room the comparison chart keeps right of its plot, for the groups' names at the end of their lines
const END_LABEL_WIDTH = 160;

/** The comparison chart's right margin. Phones have no room for the names, so they're listed under the chart instead. */
export function getComparisonChartMarginRight(isMobile: boolean) {
	return isMobile ? 12 : END_LABEL_WIDTH;
}

// The backend sends the start of each UTC day, which is the same day in the app's time zone
export function toTrendDay(time: Date) {
	return startOfDay(time, { in: TIMEZONE });
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

function average(values: Array<number>) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function countHiddenDays(points: Array<TrendPointDto>) {
	return points.filter((point) => point.value === null).length;
}

export type ValueBucket = "week" | "month";

export function getBucketAverages(points: Array<TrendPointDto>, bucket: ValueBucket) {
	const valuesByBucket = new Map<number, Array<number | null>>();
	for (const point of points) {
		const day = toTrendDay(point.time);
		const start = (
			bucket === "week" ? startOfISOWeek(day, { in: TIMEZONE }) : startOfMonth(day, { in: TIMEZONE })
		).getTime();
		valuesByBucket.set(start, [...(valuesByBucket.get(start) ?? []), point.value]);
	}

	return new Map(
		[...valuesByBucket].map(([start, values]) => {
			const present = values.filter((value) => value !== null);
			return [start, present.length === 0 ? null : average(present)];
		}),
	);
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
