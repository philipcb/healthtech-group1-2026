import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import type { CollectedPage } from "@/features/pdf-export/pdf-page-spec.ts";
import { PAGE_KEYS } from "@/features/pdf-export/renderers/page-keys.ts";
import { type PdfDaySeries, serializeChartSvg } from "@/hooks/pdf-day-report.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import { buildExposureQuery, getSummaryGranularity } from "@/lib/exposure-query-utils.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { type DustField, dustFields, type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { calculateSummaryCounts } from "@/lib/time-bucket-utils.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import { useQueries } from "@tanstack/react-query";
import { setHours } from "date-fns";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

const DUST_FIELD_LABELS: Record<DustField, string> = {
	pm1_twa: "PM1",
	pm25_twa: "PM2.5",
	pm10_twa: "PM10",
};

/**
 * Single day chart renderer - handles one exposure type for ONE day (hour-based X-axis)
 */
export function SingleDayChartRenderer({
	exposure,
	date,
	userId,
	onPageReady,
}: {
	exposure: Exposure;
	date: Date;
	userId: string;
	onPageReady: (page: CollectedPage) => void;
}) {
	const tzDate = TIMEZONE(date);
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const peakAggregation = aggregation === "peak";
	// A dust report needs one chart and one hourly grid per PM field; other exposures have one series.
	const fields: Array<DustField | undefined> = exposure === "dust" ? [...dustFields] : [undefined];
	const summaryGranularity = getSummaryGranularity(exposure);
	const chartQueries = useQueries({
		queries: fields.map((field) =>
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, "day", tzDate, { field, usePeakAggregation: false }),
				userId,
			}),
		),
	});
	const gridQueries = useQueries({
		queries: fields.map((field) =>
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, "day", tzDate, {
					field,
					usePeakAggregation: false,
					granularity: "hour",
				}),
				userId,
			}),
		),
	});
	const summaryQueries = useQueries({
		queries: fields.map((field) =>
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, "day", tzDate, {
					field,
					usePeakAggregation: peakAggregation,
					granularity: summaryGranularity,
				}),
				userId,
			}),
		),
	});
	const isLoading = [...chartQueries, ...gridQueries, ...summaryQueries].some((query) => query.isLoading);
	const queryData = fields.map((field, index) => ({
		field,
		data: chartQueries[index].data?.data ?? [],
		hourData: gridQueries[index].data?.data ?? [],
		hourDomain: gridQueries[index].data?.hourDomain,
		summaryData: summaryQueries[index].data?.data ?? [],
	}));
	const hourDomains = queryData.map(({ hourData, hourDomain }) =>
		getHourDomain(
			hourDomain,
			hourData.map((point) => point.time),
			"week",
		),
	);
	const minHour = Math.min(...hourDomains.map((domain) => domain.minHour));
	const maxHour = Math.max(...hourDomains.map((domain) => domain.maxHour));
	const chartDomains = queryData.map(({ data }, index) =>
		getHourDomain(
			chartQueries[index].data?.hourDomain,
			data.map((point) => point.time),
			"day",
		),
	);
	const minChartHour = Math.min(...chartDomains.map((domain) => domain.minHour));
	const maxChartHour = Math.max(...chartDomains.map((domain) => domain.maxHour));
	const minTime = setHours(tzDate, minChartHour);
	const maxTime = setHours(tzDate, maxChartHour);
	const chartSeries = queryData.map(({ field, data, hourData, summaryData }) => {
		const dangerLevelByUtcHour = new Map<number, DangerLevel>();
		for (const point of hourData) dangerLevelByUtcHour.set(point.time.getUTCHours(), point.dangerLevel);
		const summary = calculateSummaryCounts(summaryData, {
			exposure,
			peakAggregation,
			granularity: summaryGranularity,
		});
		const { minY, maxY } = getExposureYAxisRange(exposure, data);
		const threshold = getThreshold(exposure, field);

		return {
			field,
			label: field ? DUST_FIELD_LABELS[field] : exposure,
			grid: {
				exposure,
				hours: Array.from({ length: maxHour - minHour + 1 }, (_, index) => {
					const hour = minHour + index;
					return {
						hour,
						dangerLevel: dangerLevelByUtcHour.get(setHours(tzDate, hour).getUTCHours()) ?? null,
					};
				}),
				summary,
			},
			chartData: downsampleExposureData(exposure, data),
			minY,
			maxY,
			threshold,
		};
	});
	const chartRefs = useRef<Array<HTMLDivElement | null>>([]);
	const hasReportedRef = useRef(false);

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		let attempts = 0;
		let timeout: ReturnType<typeof setTimeout> | undefined;

		// ResponsiveContainer needs a layout pass before its SVG gets non-zero dimensions.
		const captureCharts = () => {
			let allReady = true;
			const series: Array<PdfDaySeries> = chartSeries.map((item, index) => {
				const svg = chartRefs.current[index]?.querySelector("svg");
				if (!svg || svg.getBoundingClientRect().width <= 0 || svg.getBoundingClientRect().height <= 0) {
					allReady = false;
					return {
						label: item.label,
						grid: item.grid,
						chart: {
							element: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
							width: 0,
							height: 0,
							hasData: item.chartData.length > 0,
						},
					};
				}
				return {
					label: item.label,
					grid: item.grid,
					chart: serializeChartSvg(svg, item.chartData.length > 0),
				};
			});

			if (!allReady && attempts < 30) {
				attempts++;
				timeout = setTimeout(captureCharts, 50);
				return;
			}

			hasReportedRef.current = true;
			onPageReady({
				key: PAGE_KEYS.single(exposure),
				spec: { kind: "day-report", exposure, date: tzDate, series },
			});
		};

		captureCharts();
		return () => clearTimeout(timeout);
	}, [isLoading, chartSeries, exposure, tzDate, onPageReady]);

	const chartWidth = chartSeries.length > 1 ? "1000px" : "1160px";
	const chartHeight = chartSeries.length > 1 ? "400px" : "560px";
	return (
		<div aria-hidden="true" style={{ position: "fixed", top: "-10000px", left: 0, pointerEvents: "none" }}>
			{!isLoading &&
				chartSeries.map((item, index) => (
					<div
						key={item.label}
						ref={(element) => {
							chartRefs.current[index] = element;
						}}
						style={{ width: chartWidth, height: chartHeight }}
					>
						<BaseExposureLineChartCard
							className="h-full"
							minTime={minTime}
							maxTime={maxTime}
							chartData={item.chartData}
							unit={exposureUnitByExposure[exposure]}
							maxY={item.maxY}
							minY={item.minY}
							exposure={exposure}
							dustField={item.field}
							showArea={true}
							showLegend={false}
							unitLabelPosition="top"
							lineStrokeWidth={1}
						>
							<ThresholdLine y={item.threshold.danger} dangerLevel="danger" />
							<ThresholdLine y={item.threshold.warning} dangerLevel="warning" />
						</BaseExposureLineChartCard>
					</div>
				))}
		</div>
	);
}
