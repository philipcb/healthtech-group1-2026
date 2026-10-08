import type { CollectedPage, PdfExportProgress, PdfPageSpec, PdfView } from "@/features/pdf-export/pdf-page-spec.ts";
import { DayReportBatchRenderer, type DayReportJob } from "@/features/pdf-export/renderers/day-report-renderer.tsx";
import { MonthCalendarRenderer } from "@/features/pdf-export/renderers/month-calendar-renderer.tsx";
import { getPageOrder } from "@/features/pdf-export/renderers/page-keys.ts";
import { getTrendMetrics, getTrendPageCount } from "@/features/pdf-export/renderers/period-metrics.ts";
import { PeriodBatchRenderer } from "@/features/pdf-export/renderers/period-month-renderer.tsx";
import { PeriodSummaryRenderer } from "@/features/pdf-export/renderers/period-summary-renderer.tsx";
import { PeriodTrendChartsRenderer } from "@/features/pdf-export/renderers/period-trend-renderer.tsx";
import { SingleDayChartRenderer } from "@/features/pdf-export/renderers/single-day-renderer.tsx";
import { WeekGridRenderer } from "@/features/pdf-export/renderers/week-grid-renderer.tsx";
import type { PdfDayReport } from "@/hooks/pdf-day-report.ts";
import { notesRangeQueryOptions } from "@/lib/api.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { getPeriodMonths, getPeriodRange, type PdfPeriod } from "@/lib/pdf/period.ts";
import { getDayReportKey } from "@/lib/pdf/red-days.ts";
import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useRef, useState } from "react";
/**
 * PDF Chart Renderer - Off-Screen Rendering for PDF Export
 *
 * Renders everything a PDF export needs, off-screen, then reports each page as
 * a PdfPageSpec once its data has loaded. The actual PDF assembly happens
 * elsewhere (use-export-pdf.ts) - this file and renderers/ only decide what each page is.
 *
 * Page count and shape depend on the view:
 *  - day: 1 vector-drawn report page per exposure type - SingleDayChartRenderer
 *  - week/month: 1 vector-drawn grid page per exposure type
 *  - period: 2 pages per month per exposure type (a vector calendar, a red-day
 *    table) - MonthGridPage, scheduled by PeriodBatchRenderer. Then, once those
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

interface PdfChartRendererProps {
	exposureType: "dust" | "noise" | "vibration" | "all";
	view: PdfView;
	/** The day, week or month to export. */
	date: Date;
	/** The months to export - only the period view uses it. */
	period: PdfPeriod;
	userId: string;
	onPagesReady: (pages: Array<PdfPageSpec>) => void;
	/** Called whenever a new page or day report comes in - drives the progress bar and stall timeout. */
	onProgress?: (progress: PdfExportProgress) => void;
}

/**
 * One day report per red-day row, in the order the period pages already have
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
 * Top-level renderer: picks the right per-view renderer above, collects every
 * page it reports via handlePageReady, and calls onPagesReady once every key in
 * getPageOrder has come in.
 *
 * Pages are handed over in getPageOrder's order, not the order they finished
 * loading in, so the PDF's page order never depends on which query was fastest.
 *
 * Memoized: the dialog re-renders on every progress update, and without this
 * the whole off-screen export tree would re-render with it each time.
 */
export const PdfChartRenderer = memo(function PdfChartRendererInner({
	exposureType,
	view,
	date,
	period,
	userId,
	onPagesReady,
	onProgress,
}: PdfChartRendererProps) {
	const collectedRef = useRef<Map<string, PdfPageSpec>>(new Map());
	const [hasReported, setHasReported] = useState(false);
	// Set once a period export's own pages are all in AND it has red days: the day
	// reports are rendered next, and onPagesReady only fires once they're done.
	const [dayReportPhase, setDayReportPhase] = useState<{
		periodPages: Array<PdfPageSpec>;
		jobs: Array<DayReportJob>;
	} | null>(null);

	// One request for the whole period's notes; only the period export needs them.
	const notesQuery = useQuery({
		...notesRangeQueryOptions({ ...getPeriodRange(period), userId }),
		enabled: view === "period",
	});
	const notes = notesQuery.data ?? [];

	const exposuresToRender: Array<Exposure> = exposureType === "all" ? ["dust", "noise", "vibration"] : [exposureType];
	const trendPageCount = getTrendPageCount(getTrendMetrics(exposuresToRender).length);
	const pageOrder = getPageOrder(view, exposuresToRender, getPeriodMonths(period).length, trendPageCount);

	const handlePageReady = useCallback(
		({ key, spec }: CollectedPage) => {
			if (hasReported) return;

			// Renderers re-report the same page on re-renders; only a genuinely new page
			// counts as progress, or a stuck export would keep resetting its stall timer.
			const countBefore = collectedRef.current.size;
			collectedRef.current.set(key, spec);
			if (collectedRef.current.size > countBefore) {
				onProgress?.({ step: "collecting", done: collectedRef.current.size, total: pageOrder.length });
			}

			if (collectedRef.current.size === pageOrder.length) {
				const orderedPages = pageOrder.flatMap((pageKey) => {
					const page = collectedRef.current.get(pageKey);
					return page ? [page] : [];
				});

				setHasReported(true);

				// A period export isn't fin- each still
				// needs its day report appended. Everything else is done now.
				const dayReportJobs = view === "period" ? getDayReportJobs(orderedPages) : [];

				if (dayReportJobs.length > 0) {
					setDayReportPhase({ periodPages: orderedPages, jobs: dayReportJobs });
					onProgress?.({ step: "dayReports", done: 0, total: dayReportJobs.length });
				} else {
					onPagesReady(orderedPages);
				}
			}
		},
		[pageOrder, onPagesReady, onProgress, hasReported, view],
	);

	const handleDayReportsDone = useCallback(
		(reports: Array<PdfDayReport>) => {
			if (dayReportPhase) onPagesReady([...dayReportPhase.periodPages, ...reports]);
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
			) : view === "period" ? (
				// Hold off until the notes arrive, so getRedDays never runs against an empty list.
				// One shared PeriodBatchRenderer, not one per exposure - this is what makes the
				// batch size apply across the whole export (e.g. Overview) rather than 3x it.
				notesQuery.isLoading ? null : (
					<>
						<PeriodSummaryRenderer
							period={period}
							userId={userId}
							exposures={exposuresToRender}
							onPageReady={handlePageReady}
						/>
						<PeriodTrendChartsRenderer
							exposures={exposuresToRender}
							period={period}
							userId={userId}
							onPageReady={handlePageReady}
						/>
						<PeriodBatchRenderer
							exposures={exposuresToRender}
							period={period}
							userId={userId}
							notes={notes}
							onPageReady={handlePageReady}
						/>
					</>
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
