import type { PdfPageSpec } from "@/features/pdf-export/pdf-chart-renderer.tsx";
import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";
import { useCallback } from "react";
import { type CoverPageData, drawCoverPage } from "./pdf-cover-page.ts";
import { drawRedDayTable, type PdfLabels } from "./pdf-red-day-table.ts";
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

/**
 * Captures an off-screen element and returns its image data right away,
 * instead of just an id to look up in a later pass. The year export uses
 * this: it captures each month as soon as that month's data has loaded, then
 * unmounts it before starting the next one, so the element never needs to
 * stay in the document until a separate assembly step runs later.
 */
export const captureElementAsImage = async (
	elementId: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
	const canvas = await elementToCanvas(elementId);
	if (!canvas) return null;

	return { dataUrl: canvas.toDataURL("image/png", 1.0), width: canvas.width, height: canvas.height };
};

const A4_LANDSCAPE_WIDTH = 297;
const A4_LANDSCAPE_HEIGHT = 210;
const PAGE_MARGIN = 12;
const TITLE_HEIGHT = 20;

// Accepts anything with width/height, so both a raw HTMLCanvasElement (the
// "image" case, captured right before this is called) and a plain
// {width, height} pair (the "image-captured" case, captured earlier and
// carried in the page spec) can share this layout math.
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

			for (let i = 0; i < pages.length; i++) {
				const page = pages[i];

				if (page.kind === "image") {
					// Deferred capture: the element is still in the document, looked up by id.
					const canvas = await elementToCanvas(page.id);
					if (!canvas) continue;

					const imgData = canvas.toDataURL("image/png", 1.0);
					pdf.addPage("a4", "landscape");
					drawPageTitle(pdf, titles[i]);

					const image = getImageLayout(canvas);
					pdf.addImage(imgData, "PNG", image.x, image.y, image.width, image.height);
				} else if (page.kind === "calendar") {
					pdf.addPage("a4", "landscape");
					drawPageTitle(pdf, titles[i]);
					drawCalendarPage(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4);
				} else if (page.kind === "day-grid") {
					pdf.addPage("a4", "landscape");
					drawPageTitle(pdf, titles[i]);
					drawDayGridPage(pdf, page.page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
				} else if (page.kind === "week-grid") {
					pdf.addPage("a4", "landscape");
					drawPageTitle(pdf, titles[i]);
					drawWeekGridPage(pdf, page.page, labels, TITLE_HEIGHT + PAGE_MARGIN + 4, PAGE_MARGIN);
				} else {
					pdf.addPage("a4", "landscape");
					drawPageTitle(pdf, titles[i]);
					drawRedDayTable(pdf, page, labels, TITLE_HEIGHT + PAGE_MARGIN, PAGE_MARGIN);
				}
			}

			pdf.save(`${fileName}.pdf`);
		},
		[],
	);

	return { exportPagesToPDF };
};
