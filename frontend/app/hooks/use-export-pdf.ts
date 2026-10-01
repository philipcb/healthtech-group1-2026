import type { PdfPageSpec } from "@/features/pdf-export/pdf-chart-renderer.tsx";
import { drawDayReportPage } from "@/hooks/pdf-day-report.ts";
import { getDayReportKey } from "@/lib/pdf/red-days.ts";
import jsPDF from "jspdf";
import { useCallback } from "react";
import { drawCalendarPage, drawWeekGridPage, type PdfCalendarLabels } from "./pdf-calendar.ts";
import { type CoverPageData, drawCoverPage } from "./pdf-cover-page.ts";
import { type DayReportLinkArea, drawRedDayTable, type PdfLabels } from "./pdf-red-day-table.ts";
import {
	drawTableOfContentsEntries,
	type PdfTocEntry,
	type ResolvedTocEntry,
	TOC_ENTRIES_PER_PAGE,
} from "./pdf-table-of-contents.ts";

const PAGE_MARGIN = 12;
const TITLE_HEIGHT = 20;

const drawPageTitle = (pdf: jsPDF, title: string) => {
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(14);
	pdf.setTextColor(0, 0, 0);

	pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 15, {
		align: "center",
	});
};

// Reads the current page's own size, so it stays centred on a portrait page too.
const drawPageNumber = (pdf: jsPDF, pageNumber: number, _pageCount: number) => {
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(9);
	pdf.setTextColor(120, 120, 120);

	pdf.text(`${pageNumber}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 6, {
		align: "center",
	});
};

export const useExportPDF = () => {
	/**
	 * `pages` and `titles` are index-aligned: PdfChartRenderer reports pages in a
	 * fixed order and pdf-export-dialog.tsx builds titles in that same order.
	 */
	const exportPagesToPDF = useCallback(
		async (
			pages: Array<PdfPageSpec>,
			fileName: string,
			titles: Array<string>,
			coverPageData: CoverPageData,
			labels: PdfLabels & PdfCalendarLabels,
			/** Only the year export has one; null skips it entirely. */
			toc: { title: string; entries: Array<PdfTocEntry> } | null,
		) => {
			const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
			drawCoverPage(pdf, coverPageData);
			const pdfOrientation = "portrait";

			// The TOC goes right after the cover, but lists page numbers that are only
			// known once everything else is drawn - so reserve its pages now and fill
			// them in at the end. Inserting pages afterwards instead would shift every
			// page number, including the red-day links' targets.
			const tocPageCount = toc ? Math.ceil(toc.entries.length / TOC_ENTRIES_PER_PAGE) : 0;
			const firstTocPage = pdf.getNumberOfPages() + 1;
			for (let p = 0; p < tocPageCount; p++) pdf.addPage("a4", pdfOrientation);

			// Which PDF pages each entry of `pages` landed on. A long red-day table
			// can spill onto a second page.
			const pageRanges: Array<{ first: number; last: number } | undefined> = [];
			// Red-day date cells, and the page each day report starts on. Reports are
			// drawn after the tables that link to them, so links are attached below,
			// once every report's page number is known.
			const linkAreas: Array<DayReportLinkArea> = [];
			const dayReportPages = new Map<string, number>();

			for (let i = 0; i < pages.length; i++) {
				const page = pages[i];
				const pagesBefore = pdf.getNumberOfPages();

				if (page.kind === "calendar") {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					drawCalendarPage(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4);
				} else if (page.kind === "week-grid") {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					drawWeekGridPage(pdf, page.page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
				} else if (page.kind === "red-days" && page.rows.length > 0) {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					linkAreas.push(...drawRedDayTable(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN, PAGE_MARGIN));
				} else if (page.kind === "day-report") {
					pdf.addPage("a4", pdfOrientation);
					dayReportPages.set(getDayReportKey(page.exposure, page.date), pdf.getCurrentPageInfo().pageNumber);
					drawPageTitle(pdf, titles[i]);
					await drawDayReportPage(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
				}

				const pagesAfter = pdf.getNumberOfPages();
				if (pagesAfter > pagesBefore) pageRanges[i] = { first: pagesBefore + 1, last: pagesAfter };
			}

			if (toc) {
				// Swap each entry's page index for the PDF pages it actually landed on.
				const resolvedEntries: Array<ResolvedTocEntry> = toc.entries.flatMap((entry) => {
					const range = pageRanges[entry.pageIndex];
					if (!range) return [];
					const lastPage =
						entry.lastPageIndex === undefined ? undefined : pageRanges[entry.lastPageIndex]?.last;
					return [{ label: entry.label, level: entry.level, firstPage: range.first, lastPage }];
				});

				for (let p = 0; p < tocPageCount; p++) {
					pdf.setPage(firstTocPage + p);
					drawPageTitle(pdf, toc.title);
					drawTableOfContentsEntries(
						pdf,
						resolvedEntries.slice(p * TOC_ENTRIES_PER_PAGE, (p + 1) * TOC_ENTRIES_PER_PAGE),
						TITLE_HEIGHT + PAGE_MARGIN + 4,
						PAGE_MARGIN,
					);
				}
			}

			// Page numbers in the footer, so the TOC's numbers can be followed on paper
			// too. Drawn last, once the total is known. The cover is left unnumbered but
			// still counted, so the numbers match the TOC and the PDF viewer.
			if (toc) {
				const pageCount = pdf.getNumberOfPages();
				for (let p = 2; p <= pageCount; p++) {
					pdf.setPage(p);
					drawPageNumber(pdf, p, pageCount);
				}
			}

			// pdf.link attaches to the current page, so jump back to each date cell's
			// page before linking it. A row whose report is missing gets no link.
			for (const area of linkAreas) {
				const target = dayReportPages.get(area.key);
				if (target === undefined) continue;

				pdf.setPage(area.pageNumber);
				pdf.link(area.x, area.y, area.width, area.height, { pageNumber: target });
			}

			pdf.save(`${fileName}.pdf`);
		},
		[],
	);

	return { exportPagesToPDF };
};
