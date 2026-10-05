import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import type { PdfWeekGridPage } from "@/hooks/pdf-calendar.ts";
import { type PdfDayReport, type PdfDaySeries, serializeChartSvg } from "@/hooks/pdf-day-report.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions, notesRangeQueryOptions } from "@/lib/api.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Note } from "@/lib/dto/note.ts";
import { buildExposureQuery, getSummaryGranularity } from "@/lib/exposure-query-utils.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import {
	type DustField,
	defaultDustField,
	dustFields,
	type Exposure,
	exposureUnitByExposure,
	parseAsDustField,
} from "@/lib/exposures.ts";
import { getCalendarDays, type PdfCalendarDay } from "@/lib/pdf/calendar-days.ts";
import { getDayReportKey, getRedDays, type RedDayRow } from "@/lib/pdf/red-days.ts";
import { getYearRange } from "@/lib/pdf/year-range.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { calculateSummaryCounts, mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
	addDays,
	addMonths,
	eachDayOfInterval,
	setHours,
	startOfDay,
	startOfHour,
	startOfWeek,
	startOfYear,
} from "date-fns";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { memo, useCallback, useEffect, useRef, useState } from "react";

/**
 * PDF Chart Renderer - Off-Screen Rendering for PDF Export
 *
 * Renders everything a PDF export needs, off-screen, then reports each page as
 * a PdfPageSpec once its data has loaded. The actual PDF assembly happens
 * elsewhere (use-export-pdf.ts) - this file only decides what each page is.
 *
 * Page count and shape depend on the view:
 *  - day: 1 vector-drawn report page per exposure type - SingleDayChartRenderer
 *  - week/month: 1 vector-drawn grid page per exposure type
 *  - year: 2 pages per month per exposure type (a vector calendar, a red-day
 *    table) - MonthGridPage, scheduled by YearBatchRenderer. Then, once those
 *    are all in, one day report per red day appended at the end - the day
 *    export's own SingleDayChartRenderer, scheduled by DayReportBatchRenderer.
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
 *  - "calendar": a vector-drawn calendar page for the month and year exports.
 *  - "red-days": drawn as a real vector table (no image at all), so the
 *    rows stay searchable and can carry links.
 *  - "day-report": one day's report with a Recharts SVG and its hourly grid.
 */
export type PdfPageSpec =
	| { kind: "week-grid"; page: PdfWeekGridPage }
	| {
			kind: "calendar";
			days: Array<PdfCalendarDay>;
			summary: ReturnType<typeof calculateSummaryCounts>;
	  }
	| { kind: "red-days"; exposure: Exposure; rows: Array<RedDayRow> }
	| PdfDayReport;

/**
 * How far along a running export is. This file reports the first two steps as
 * pages and day reports come in; "building" (the final PDF assembly) is set by
 * the dialog, which runs that step itself.
 */
export type PdfExportProgress = {
	step: "collecting" | "dayReports" | "building";
	done: number;
	total: number;
};

interface CollectedPage {
	exposure: Exposure;
	page: string;
	spec: PdfPageSpec;
}

type DayReportSpec = PdfDayReport;

interface PdfChartRendererProps {
	exposureType: "dust" | "noise" | "vibration" | "all";
	view: PdfView;
	date: Date;
	userId: string;
	onPagesReady: (pages: Array<PdfPageSpec>) => void;
	/** Called whenever a new page or day report comes in - drives the progress bar and stall timeout. */
	onProgress?: (progress: PdfExportProgress) => void;
}

/**
 * How many month-pages are mounted at once during a year export - across ALL
 * exposure types combined (see YearBatchRenderer), not per type. A month is
 * unmounted as soon as it's done, so this is the most that's ever mounted at
 * once regardless of how many months or exposure types the export covers.
 * Without this, "Overview" would mount all 12 months x 3 types = 36 at once.
 */
const YEAR_BATCH_SIZE = 6;

/**
 * How many day reports are mounted at once. Separate from YEAR_BATCH_SIZE
 * because each report renders several chart SVGs, where a year month is now
 * pure data. A full Overview year can have 100+ red
 * days, so these must never all mount at once.
 */
const DAY_REPORT_BATCH_SIZE = 3;
const DUST_FIELD_LABELS: Record<DustField, string> = {
	pm1_twa: "PM1",
	pm25_twa: "PM2.5",
	pm10_twa: "PM10",
};

/**
 * Runs a list of keyed jobs `batchSize` at a time. `activeJobs` is always the
 * earliest jobs not yet marked done - tracked by key, NOT by a count of how many
 * have finished. Jobs finish out of order, so a count would let a later job
 * finishing first slide the window past an earlier, still-running one and
 * unmount it before it ever reported.
 */
function useBatchQueue<T extends { key: string }>(jobs: Array<T>, batchSize: number) {
	const [completedKeys, setCompletedKeys] = useState<Set<string>>(() => new Set());
	const activeJobs = jobs.filter((job) => !completedKeys.has(job.key)).slice(0, batchSize);

	const markDone = useCallback((key: string) => {
		setCompletedKeys((prev) => {
			if (prev.has(key)) return prev;
			const next = new Set(prev);
			next.add(key);
			return next;
		});
	}, []);

	return { activeJobs, markDone };
}

// Which page keys to expect per exposure type, in order, for a given view.
// Extending this (e.g. adding red-day detail pages) only requires adding
// keys here — the collection/ordering logic below stays untouched.
function getPageKeysForView(view: PdfView): Array<string> {
	if (view === "day") return ["day-report"];
	if (view === "year") {
		return Array.from({ length: 12 }, (_, i) => [`calendar-${i}`, `redday-${i}`]).flat();
	}
	return ["summary"]; // week or month
}

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
			onPageReady({ exposure, page: "day-report", spec: { kind: "day-report", exposure, date: tzDate, series } });
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

/** Collects a week's hourly exposure data and summary for vector rendering. */
function WeekGridRenderer({
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
	const granularity = getSummaryGranularity(exposure);
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const peakAggregation = aggregation === "peak";
	const gridQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "week", tzDate, {
				field: exposure === "dust" ? "pm1_twa" : undefined,
				usePeakAggregation: false,
			}),
			userId,
		}),
	);
	const summaryQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "week", tzDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation: peakAggregation,
				granularity,
			}),
			userId,
		}),
	);

	const isLoading = gridQuery.isLoading || summaryQuery.isLoading;
	const gridData = gridQuery.data?.data ?? [];
	const summaryData = summaryQuery.data?.data ?? [];
	const hourDomain = gridQuery.data?.hourDomain;
	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		gridData.map((point) => point.time),
		"week",
	);
	const hasReportedRef = useRef(false);
	const onPageReadyRef = useRef(onPageReady);
	onPageReadyRef.current = onPageReady;

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		hasReportedRef.current = true;

		const weekStart = startOfWeek(tzDate, { weekStartsOn: 1, in: TIMEZONE });
		const weekDates = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
		const hours = Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index);
		const dangerLevelByHour = new Map<number, DangerLevel>();
		for (const bucket of gridData) dangerLevelByHour.set(startOfHour(bucket.time).getTime(), bucket.dangerLevel);

		onPageReadyRef.current({
			exposure,
			page: "summary",
			spec: {
				kind: "week-grid",
				page: {
					hours,
					days: weekDates.map((weekDate) => ({
						date: weekDate,
						dangerLevels: hours.map((hour) => {
							const slot = setHours(startOfDay(weekDate), hour);
							return dangerLevelByHour.get(startOfHour(slot).getTime()) ?? null;
						}),
					})),
					summary: calculateSummaryCounts(summaryData, {
						exposure,
						peakAggregation,
						granularity,
					}),
				},
			},
		});
	}, [isLoading, tzDate, minHour, maxHour, gridData, summaryData, exposure, granularity, peakAggregation]);

	return null;
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
 * YEAR_BATCH_SIZE of them at a time (see the constant's comment for why, and
 * useBatchQueue for how the window advances).
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

	const { activeJobs, markDone } = useBatchQueue(jobs, YEAR_BATCH_SIZE);

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
					onDone={() => markDone(job.key)}
				/>
			))}
		</>
	);
}

type DayReportJob = {
	key: string;
	exposure: Exposure;
	date: TZDate;
};

/**
 * One day report per red-day row, in the order the year pages already have
 * them: exposure types in export order, months in order within each, days in
 * order within each month - so no sorting is needed.
 */
function getDayReportJobs(pages: Array<PdfPageSpec>): Array<DayReportJob> {
	return pages.flatMap((page) =>
		page.kind === "red-days"
			? page.rows.map((row) => ({
					key: getDayReportKey(row.exposure, row.date),
					exposure: row.exposure,
					date: row.date,
				}))
			: [],
	);
}

/**
 * One red day's report, using the same SVG path as a standalone day export.
 */
function DayReportPage({
	job,
	userId,
	onDone,
}: {
	job: DayReportJob;
	userId: string;
	onDone: (report: DayReportSpec) => void;
}) {
	const hasReportedRef = useRef(false);
	const onDoneRef = useRef(onDone);
	onDoneRef.current = onDone;

	const handlePageReady = useCallback(({ spec }: CollectedPage) => {
		if (spec.kind !== "day-report" || hasReportedRef.current) return;
		hasReportedRef.current = true;
		onDoneRef.current(spec);
	}, []);

	return (
		<SingleDayChartRenderer exposure={job.exposure} date={job.date} userId={userId} onPageReady={handlePageReady} />
	);
}

/**
 * Renders every day report DAY_REPORT_BATCH_SIZE at a time, then hands them all
 * back in job order (not finishing order) once the last one is in.
 */
function DayReportBatchRenderer({
	jobs,
	userId,
	onAllDone,
	onProgress,
}: {
	jobs: Array<DayReportJob>;
	userId: string;
	onAllDone: (reports: Array<DayReportSpec>) => void;
	onProgress?: (progress: PdfExportProgress) => void;
}) {
	const { activeJobs, markDone } = useBatchQueue(jobs, DAY_REPORT_BATCH_SIZE);
	const reportsRef = useRef(new Map<string, DayReportSpec>());
	const hasFinishedRef = useRef(false);
	const onAllDoneRef = useRef(onAllDone);
	onAllDoneRef.current = onAllDone;
	const onProgressRef = useRef(onProgress);
	onProgressRef.current = onProgress;

	const handleDone = useCallback(
		(key: string, report: DayReportSpec) => {
			const countBefore = reportsRef.current.size;
			reportsRef.current.set(key, report);
			markDone(key);
			if (reportsRef.current.size > countBefore) {
				onProgressRef.current?.({ step: "dayReports", done: reportsRef.current.size, total: jobs.length });
			}

			if (hasFinishedRef.current || reportsRef.current.size < jobs.length) return;
			hasFinishedRef.current = true;

			onAllDoneRef.current(
				jobs.flatMap((job) => {
					const done = reportsRef.current.get(job.key);
					return done ? [done] : [];
				}),
			);
		},
		[jobs, markDone],
	);

	return (
		<>
			{activeJobs.map((job) => (
				<DayReportPage
					key={job.key}
					job={job}
					userId={userId}
					onDone={(report) => handleDone(job.key, report)}
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
 *
 * Memoized: the dialog re-renders on every progress update, and without this
 * the whole off-screen export tree would re-render with it each time.
 */
export const PdfChartRenderer = memo(function PdfChartRendererInner({
	exposureType,
	view,
	date,
	userId,
	onPagesReady,
	onProgress,
}: PdfChartRendererProps) {
	const collectedRef = useRef<Map<string, CollectedPage>>(new Map());
	const [hasReported, setHasReported] = useState(false);
	// Set once a year export's own pages are all in AND it has red days: the day
	// reports are rendered next, and onPagesReady only fires once they're done.
	const [dayReportPhase, setDayReportPhase] = useState<{
		yearPages: Array<PdfPageSpec>;
		jobs: Array<DayReportJob>;
	} | null>(null);

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

			// Renderers re-report the same page on re-renders; only a genuinely new page
			// counts as progress, or a stuck export would keep resetting its stall timer.
			const countBefore = collectedRef.current.size;
			collectedRef.current.set(`${pageInfo.exposure}-${pageInfo.page}`, pageInfo);
			if (collectedRef.current.size > countBefore) {
				onProgress?.({ step: "collecting", done: collectedRef.current.size, total: expectedCount });
			}

			if (collectedRef.current.size === expectedCount) {
				const orderedPages = exposuresToRender.flatMap((exposure) =>
					pageKeys
						.map((pageKey) => collectedRef.current.get(`${exposure}-${pageKey}`)?.spec)
						.filter((spec): spec is PdfPageSpec => spec != null),
				);

				setHasReported(true);

				// A year export isn't finished yet if it has red days - each still
				// needs its day report appended. Everything else is done now.
				const dayReportJobs = view === "year" ? getDayReportJobs(orderedPages) : [];

				if (dayReportJobs.length > 0) {
					setDayReportPhase({ yearPages: orderedPages, jobs: dayReportJobs });
					onProgress?.({ step: "dayReports", done: 0, total: dayReportJobs.length });
				} else {
					onPagesReady(orderedPages);
				}
			}
		},
		[expectedCount, exposuresToRender, pageKeys, onPagesReady, onProgress, hasReported, view],
	);

	const handleDayReportsDone = useCallback(
		(reports: Array<DayReportSpec>) => {
			if (dayReportPhase) onPagesReady([...dayReportPhase.yearPages, ...reports]);
		},
		[dayReportPhase, onPagesReady],
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
					<WeekGridRenderer
						key={exposure}
						exposure={exposure}
						date={date}
						userId={userId}
						onPageReady={handlePageReady}
					/>
				))
			)}
			{dayReportPhase && (
				<DayReportBatchRenderer
					jobs={dayReportPhase.jobs}
					userId={userId}
					onAllDone={handleDayReportsDone}
					onProgress={onProgress}
				/>
			)}
		</div>
	);
});
