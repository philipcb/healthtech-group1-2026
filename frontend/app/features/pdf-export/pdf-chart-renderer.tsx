import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { exposureQueryOptions } from "@/lib/api.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { toWeeklyMax } from "@/features/trend-line-chart-card/trend-line-chart-utils.ts";
import type { View } from "@/features/views/views.ts";
import { TZDate } from "@date-fns/tz";
import type { Exposure } from "@/lib/exposures.ts";
import type { ExposureTypeField, ExposureDto } from "@/lib/dto/exposure.ts";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { setHours } from "date-fns";
import { getHourDomain } from "@/lib/utils.ts";
import { TIMEZONE } from "@/i18n/locale.ts";

/**
 * PDF Chart Renderer - Off-Screen Chart Rendering for PDF Export
 *
 * This component renders exposure charts off-screen for PDF export:
 * - Day view: renders one SingleDayChart per exposure type (hour-based, single day)
 * - Week/Month view: renders one aggregated TrendLineChart per exposure type (same as live page)
 *
 * Used by: pdf-export-dialog.tsx (renders this when dialog is open)
 */


interface PdfChartRendererProps {
	exposureType: "dust" | "noise" | "vibration" | "all";
	view: View;
	date: Date;
	userId: string;
	onIdsReady: (ids: string[]) => void;
}

/**
 * Single day chart renderer - handles one exposure type for ONE day (hour-based X-axis)
 */
function SingleDayChartRenderer({
	exposure,
	date,
	userId,
	onIdReady,
}: {
	exposure: Exposure;
	date: Date;
	userId: string;
	onIdReady: (id: string) => void;
}) {
	const chartId = useId();

	// Convert to TZDate
	const tzDate = TIMEZONE(date);

	// Always use "day" view for individual day charts
	const query = buildExposureQuery(exposure, "day", tzDate, {
		field: exposure === "dust" ? "pm10_twa" : undefined,
		usePeakAggregation: false,
	});

	// Fetch data directly
	const { data: response, isLoading } = useQuery(
		exposureQueryOptions({
			exposure,
			query,
			userId,
		}),
	);

	const data = response?.data ?? [];
	const hourDomain = response?.hourDomain;

	// Calculate Y-axis range and hour domain
	const { minY, maxY } = getExposureYAxisRange(exposure, data, {
		usePeakAggregation: false,
	});

	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		data.map((d) => d.time),
		"day",
	);
	const minTime = setHours(tzDate, minHour);
	const maxTime = setHours(tzDate, maxHour);

	// Get thresholds for warning/danger lines
	const threshold = getThreshold(exposure, exposure === "dust" ? "pm10_twa" : undefined);

	// Report ID when chart is ready - with delay to ensure DOM is ready
	useEffect(() => {
		if (!isLoading) {
			const timer = setTimeout(() => {
				onIdReady(chartId);
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isLoading, chartId, onIdReady]);

	if (isLoading) {
		return null;
	}

	return (
		<div
			id={chartId}
			style={{
				width: "1200px",
				height: "500px",
				background: "white",
				padding: "20px",
				boxSizing: "border-box",
			}}
		>
			<div style={{ width: "1160px", height: "460px" }}>
				<BaseExposureLineChartCard
					minTime={minTime}
					maxTime={maxTime}
					chartData={downsampleExposureData(exposure, data)}
					unit={exposure === "dust" ? "ug" : "db"}
					id={`${chartId}-chart`}
					maxY={maxY}
					minY={minY}
					exposure={exposure}
					dustField={exposure === "dust" ? "pm10_twa" : undefined}
				>
					<ThresholdLine y={threshold.danger} dangerLevel="danger" />
					<ThresholdLine y={threshold.warning} dangerLevel="warning" />
				</BaseExposureLineChartCard>
			</div>
		</div>
	);
}

/**
 * Aggregated trend chart renderer - handles one exposure type for week/month view
 * Uses the same TrendLineChart component as the live page (reuses useExposureTrendData logic inline)
 */
function TrendChartRenderer({
	exposure,
	date,
	view,
	userId,
	onIdReady,
}: {
	exposure: Exposure;
	date: Date;
	view: "week" | "month";
	userId: string;
	onIdReady: (id: string) => void;
}) {
	const chartId = useId();
	const tzDate = TIMEZONE(date);

	// Determine which fields to query based on exposure type
	// (matches DustTrendLineChartCard, NoiseTrendLineChartCard, VibrationTrendLineChartCard)
	const fields: Array<ExposureTypeField | undefined> = (() => {
		if (exposure === "dust") {
			return ["pm1_twa", "pm25_twa", "pm4_twa", "pm10_twa"];
		}
		return [undefined]; // noise and vibration have no fields
	})();

	const granularity: "day" | "week" = view === "week" ? "day" : "week";

	// Fetch data for all fields (replicating useExposureTrendData logic)
	const queryResults = useQueries({
		queries: fields.map((field) =>
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, view, tzDate, {
					field,
					usePeakAggregation: false,
					aggregationFunction: exposure === "dust" ? "max" : undefined,
					granularity: "day", // Always use "day" granularity for fetching (matches DustTrendLineChartCard)
				}),
				userId,
			}),
		),
	});

	const isLoading = queryResults.some((q) => q.isLoading);

	// Build series data (matching useExposureTrendData)
	const series = fields.map((field, index) => {
		const rawData = queryResults[index]?.data?.data ?? [];
		// Apply weekly max aggregation if granularity is "week" (matches useExposureTrendData)
		const data = granularity === "week" ? toWeeklyMax(rawData) : rawData;

		return {
			field,
			data,
			exposure,
			exposureField: field,
		};
	});

	// Calculate Y-axis range (matching useExposureTrendData)
	const { minY, maxY } = getExposureYAxisRange(
		exposure,
		series.flatMap((s) => s.data),
		{ usePeakAggregation: false },
	);

	// Report ID when chart is ready
	useEffect(() => {
		if (!isLoading) {
			const timer = setTimeout(() => {
				onIdReady(chartId);
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isLoading, chartId, onIdReady]);

	if (isLoading) {
		return null;
	}

	// Determine unit based on exposure type
	const unit = exposure === "dust" ? "ug" : exposure === "noise" ? "db" : "points";

	return (
		<div
			id={chartId}
			style={{
				width: "1200px",
				height: "500px",
				background: "white",
				padding: "20px",
				boxSizing: "border-box",
			}}
		>
			<div style={{ width: "1160px", height: "460px" }}>
				<TrendLineChart
					selectedDate={tzDate}
					granularity={granularity}
					unit={unit}
					minY={minY}
					maxY={maxY}
					series={series}
				/>
			</div>
		</div>
	);
}

/**
 * Main renderer - coordinates all charts and reports IDs
 *
 * For "day" view: renders 1 SingleDayChartRenderer per exposure type
 * For "week"/"month" view: renders 1 TrendChartRenderer per exposure type (aggregated, not per-day)
 */
export function PdfChartRenderer({ exposureType, view, date, userId, onIdsReady }: PdfChartRendererProps) {
	// Use ref to persist IDs across renders without causing re-renders
	const collectedIdsRef = useRef<Set<string>>(new Set());
	const [hasReported, setHasReported] = useState(false);

	// Calculate which exposure types to render
	const exposuresToRender: Exposure[] =
		exposureType === "all"
			? ["dust", "noise", "vibration"]
			: [exposureType];

	// Calculate expected number of charts
	// - Day view: 1 chart per exposure type
	// - Week/Month view: 1 chart per exposure type
	const expectedCount = exposuresToRender.length;

	const handleIdReady = useCallback(
		(id: string) => {
			// Only collect if we haven't already reported
			if (hasReported) return;

			collectedIdsRef.current.add(id);

			// Report IDs once all expected charts are ready
			if (collectedIdsRef.current.size === expectedCount) {
				const allIds = Array.from(collectedIdsRef.current);
				onIdsReady(allIds);
				setHasReported(true); // Prevent further reports
			}
		},
		[expectedCount, onIdsReady, hasReported],
	);

	// Reset when component mounts/unmounts
	useEffect(() => {
		collectedIdsRef.current.clear();
		setHasReported(false);

		return () => {
			collectedIdsRef.current.clear();
			setHasReported(false);
		};
	}, []);

	return (
		<div
			style={{
				position: "fixed",
				top: "-9999px",
				left: "-9999px",
			}}
		>
			{view === "day" ? (
				// Day view: render one SingleDayChartRenderer per exposure type
				exposuresToRender.map((exposure) => (
					<SingleDayChartRenderer
						key={exposure}
						exposure={exposure}
						date={date}
						userId={userId}
						onIdReady={handleIdReady}
					/>
				))
			) : (
				// Week/Month view: render one TrendChartRenderer per exposure type
				exposuresToRender.map((exposure) => (
					<TrendChartRenderer
						key={exposure}
						exposure={exposure}
						date={date}
						view={view}
						userId={userId}
						onIdReady={handleIdReady}
					/>
				))
			)}
		</div>
	);
}
