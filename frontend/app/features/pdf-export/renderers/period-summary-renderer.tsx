import type { CollectedPage } from "@/features/pdf-export/pdf-page-spec.ts";
import { PAGE_KEYS } from "@/features/pdf-export/renderers/page-keys.ts";
import { PERIOD_SUMMARY_METRICS } from "@/features/pdf-export/renderers/period-metrics.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { getPeriodMonths, getSummaryPeriod, type PdfPeriod } from "@/lib/pdf/period.ts";
import { useQueries } from "@tanstack/react-query";
import { differenceInCalendarDays, endOfMonth } from "date-fns";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/** Fetches the selected period and aggregates all summary metrics before export. */
export function PeriodSummaryRenderer({
	period,
	userId,
	exposures,
	onPageReady,
}: {
	period: PdfPeriod;
	userId: string;
	exposures: Array<Exposure>;
	onPageReady: (page: CollectedPage) => void;
}) {
	const { i18n } = useTranslation();
	const { periodStart, periodEnd } = getSummaryPeriod(period);
	const months = getPeriodMonths(period);
	const dayQueries = useQueries({
		queries: PERIOD_SUMMARY_METRICS.flatMap((metric) =>
			months.map((month) =>
				exposureQueryOptions({
					exposure: metric.exposure,
					enabled: exposures.includes(metric.exposure) && month <= periodEnd,
					query: buildExposureQuery(metric.exposure, "day", periodStart, {
						field: metric.field,
						granularity: "day",
						startTime: month,
						endTime:
							endOfMonth(month, { in: TIMEZONE }) < periodEnd
								? endOfMonth(month, { in: TIMEZONE })
								: periodEnd,
					}),
					userId,
				}),
			),
		),
	});
	const averageQueries = useQueries({
		queries: PERIOD_SUMMARY_METRICS.map((metric) =>
			exposureQueryOptions({
				exposure: metric.exposure,
				enabled: exposures.includes(metric.exposure),
				query: buildExposureQuery(metric.exposure, "day", periodStart, {
					field: metric.field,
					granularity: "minute",
					startTime: periodStart,
					endTime: periodEnd,
				}),
				userId,
			}),
		),
	});
	const isLoading = [...dayQueries, ...averageQueries].some((query) => query.isLoading);
	const hasReportedRef = useRef(false);

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		hasReportedRef.current = true;
		const rows = exposures.map((exposure) => ({
			exposure,
			metrics: PERIOD_SUMMARY_METRICS.filter((metric) => metric.exposure === exposure).map((metric) => {
				const metricIndex = PERIOD_SUMMARY_METRICS.indexOf(metric);
				const monthly = months.map(
					(_month, monthIndex) => dayQueries[metricIndex * months.length + monthIndex].data?.data ?? [],
				);
				const allDays = monthly.flat();
				const monthRedDays = monthly.map(
					(data) => data.filter((point) => point.dangerLevel === "danger").length,
				);
				const worstMonthIndex = monthRedDays.reduce(
					(best, count, index) => (count > monthRedDays[best] ? index : best),
					0,
				);
				const averageData = averageQueries[metricIndex].data?.data ?? [];
				const registeredDays = new Set(
					allDays.map((point) => point.time.toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" })),
				);
				const average =
					averageData.length === 0
						? null
						: averageData.reduce((sum, point) => sum + point.value, 0) / averageData.length;

				return {
					label: metric.label,
					average,
					redDays: `${monthRedDays.reduce((sum, count) => sum + count, 0)} / ${differenceInCalendarDays(periodEnd, periodStart) + 1}`,
					worstMonth:
						monthRedDays[worstMonthIndex] > 0
							? months[worstMonthIndex]
									.toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
									.replace(/^./, (c) => c.toLocaleUpperCase(i18n.language))
							: "-",
					registeredDays: `${registeredDays.size} / ${differenceInCalendarDays(periodEnd, periodStart) + 1}`,
				};
			}),
		}));

		onPageReady({
			key: PAGE_KEYS.summary,
			spec: { kind: "period-summary", periodStart, periodEnd, rows },
		});
	}, [isLoading, dayQueries, averageQueries, months, periodStart, periodEnd, onPageReady, i18n.language, exposures]);

	return null;
}
