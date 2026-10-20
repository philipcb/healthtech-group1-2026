import type { DustField, Exposure } from "@/lib/exposures.ts";

export type SummaryMetric = { exposure: Exposure; field?: DustField; label: string };

export const PERIOD_SUMMARY_METRICS: Array<SummaryMetric> = [
	{ exposure: "dust", field: "pm1_twa", label: "PM1" },
	{ exposure: "dust", field: "pm25_twa", label: "PM2.5" },
	{ exposure: "dust", field: "pm10_twa", label: "PM10" },
	{ exposure: "noise", label: "Noise" },
	{ exposure: "vibration", label: "Vibration" },
];

/**
 * Trend charts: the first one sits under the summary table, the rest go
 * TREND_CHARTS_PER_PAGE per page. Only metrics for the exported exposure types are included.
 */
export const TREND_CHARTS_PER_PAGE = 2;

export function getTrendMetrics(exposures: Array<Exposure>): Array<SummaryMetric> {
	return PERIOD_SUMMARY_METRICS.filter((metric) => exposures.includes(metric.exposure));
}

/** Number of period-trend page specs (the one under the table counts as one). */
export function getTrendPageCount(chartCount: number): number {
	return chartCount === 0 ? 0 : 1 + Math.ceil((chartCount - 1) / TREND_CHARTS_PER_PAGE);
}
