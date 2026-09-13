import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { exposureQueryOptions } from "@/lib/api.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import type { View } from "@/features/views/views.ts";
import { TZDate } from "@date-fns/tz";
import type { Exposure } from "@/lib/exposures.ts";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { setHours, addDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { getHourDomain } from "@/lib/utils.ts";
import { TIMEZONE } from "@/i18n/locale.ts";

/**
 * PDF Chart Renderer - Simplified Off-Screen Chart Rendering
 *
 * This component renders exposure charts off-screen for PDF export WITHOUT using React Context override.
 * Instead of the complex Context Provider pattern, we simply:
 * 1. Fetch data for the selected date range using a direct API call
 * 2. Render chart components with that data as props
 * 3. Report element IDs back to parent for PDF capture
 *
 * This is MUCH simpler than pdf-renderer.tsx because:
 * - No Context override needed
 * - Direct data fetching instead of hook-based
 * - Props-based rendering instead of global state
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
 * Single chart renderer - handles one exposure type for ONE day
 */
function SingleDayChart({
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

	// Fetch data directly (no hooks, no context)
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
 * Main renderer - coordinates all charts and reports IDs
 *
 * For "day" view: renders 1 chart per exposure type
 * For "week" view: renders 7 charts (one per day) per exposure type
 * For "month" view: renders up to 31 charts (one per day) per exposure type
 */
export function PdfChartRenderer({ exposureType, view, date, userId, onIdsReady }: PdfChartRendererProps) {
	// Use ref to persist IDs across renders without causing re-renders
	const collectedIdsRef = useRef<Set<string>>(new Set());
	const [hasReported, setHasReported] = useState(false);

	// Calculate which days to render charts for
	const daysToRender = (() => {
		if (view === "day") {
			return [date];
		}

		if (view === "week") {
			const start = startOfWeek(date, { weekStartsOn: 1, in: TIMEZONE });
			const end = endOfWeek(date, { weekStartsOn: 1, in: TIMEZONE });
			return eachDayOfInterval({ start, end });
		}

		// month
		const start = startOfMonth(date, { in: TIMEZONE });
		const end = endOfMonth(date, { in: TIMEZONE });
		return eachDayOfInterval({ start, end });
	})();

	// Calculate which exposure types to render
	const exposuresToRender: Exposure[] =
		exposureType === "all"
			? ["dust", "noise", "vibration"]
			: [exposureType];

	// Calculate expected number of charts
	const expectedCount = daysToRender.length * exposuresToRender.length;

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
			{/* Render one chart for each combination of exposure type and day */}
			{exposuresToRender.map((exposure) =>
				daysToRender.map((dayDate, index) => (
					<SingleDayChart
						key={`${exposure}-${dayDate.getTime()}`}
						exposure={exposure}
						date={dayDate}
						userId={userId}
						onIdReady={handleIdReady}
					/>
				))
			)}
		</div>
	);
}
