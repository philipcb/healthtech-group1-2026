import type { PdfWeekGridPage } from "@/hooks/pdf-calendar.ts";
import type { PdfDayReport } from "@/hooks/pdf-day-report.ts";
import type { PdfPeriodSummaryPage } from "@/hooks/pdf-period-summary.ts";
import type { PdfPeriodTrendPage } from "@/hooks/pdf-period-trend-chart.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { PdfCalendarDay } from "@/lib/pdf/calendar-days.ts";
import type { RedDayRow } from "@/lib/pdf/red-days.ts";
import type { calculateSummaryCounts } from "@/lib/time-bucket-utils.ts";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";

export type PdfView = View | "period";

/**
 * How the assembler should draw one page. Each spec also carries what its
 * title needs (exposure, month), so titles are built from the pages themselves.
 *  - "calendar": a vector-drawn calendar page for the month and period exports.
 *  - "red-days": drawn as a real vector table (no image at all), so the
 *    rows stay searchable and can carry links.
 *  - "day-report": one day's report with a Recharts SVG and its hourly grid.
 */
export type PdfPageSpec =
	| PdfPeriodSummaryPage
	| PdfPeriodTrendPage
	| { kind: "week-grid"; exposure: Exposure; page: PdfWeekGridPage }
	| {
			kind: "calendar";
			exposure: Exposure;
			/** Any day in the calendar's month. */
			month: TZDate;
			days: Array<PdfCalendarDay>;
			summary: ReturnType<typeof calculateSummaryCounts>;
	  }
	| { kind: "red-days"; exposure: Exposure; month: TZDate; rows: Array<RedDayRow> }
	| PdfDayReport;

/**
 * How far along a running export is. PdfChartRenderer reports the first two steps as
 * pages and day reports come in; "building" (the final PDF assembly) is set by
 * the dialog, which runs that step itself.
 */
export type PdfExportProgress = {
	step: "collecting" | "dayReports" | "building";
	done: number;
	total: number;
};

/** One page as a renderer reports it: its key in getPageOrder, and how to draw it. */
export interface CollectedPage {
	key: string;
	spec: PdfPageSpec;
}
