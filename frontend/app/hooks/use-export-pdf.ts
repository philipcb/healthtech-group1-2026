import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";
import { useCallback } from "react";
import { drawCoverPage, type CoverPageData } from "./pdf-cover-page.ts";

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

const A4_LANDSCAPE_WIDTH = 297;
const A4_LANDSCAPE_HEIGHT = 210;
const PAGE_MARGIN = 12;
const TITLE_HEIGHT = 20;

const getImageLayout = (canvas: HTMLCanvasElement) => {
	const maxWidth = A4_LANDSCAPE_WIDTH - PAGE_MARGIN * 2;
	const maxHeight = A4_LANDSCAPE_HEIGHT - PAGE_MARGIN - TITLE_HEIGHT;
	const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
	const width = canvas.width * scale;
	const height = canvas.height * scale;

	return {
		x: (A4_LANDSCAPE_WIDTH - width) / 2,
		y: TITLE_HEIGHT + (maxHeight - height) / 2,
		width,
		height,
	};
};

export const useExportPDF = () => {
	const exportToPDF = useCallback(async (elementId: string, fileName: string, title: string) => {
		const canvas = await elementToCanvas(elementId);
		if (!canvas) return;

		const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

		pdf.setFont("helvetica", "bold");
		pdf.setFontSize(14);

		pdf.text(title, A4_LANDSCAPE_WIDTH / 2, 15, {
			align: "center",
		});

		const imgData = canvas.toDataURL("image/png", 1.0);
		const image = getImageLayout(canvas);

		pdf.addImage(imgData, "PNG", image.x, image.y, image.width, image.height);

		pdf.save(`${fileName}.pdf`);
	}, []);

	const exportMultipleToPDF = useCallback(
		async (elementIds: Array<string>, fileName: string, titles: Array<string>, coverPageData: CoverPageData) => {
			const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
			drawCoverPage(pdf, coverPageData);

			for (let i = 0; i < elementIds.length; i++) {
				const canvas = await elementToCanvas(elementIds[i]);
				if (!canvas) continue;

				const imgData = canvas.toDataURL("image/png", 1.0);
				pdf.addPage("a4", "landscape");

				pdf.setFont("helvetica", "bold");
				pdf.setFontSize(14);

				pdf.text(titles[i], A4_LANDSCAPE_WIDTH / 2, 15, {
					align: "center",
				});

				const image = getImageLayout(canvas);
				pdf.addImage(imgData, "PNG", image.x, image.y, image.width, image.height);
			}

			pdf.save(`${fileName}.pdf`);
		},
		[],
	);

	return { exportToPDF, exportMultipleToPDF };
};
