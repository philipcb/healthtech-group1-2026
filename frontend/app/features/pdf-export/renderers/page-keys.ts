import type { PdfView } from "@/features/pdf-export/pdf-page-spec.ts";
import type { Exposure } from "@/lib/exposures.ts";

/**
 * The key each page is reported under. Renderers report with these and
 * getPageOrder lists them, so both sides always agree on a page's key
 */
export const PAGE_KEYS = {
	/** Day, week and month exports: one page per exposure type. */
	single: (exposure: Exposure) => `${exposure}`,
	summary: "period-summary",
	trend: (index: number) => `period-trend-${index}`,
	calendar: (exposure: Exposure, monthIndex: number) => `${exposure}-calendar-${monthIndex}`,
	redDays: (exposure: Exposure, monthIndex: number) => `${exposure}-redday-${monthIndex}`,
};

/**
 * Every page key the export reports, in the order the pages go into the PDF.
 * Collection is finished once all of them are in. A period export's day
 * reports aren't listed - which days need one is only known once these are in.
 */
export function getPageOrder(
	view: PdfView,
	exposures: Array<Exposure>,
	monthCount: number,
	trendPageCount: number,
): Array<string> {
	if (view !== "period") return exposures.map((exposure) => PAGE_KEYS.single(exposure));
	return [
		PAGE_KEYS.summary,
		...Array.from({ length: trendPageCount }, (_, i) => PAGE_KEYS.trend(i)),
		...exposures.flatMap((exposure) =>
			Array.from({ length: monthCount }, (_, i) => [
				PAGE_KEYS.calendar(exposure, i),
				PAGE_KEYS.redDays(exposure, i),
			]).flat(),
		),
	];
}
