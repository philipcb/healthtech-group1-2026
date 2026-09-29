import type { PdfPageSpec } from "@/features/pdf-export/pdf-chart-renderer.tsx";
import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";
import { useCallback } from "react";
import { type CoverPageData, drawCoverPage } from "./pdf-cover-page.ts";
import { getDayReportKey } from "@/lib/pdf/red-days.ts";
import { type DayReportLinkArea, drawRedDayTable, type PdfLabels } from "./pdf-red-day-table.ts";
import { drawCalendarPage, drawDayGridPage, drawWeekGridPage, type PdfCalendarLabels } from "./pdf-calendar.ts";

const waitForStableDom = (element: HTMLElement, { quietMs = 300, timeoutMs = 4000 } = {}) =>
	new Promise<void>((resolve) => {
		let quietTimer: ReturnType<typeof setTimeout>;

		const finish = () => {
			observer.disconnect();
			clearTimeout(quietTimer);
			clearTimeout(maxTimer);
			resolve();
		};

		const scheduleQuiet = () => {
			clearTimeout(quietTimer);
			quietTimer = setTimeout(finish, quietMs);
		};

		const observer = new MutationObserver(scheduleQuiet);
		observer.observe(element, { childList: true, subtree: true, characterData: true, attributes: true });

		const maxTimer = setTimeout(finish, timeoutMs);
		scheduleQuiet(); // in case nothing changes at all after this point
	});

const elementToCanvas = async (elementId: string) => {
	const container = document.getElementById(elementId);
	if (!container) return null;

	await waitForStableDom(container);

	const wrapper = container.classList.contains("pdf-export-container")
		? container
		: (container.querySelector<HTMLElement>(".recharts-wrapper") ?? container);

	if (!wrapper) return null;

	return toCanvas(wrapper, { skipFonts: true, pixelRatio: 2 });
};

export type CapturedImage = { dataUrl: string; width: number; height: number };

/**
 * Captures an off-screen element right away and returns its image data, instead
 * of an id to look up in a later pass. Used by the year export's day reports,
 * which are rendered a few at a time and unmounted as soon as they're done - by
 * the time the PDF is assembled, their elements no longer exist to look up.
 */
export const captureElementAsImage = async (elementId: string): Promise<CapturedImage | null> => {
	const canvas = await elementToCanvas(elementId);
	if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

	return { dataUrl: canvas.toDataURL("image/png", 1.0), width: canvas.width, height: canvas.height };
};

const A4_LANDSCAPE_WIDTH = 297;
const A4_LANDSCAPE_HEIGHT = 210;
const PAGE_MARGIN = 12;
const TITLE_HEIGHT = 20;

// Scales a captured canvas to fit the available PDF page area.
const getImageLayout = (dimensions: { width: number; height: number }) => {
	const maxWidth = A4_LANDSCAPE_WIDTH - PAGE_MARGIN * 2;
	const maxHeight = A4_LANDSCAPE_HEIGHT - PAGE_MARGIN - TITLE_HEIGHT;
	const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height);
	const width = dimensions.width * scale;
	const height = dimensions.height * scale;

	return {
		x: (A4_LANDSCAPE_WIDTH - width) / 2,
		y: TITLE_HEIGHT + PAGE_MARGIN,
		width,
		height,
	};
};

const drawPageTitle = (pdf: jsPDF, title: string) => {
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(14);
	pdf.setTextColor(0, 0, 0);

	pdf.text(title, A4_LANDSCAPE_WIDTH / 2, 15, {
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
		) => {
			const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
			drawCoverPage(pdf, coverPageData);
			const pdfOrientation = "landscape";
			// Red-day date cells, and the page each day report starts on. Reports are
			// drawn after the tables that link to them, so links are attached below,
			// once every report's page number is known.
			const linkAreas: Array<DayReportLinkArea> = [];
			const dayReportPages = new Map<string, number>();

			for (let i = 0; i < pages.length; i++) {
				const page = pages[i];

				if (page.kind === "image") {
					// Deferred capture: the element is still in the document, looked up by id.
					const canvas = await elementToCanvas(page.id);
					if (!canvas) continue;

					const imgData = canvas.toDataURL("image/png", 1.0);
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					// can change pdf page orientation based on what type of page is being added
					const image = getImageLayout(canvas);
					pdf.addImage(imgData, "PNG", image.x, image.y, image.width, image.height);
				} else if (page.kind === "calendar") {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					drawCalendarPage(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4);
				} else if (page.kind === "day-grid") {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					drawDayGridPage(pdf, page.page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
				} else if (page.kind === "week-grid") {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					drawWeekGridPage(pdf, page.page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
				} else if (page.kind === "red-days") {
					pdf.addPage("a4", pdfOrientation);
					drawPageTitle(pdf, titles[i]);
					linkAreas.push(...drawRedDayTable(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN, PAGE_MARGIN));
				} else if (page.kind === "day-report") {
					// Two PDF pages (hour grid, then chart) under one title - the same
					// layout as a standalone day export, minus its cover page.
					pdf.addPage("a4", pdfOrientation);
					dayReportPages.set(getDayReportKey(page.exposure, page.date), pdf.getCurrentPageInfo().pageNumber);
					drawPageTitle(pdf, titles[i]);
					if (page.grid) {
						drawDayGridPage(pdf, page.grid, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
					}

					if (page.chart) {
						pdf.addPage("a4", pdfOrientation);
						drawPageTitle(pdf, titles[i]);
						const image = getImageLayout(page.chart);
						pdf.addImage(page.chart.dataUrl, "PNG", image.x, image.y, image.width, image.height);
					}
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
