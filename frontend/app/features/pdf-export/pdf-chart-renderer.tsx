import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { DayWidget } from "@/features/day-widget/day-widget.tsx";
import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { ExposureSummary } from "@/features/summary-card.tsx";
import { toWeeklyMax } from "@/features/trend-line-chart-card/trend-line-chart-utils.ts";
import type { View } from "@/lib/views.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import type { ExposureTypeField } from "@/lib/dto/exposure.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { downsampleExposureData, getHourDomain } from "@/lib/utils.ts";
import { useQueries, useQuery } from "@tanstack/react-query";
import { setHours } from "date-fns";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * PDF Chart Renderer - Off-Screen Chart Rendering for PDF Export
 *
 * Renders TWO separate pages per exposure type, so each ends up on its own A4 sheet:
 *  - a "summary" page: ExposureSummary + the grid widget (Day/Week/Calendar)
 *  - a "chart" page: just the line chart, with extra headroom so the x-axis and
 *    legend are never cropped when the page is captured as an image.
 *
 * The whole tree is wrapped in the "pdf-export-light" class (see app.css), which
 * re-declares every theme CSS variable to its light-mode value. This makes the
 * exported PDF always look the same regardless of the user's dark/light setting,
 * without needing to touch the real page or flash anything on screen.
 *
 * Used by: pdf-export-dialog.tsx (renders this when dialog is open)
 */

type PdfPage = "summary" | "chart";

interface CollectedPage {
	id: string;
	exposure: Exposure;
	page: PdfPage;
}

interface PdfChartRendererProps {
	exposureType: "dust" | "noise" | "vibration" | "all";
	view: View;
	date: Date;
	userId: string;
	onIdsReady: (ids: Array<string>) => void;
}

// Extra headroom below the plotted area so the x-axis labels and legend always fit
// inside the captured image (see the comment on CHART_AREA_HEIGHT usage below for why
// this needs to be a real, generous number rather than exactly the plot's height).
// If you still see cropping, or too much empty space, adjust this single constant.
const CHART_AREA_HEIGHT = 600;

const pdfPageStyle: CSSProperties = {
	width: "1200px",
	background: "white",
	padding: "20px",
	boxSizing: "border-box",
	display: "flex",
	flexDirection: "column",
	gap: "24px",
};

/**
 * Single day chart renderer - handles one exposure type for ONE day (hour-based X-axis)
 */
function SingleDayChartRenderer({
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
	const summaryId = useId();
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
	const dayGridData = [
		{
			exposure,
			dangerLevelByHour: data.reduce<Record<number, (typeof data)[number]["dangerLevel"]>>((levels, point) => {
				levels[point.time.getUTCHours()] = point.dangerLevel;
				return levels;
			}, {}),
		},
	];

	// Report both pages once loaded.
	useEffect(() => {
		if (!isLoading) {
			onPageReady({ id: summaryId, exposure, page: "summary" });
			onPageReady({ id: chartId, exposure, page: "chart" });
		}
	}, [isLoading, summaryId, chartId, exposure, onPageReady]);

	if (isLoading) {
		return null;
	}

	return (
		<>
			<div id={summaryId} className="pdf-export-container" style={pdfPageStyle}>
				<ExposureSummary exposureType={exposure} selectedDate={tzDate} selectedView="day" />
				<div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
				<DayWidget
					data={dayGridData}
					startHour={minHour}
					endHour={maxHour}
					selectedDate={tzDate}
					exposureTypes={[exposure]}
				/>
				</div>
			</div>

			<div id={chartId} className="pdf-export-container" style={pdfPageStyle}>
				<div style={{ width: "1160px", height: `${CHART_AREA_HEIGHT}px` }}>
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
		</>
	);
}

/**
 * Aggregated trend chart renderer - handles one exposure type for week/month view
 */
function TrendChartRenderer({
	exposure,
	date,
	view,
	userId,
	onPageReady,
}: {
	exposure: Exposure;
	date: Date;
	view: "week" | "month";
	userId: string;
	onPageReady: (page: CollectedPage) => void;
}) {
	const summaryId = useId();
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
					granularity: "day",
				}),
				userId,
			}),
		),
	});
	const gridQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, view, tzDate, {
				field: exposure === "dust" ? "pm1_twa" : undefined,
				usePeakAggregation: false,
			}),
			userId,
		}),
	);

	const isLoading = queryResults.some((q) => q.isLoading) || gridQuery.isLoading;
	const gridData = mapExposureDataToTimeBucketStatuses(gridQuery.data?.data ?? [], exposure, false);
	const hourDomain = gridQuery.data?.hourDomain;
	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		gridQuery.data?.data.map((point) => point.time),
		view,
	);

	const series = fields.map((field, index) => {
		const rawData = queryResults[index]?.data?.data ?? [];
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
				onPageReady({ id: summaryId, exposure, page: "summary" });
				onPageReady({ id: chartId, exposure, page: "chart" });
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isLoading, summaryId, chartId, exposure, onPageReady]);

	if (isLoading) {
		return null;
	}

	// Determine unit based on exposure type
	const unit = exposure === "dust" ? "ug" : exposure === "noise" ? "db" : "points";

	return (
		<>
			<div id={summaryId} className="pdf-export-container" style={pdfPageStyle}>
				<ExposureSummary exposureType={exposure} selectedDate={tzDate} selectedView={view} />
				{view === "week" ? (
					<div style={{ width: "1160px" }}>
						<WeekWidget dayStartHour={minHour} dayEndHour={maxHour} data={gridData} selectedDate={tzDate} />
					</div>
				) : (
					<div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
						<CalendarWidget selectedDay={tzDate} data={gridData} />
					</div>
				)}
			</div>

			<div id={chartId} className="pdf-export-container" style={pdfPageStyle}>
				<div style={{ width: "1160px", height: `${CHART_AREA_HEIGHT}px` }}>
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
		</>
	);
}

/**
 * Main renderer - coordinates all pages and reports their final IDs once everything
 * has loaded.
 *
 * Each exposure type produces two pages: "summary" (ExposureSummary + grid) and
 * "chart" (the line chart). Pages are reported to the parent in a FIXED order —
 * dust, noise, vibration (or just the single selected type), summary before chart —
 * regardless of which exposure's data happens to finish loading first. This matters
 * because `titles` in pdf-export-dialog.tsx is built in that same fixed order; without
 * this, a chart that loads faster than another could end up with the wrong title.
 */
export function PdfChartRenderer({ exposureType, view, date, userId, onIdsReady }: PdfChartRendererProps) {
	const collectedRef = useRef<Map<string, CollectedPage>>(new Map());
	const [hasReported, setHasReported] = useState(false);

	const exposuresToRender: Array<Exposure> = exposureType === "all" ? ["dust", "noise", "vibration"] : [exposureType];
	const expectedCount = exposuresToRender.length * 2; // one summary + one chart page per exposure

	const handlePageReady = useCallback(
		(pageInfo: CollectedPage) => {
			if (hasReported) return;

			collectedRef.current.set(`${pageInfo.exposure}-${pageInfo.page}`, pageInfo);

			if (collectedRef.current.size === expectedCount) {
				const orderedIds = exposuresToRender.flatMap((exposure) => {
					const summaryPage = collectedRef.current.get(`${exposure}-summary`);
					const chartPage = collectedRef.current.get(`${exposure}-chart`);
					return [summaryPage?.id, chartPage?.id].filter((id): id is string => id != null);
				});

				onIdsReady(orderedIds);
				setHasReported(true);
			}
		},
		[expectedCount, exposuresToRender, onIdsReady, hasReported],
	);

	// Reset when component mounts/unmounts
	useEffect(() => {
		collectedRef.current.clear();
		setHasReported(false);

		return () => {
			collectedRef.current.clear();
			setHasReported(false);
		};
	}, []);

	return (
		<div
			className="pdf-export-light"
			style={{
				position: "fixed",
				top: "-9999px",
				left: "-9999px",
			}}
		>
			{view === "day"
				? exposuresToRender.map((exposure) => (
						<SingleDayChartRenderer
							key={exposure}
							exposure={exposure}
							date={date}
							userId={userId}
							onPageReady={handlePageReady}
						/>
					))
				: exposuresToRender.map((exposure) => (
						<TrendChartRenderer
							key={exposure}
							exposure={exposure}
							date={date}
							view={view}
							userId={userId}
							onPageReady={handlePageReady}
						/>
					))}
		</div>
	);
}
