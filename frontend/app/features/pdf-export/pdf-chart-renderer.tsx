import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { DayWidget } from "@/features/day-widget/day-widget.tsx";
import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { ExposureSummary } from "@/features/summary-card.tsx";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions, notesRangeQueryOptions } from "@/lib/api.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Note } from "@/lib/dto/note.ts";
import { buildExposureQuery, getSummaryGranularity } from "@/lib/exposure-query-utils.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { defaultDustField, type Exposure, parseAsDustField } from "@/lib/exposures.ts";
import { getRedDays, type RedDayRow } from "@/lib/pdf/red-days.ts";
import { getYearRange } from "@/lib/pdf/year-range.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { calculateSummaryCounts, mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";
import { useQuery } from "@tanstack/react-query";
import { addMonths, setHours, startOfYear } from "date-fns";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getCalendarDays, type PdfCalendarDay } from "@/lib/pdf/calendar-days.ts";

/**
 * PDF Chart Renderer - Off-Screen Rendering for PDF Export
 *
 * Renders everything a PDF export needs, off-screen, then reports each page as
 * a PdfPageSpec once its data has loaded. The actual PDF assembly happens
 * elsewhere (use-export-pdf.ts) - this file only decides what each page is.
 *
 * Page count and shape depend on the view:
 *  - day: 2 pages per exposure type (a summary page, a chart page) - SingleDayChartRenderer
 *  - week/month: 1 page per exposure type (a summary + grid page) - TrendChartRenderer
 *  - year: 2 pages per month per exposure type (a calendar image, a red-day
 *    table) - MonthGridPage, scheduled by YearBatchRenderer
 *
 * The whole tree is wrapped in the "pdf-export-light" class (see app.css), which
 * re-declares every theme CSS variable to its light-mode value. This makes the
 * exported PDF always look the same regardless of the user's dark/light setting,
 * without needing to touch the real page or flash anything on screen.
 *
 * Used by: pdf-export-dialog.tsx (renders this when the dialog is exporting)
 */
export type PdfView = View | "year";

/**
 * How the assembler should draw one page.
 *  - "image": rasterize an off-screen DOM node, looked up by id, when the
 *    assembler gets to it. Used by the day/week/month exports, where
 *    everything stays mounted until the whole document is built.
 *  - "calendar": a vector-drawn calendar page for the month and year exports.
 *  - "red-days": drawn as a real vector table (no image at all), so the
 *    rows stay searchable and can carry links.
 */
export type PdfPageSpec =
	| { kind: "image"; id: string }
	| {
			kind: "calendar";
			monthDate: TZDate;
			days: Array<PdfCalendarDay>;
			summary: ReturnType<typeof calculateSummaryCounts>;
	  }
	| { kind: "red-days"; exposure: Exposure; rows: Array<RedDayRow> };

interface CollectedPage {
	exposure: Exposure;
	page: string;
	spec: PdfPageSpec;
}

interface PdfChartRendererProps {
	exposureType: "dust" | "noise" | "vibration" | "all";
	view: PdfView;
	date: Date;
	userId: string;
	onPagesReady: (pages: Array<PdfPageSpec>) => void;
}

/**
 * Skips rendering and capturing every month's calendar image in the year
 * export - only the red-day table pages are produced. Currently true
 * deliberately: the rasterized calendar images make the PDF far too large,
 * and they're pending a redesign as a drawn table instead (like the red-day
 * table already is). Flip to false to bring images back for testing in the
 * meantime.
 */
/**
 * How many month-pages are mounted at once during a year export - across ALL
 * exposure types combined (see YearBatchRenderer), not per type. A month is
 * unmounted as soon as it's done, so this is the most that's ever mounted at
 * once regardless of how many months or exposure types the export covers.
 * Without this, "Overview" would mount all 12 months x 3 types = 36 at once.
 */
const YEAR_BATCH_SIZE = 3;

// Which page keys to expect per exposure type, in order, for a given view.
// Extending this (e.g. adding red-day detail pages) only requires adding
// keys here — the collection/ordering logic below stays untouched.
function getPageKeysForView(view: PdfView): Array<string> {
	if (view === "day") return ["summary", "chart"];
	if (view === "year") {
		return Array.from({ length: 12 }, (_, i) => [`calendar-${i}`, `redday-${i}`]).flat();
	}
	return ["summary"]; // week or month
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
			onPageReady({ exposure, page: "summary", spec: { kind: "image", id: summaryId } });
			onPageReady({ exposure, page: "chart", spec: { kind: "image", id: chartId } });
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
	const tzDate = TIMEZONE(date);
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

	const isLoading = gridQuery.isLoading;
	const gridData = mapExposureDataToTimeBucketStatuses(gridQuery.data?.data ?? [], exposure, false);
	const hourDomain = gridQuery.data?.hourDomain;
	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		gridQuery.data?.data.map((point) => point.time),
		view,
	);

	// Report the calendar page when its data is ready.
	useEffect(() => {
		if (!isLoading) {
			const timer = setTimeout(() => {
				onPageReady({ exposure, page: "summary", spec: { kind: "image", id: summaryId } });
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isLoading, summaryId, exposure, onPageReady]);

	if (isLoading) {
		return null;
	}

	return (
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
	);
}

/** Collects a month calendar and its exposure summary for vector rendering. */
function MonthCalendarRenderer({
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
	const monthDate = TIMEZONE(date);
	const granularity = getSummaryGranularity(exposure);
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const usePeakAggregation = aggregation === "peak";
	const dayQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
			}),
			userId,
		}),
	);
	const summaryQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
				granularity,
			}),
			userId,
		}),
	);
	const isLoading = dayQuery.isLoading || summaryQuery.isLoading;
	const dayData = dayQuery.data?.data ?? [];
	const summaryData = summaryQuery.data?.data ?? [];
	const hasReportedRef = useRef(false);
	const onPageReadyRef = useRef(onPageReady);
	onPageReadyRef.current = onPageReady;

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		hasReportedRef.current = true;
		onPageReadyRef.current({
			exposure,
			page: "summary",
			spec: {
				kind: "calendar",
				monthDate,
				days: getCalendarDays(monthDate, mapExposureDataToTimeBucketStatuses(dayData, exposure, false)),
				summary: calculateSummaryCounts(summaryData, {
					exposure,
					peakAggregation: usePeakAggregation,
					granularity,
				}),
			},
		});
	}, [isLoading, exposure, monthDate, dayData, summaryData, usePeakAggregation, granularity]);

	return null;
}

/** Collects calendar and red-day page data for one exposure and month. */
function MonthGridPage({
	exposure,
	monthDate,
	monthIndex,
	userId,
	notes,
	onPageReady,
	onDone,
}: {
	exposure: Exposure;
	monthDate: TZDate;
	monthIndex: number;
	userId: string;
	notes: Array<Note>;
	onPageReady: (page: CollectedPage) => void;
	onDone: () => void;
}) {
	const granularity = getSummaryGranularity(exposure);
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const usePeakAggregation = aggregation === "peak";

	// Day granularity: one bucket per day, drives the calendar colours and tells us
	// which days are red.
	const gridQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
			}),
			userId,
		}),
	);

	// Summary granularity: the SAME query ExposureSummary makes on this page, so it is
	// served from the React Query cache. Gives per-day zone minutes and averages.
	const minuteQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
				granularity,
			}),
			userId,
		}),
	);

	const isLoading = gridQuery.isLoading || minuteQuery.isLoading;

	const onPageReadyRef = useRef(onPageReady);
	onPageReadyRef.current = onPageReady;
	const onDoneRef = useRef(onDone);
	onDoneRef.current = onDone;
	const hasStartedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: dayData/minuteData/notes read synchronously once, guarded by hasStartedRef — see MonthGridPage's original comment for the same reasoning.
	useEffect(() => {
		if (isLoading || hasStartedRef.current) return;
		hasStartedRef.current = true;

		const dayData = gridQuery.data?.data ?? [];
		const minuteData = minuteQuery.data?.data ?? [];

		onPageReadyRef.current({
			exposure,
			page: `calendar-${monthIndex}`,
			spec: {
				kind: "calendar",
				monthDate,
				days: getCalendarDays(monthDate, mapExposureDataToTimeBucketStatuses(dayData, exposure, false)),
				summary: calculateSummaryCounts(minuteData, {
					exposure,
					peakAggregation: usePeakAggregation,
					granularity,
				}),
			},
		});

		onPageReadyRef.current({
			exposure,
			page: `redday-${monthIndex}`,
			spec: {
				kind: "red-days",
				exposure,
				rows: getRedDays({ exposure, dayData, minuteData, notes, granularity }),
			},
		});

		onDoneRef.current();
	}, [isLoading, exposure, monthIndex, monthDate]);

	return null; // nothing to mount — no DOM capture needed anymore
}

type MonthJob = {
	key: string;
	exposure: Exposure;
	monthIndex: number;
	monthDate: TZDate;
};

/**
 * Year export: schedules every (exposure, month) pair - across ALL exposure
 * types together, not per type - as one shared queue, processing
 * YEAR_BATCH_SIZE of them at a time (see the constant's comment for why).
 *
 * The active window is always "the earliest still-incomplete jobs", tracked
 * by key in `completedKeys` - NOT a raw count of how many onDone calls have
 * arrived so far. Jobs don't finish in the order they started (network timing
 * varies), so a count would let a later job finishing first slide the window
 * past an earlier, still-running one and unmount it mid-flight before it
 * ever reports its pages.
 */
function YearBatchRenderer({
	exposures,
	date,
	userId,
	notes,
	onPageReady,
}: {
	exposures: Array<Exposure>;
	date: Date;
	userId: string;
	notes: Array<Note>;
	onPageReady: (page: CollectedPage) => void;
}) {
	const tzDate = TIMEZONE(date);
	const yearStart = startOfYear(tzDate, { in: TIMEZONE });
	const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

	const jobs: Array<MonthJob> = exposures.flatMap((exposure) =>
		months.map((monthDate, monthIndex) => ({
			key: `${exposure}-${monthIndex}`,
			exposure,
			monthIndex,
			monthDate,
		})),
	);

	const [completedKeys, setCompletedKeys] = useState<Set<string>>(() => new Set());
	const activeJobs = jobs.filter((job) => !completedKeys.has(job.key)).slice(0, YEAR_BATCH_SIZE);

	const handleJobDone = useCallback((key: string) => {
		setCompletedKeys((prev) => {
			if (prev.has(key)) return prev;
			const next = new Set(prev);
			next.add(key);
			return next;
		});
	}, []);

	return (
		<>
			{activeJobs.map((job) => (
				<MonthGridPage
					key={job.key}
					exposure={job.exposure}
					monthDate={job.monthDate}
					monthIndex={job.monthIndex}
					userId={userId}
					notes={notes}
					onPageReady={onPageReady}
					onDone={() => handleJobDone(job.key)}
				/>
			))}
		</>
	);
}

/**
 * Top-level renderer: picks the right per-view renderer above, collects every
 * page it reports via handlePageReady, and calls onPagesReady once the count
 * matches expectedCount (exposure types x pages-per-type for that view).
 *
 * Pages are assembled back into a FIXED order - exposure types in the order
 * exposureType implies, and within each, getPageKeysForView's order - rather
 * than the order they happened to finish loading in. This matters because
 * pdf-export-dialog.tsx builds its `titles` array in that same fixed order;
 * without this, a page that loads faster than another could end up under
 * the wrong title.
 */
export function PdfChartRenderer({ exposureType, view, date, userId, onPagesReady }: PdfChartRendererProps) {
	const collectedRef = useRef<Map<string, CollectedPage>>(new Map());
	const [hasReported, setHasReported] = useState(false);

	// One request for the whole year's notes; only the year export needs them.
	const notesQuery = useQuery({
		...notesRangeQueryOptions({ ...getYearRange(TIMEZONE(date)), userId }),
		enabled: view === "year",
	});
	const notes = notesQuery.data ?? [];

	const exposuresToRender: Array<Exposure> = exposureType === "all" ? ["dust", "noise", "vibration"] : [exposureType];
	const pageKeys = getPageKeysForView(view);
	const expectedCount = exposuresToRender.length * pageKeys.length;

	const handlePageReady = useCallback(
		(pageInfo: CollectedPage) => {
			if (hasReported) return;

			collectedRef.current.set(`${pageInfo.exposure}-${pageInfo.page}`, pageInfo);

			if (collectedRef.current.size === expectedCount) {
				const orderedPages = exposuresToRender.flatMap((exposure) =>
					pageKeys
						.map((pageKey) => collectedRef.current.get(`${exposure}-${pageKey}`)?.spec)
						.filter((spec): spec is PdfPageSpec => spec != null),
				);

				onPagesReady(orderedPages);
				setHasReported(true);
			}
		},
		[expectedCount, exposuresToRender, pageKeys, onPagesReady, hasReported],
	);

	return (
		<div
			className="pdf-export-light"
			style={{
				position: "fixed",
				top: "-9999px",
				left: "-9999px",
			}}
		>
			{view === "day" ? (
				exposuresToRender.map((exposure) => (
					<SingleDayChartRenderer
						key={exposure}
						exposure={exposure}
						date={date}
						userId={userId}
						onPageReady={handlePageReady}
					/>
				))
			) : view === "year" ? (
				// Hold off until the notes arrive, so getRedDays never runs against an empty list.
				// One shared YearBatchRenderer, not one per exposure - this is what makes the
				// batch size apply across the whole export (e.g. Overview) rather than 3x it.
				notesQuery.isLoading ? null : (
					<YearBatchRenderer
						exposures={exposuresToRender}
						date={date}
						userId={userId}
						notes={notes}
						onPageReady={handlePageReady}
					/>
				)
			) : view === "month" ? (
				exposuresToRender.map((exposure) => (
					<MonthCalendarRenderer
						key={exposure}
						exposure={exposure}
						date={date}
						userId={userId}
						onPageReady={handlePageReady}
					/>
				))
			) : (
				exposuresToRender.map((exposure) => (
					<TrendChartRenderer
						key={exposure}
						exposure={exposure}
						date={date}
						view={view}
						userId={userId}
						onPageReady={handlePageReady}
					/>
				))
			)}
		</div>
	);
}
