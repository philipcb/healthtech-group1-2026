import type { PdfPageSpec, PdfView } from "@/features/pdf-export/pdf-page-spec.ts";
import type { PdfTocEntry } from "@/hooks/pdf-table-of-contents.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { endOfMonth, startOfMonth } from "date-fns";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Builds every page's title, and the period export's table of contents, by
 * walking the pages themselves - titles[i] always belongs to pages[i], so a
 * title can never end up on the wrong page.
 */
export function usePdfTitles() {
	const { t, i18n } = useTranslation();

	return useCallback(
		(pages: Array<PdfPageSpec>, view: PdfView, userName: string) => {
			const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
				date.toLocaleDateString(i18n.language, options);
			const formatRange = (start: Date, end: Date) =>
				`${formatDate(start, { day: "numeric", month: "short" })} - ${formatDate(end, { day: "numeric", month: "short", year: "numeric" })}`;
			const formatMonth = (month: Date) => formatDate(month, { month: "long", year: "numeric" });
			// Norwegian month names are lowercase.
			const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase(i18n.language) + text.slice(1);
			const heading = (exposure: Exposure, dateText: string) =>
				`${t(($) => $.exposures[exposure])} - ${userName} - ${dateText}`;

			const titles: Array<string> = [];
			// Only used by the period export. Each entry points at a position in `pages`.
			const tocEntries: Array<PdfTocEntry> = [];
			let summaryIndex = 0;
			let currentExposure: Exposure | null = null;
			const dayReportRanges = new Map<Exposure, { first: number; last: number }>();

			pages.forEach((page, index) => {
				switch (page.kind) {
					case "period-summary": {
						summaryIndex = index;
						titles.push(t(($) => $.pdf.summary));
						tocEntries.push({ label: t(($) => $.pdf.summary), level: 0, pageIndex: index });
						break;
					}
					case "period-trend": {
						// The first trend spec is drawn on the summary page, so the
						// trends entry starts there.
						if (page.placement === "below-summary") {
							tocEntries.push({ label: t(($) => $.pdf.trends), level: 0, pageIndex: summaryIndex });
							titles.push(t(($) => $.pdf.summary));
						} else {
							titles.push(t(($) => $.pdf.trends));
						}
						break;
					}
					case "calendar": {
						if (view !== "period") {
							const range = formatRange(
								startOfMonth(page.month, { in: TIMEZONE }),
								endOfMonth(page.month, { in: TIMEZONE }),
							);
							titles.push(heading(page.exposure, range));
							break;
						}
						// A new exposure's first month starts its section in the TOC.
						if (page.exposure !== currentExposure) {
							currentExposure = page.exposure;
							tocEntries.push({
								label: t(($) => $.exposures[page.exposure]),
								level: 0,
								pageIndex: index,
							});
						}
						tocEntries.push({ label: capitalize(formatMonth(page.month)), level: 1, pageIndex: index });
						titles.push(heading(page.exposure, formatMonth(page.month)));
						break;
					}
					case "red-days": {
						titles.push(`${heading(page.exposure, formatMonth(page.month))} - ${t(($) => $.pdf.redDays)}`);
						break;
					}
					case "week-grid": {
						const { days } = page.page;
						titles.push(heading(page.exposure, formatRange(days[0].date, days[days.length - 1].date)));
						break;
					}
					case "day-report": {
						titles.push(
							heading(
								page.exposure,
								formatDate(page.date, { day: "numeric", month: "long", year: "numeric" }),
							),
						);
						if (view === "period") {
							dayReportRanges.set(page.exposure, {
								first: dayReportRanges.get(page.exposure)?.first ?? index,
								last: index,
							});
						}
						break;
					}
				}
			});

			if (dayReportRanges.size > 0) {
				const [firstRange] = dayReportRanges.values();
				tocEntries.push({ label: t(($) => $.pdf.dayReports), level: 0, pageIndex: firstRange.first });
				for (const [exposure, range] of dayReportRanges) {
					tocEntries.push({
						label: t(($) => $.exposures[exposure]),
						level: 1,
						pageIndex: range.first,
						lastPageIndex: range.last,
					});
				}
			}

			return { titles, tocEntries };
		},
		[t, i18n.language],
	);
}
