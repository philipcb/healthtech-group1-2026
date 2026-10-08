import { PeriodTrendLineChart } from "@/components/exposure-line-chart/period-trend-line-chart.tsx";
import type { CollectedPage } from "@/features/pdf-export/pdf-page-spec.ts";
import { PAGE_KEYS } from "@/features/pdf-export/renderers/page-keys.ts";
import { getTrendMetrics, TREND_CHARTS_PER_PAGE } from "@/features/pdf-export/renderers/period-metrics.ts";
import { serializeChartSvg } from "@/hooks/pdf-day-report.ts";
import type { PdfPeriodTrendSeries } from "@/hooks/pdf-period-trend-chart.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import { getSummaryPeriod, type PdfPeriod } from "@/lib/pdf/period.ts";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/** Fetches the full period's daily series per metric and captures each as an SVG trend chart. */
export function PeriodTrendChartsRenderer({
	exposures,
	period,
	userId,
	onPageReady,
}: {
	exposures: Array<Exposure>;
	period: PdfPeriod;
	userId: string;
	onPageReady: (page: CollectedPage) => void;
}) {
	const { t } = useTranslation();
	const { periodStart, periodEnd } = getSummaryPeriod(period);
	const metrics = getTrendMetrics(exposures);

	const queries = useQueries({
		queries: metrics.map((metric) =>
			exposureQueryOptions({
				exposure: metric.exposure,
				query: buildExposureQuery(metric.exposure, "day", periodStart, {
					field: metric.field,
					granularity: "day",
					startTime: periodStart,
					endTime: periodEnd,
				}),
				userId,
			}),
		),
	});

	const isLoading = queries.some((query) => query.isLoading);

	const series = metrics.map((metric, index) => {
		const data = queries[index].data?.data ?? [];
		// Vibration shows the daily peak (total dose); everything else the daily average.
		const usePeakData = metric.exposure === "vibration";
		const { minY, maxY } = getExposureYAxisRange(metric.exposure, data, { usePeakAggregation: usePeakData });
		const description = usePeakData
			? t(($) => $.pdf.trendPeakDescription)
			: t(($) => $.pdf.trendAverageDescription);

		// PM fields keep their fixed label; noise/vibration use the translated exposure name.
		const label = metric.field ? metric.label : t(($) => $.exposures[metric.exposure]);

		return { metric, label, data, minY, maxY, usePeakData, description };
	});

	const chartRefs = useRef<Array<HTMLDivElement | null>>([]);
	const hasReportedRef = useRef(false);

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		let attempts = 0;
		let timeout: ReturnType<typeof setTimeout> | undefined;

		const captureCharts = () => {
			let allReady = true;
			const capturedSeries: Array<PdfPeriodTrendSeries> = series.map((item, index) => {
				const svg = chartRefs.current[index]?.querySelector("svg");
				if (!svg || svg.getBoundingClientRect().width <= 0 || svg.getBoundingClientRect().height <= 0) {
					allReady = false;
					return {
						label: item.label,
						description: item.description,
						chart: {
							element: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
							width: 0,
							height: 0,
							hasData: item.data.length > 0,
						},
					};
				}
				return {
					label: item.label,
					description: item.description,
					chart: serializeChartSvg(svg, item.data.length > 0),
				};
			});

			if (!allReady && attempts < 30) {
				attempts++;
				timeout = setTimeout(captureCharts, 50);
				return;
			}

			hasReportedRef.current = true;

			// Page 0 = the first chart alone (drawn under the summary table).
			// Remaining charts are grouped TREND_CHARTS_PER_PAGE per page.
			const [first, ...rest] = capturedSeries;
			const groups: Array<Array<PdfPeriodTrendSeries>> = first ? [[first]] : [];
			for (let i = 0; i < rest.length; i += TREND_CHARTS_PER_PAGE) {
				groups.push(rest.slice(i, i + TREND_CHARTS_PER_PAGE));
			}

			groups.forEach((group, pageIndex) => {
				onPageReady({
					key: PAGE_KEYS.trend(pageIndex),
					spec: {
						kind: "period-trend",
						placement: pageIndex === 0 ? "below-summary" : "full-page",
						series: group,
					},
				});
			});
		};

		captureCharts();
		return () => clearTimeout(timeout);
	}, [isLoading, series, onPageReady]);

	return (
		<div aria-hidden="true" style={{ position: "fixed", top: "-10000px", left: 0, pointerEvents: "none" }}>
			{!isLoading &&
				series.map((item, index) => (
					<div
						key={item.metric.label}
						ref={(element) => {
							chartRefs.current[index] = element;
						}}
						style={{ width: "1000px", height: "380px" }}
					>
						<PeriodTrendLineChart
							data={item.data}
							periodStart={periodStart}
							periodEnd={periodEnd}
							minY={item.minY}
							maxY={item.maxY}
							unit={exposureUnitByExposure[item.metric.exposure]}
							exposure={item.metric.exposure}
							dustField={item.metric.field}
							usePeakData={item.usePeakData}
						/>
					</div>
				))}
		</div>
	);
}
