import type jsPDF from "jspdf";
import { drawChartSvg, drawNoData, drawThresholdLegend, fitChart, type PdfChartSvg } from "./pdf-day-report.ts";

export type PdfYearTrendSeries = {
	label: string;
	/** Short reader hint, e.g. "Shows the average value per day". */
	description: string;
	chart: PdfChartSvg;
};

export type PdfYearTrendPage = {
	kind: "year-trend";
	/**
	 * "below-summary": drawn under the summary table, no new PDF page.
	 * "full-page": gets its own PDF page.
	 */
	placement: "below-summary" | "full-page";
	series: Array<PdfYearTrendSeries>;
};

export type PdfYearTrendLabels = {
	danger: string;
	warning: string;
	noData: string;
};

/** Space (mm) used by the heading and description above each chart. */
const HEADING_HEIGHT = 13;
/** Fixed distance (mm) between the description and the top of the chart. Same on every page. */
const HEADING_TO_CHART_GAP = 14;
/** Space (mm) reserved below each chart for the threshold legend. */
const LEGEND_HEIGHT = 8;

/** Draws 1-2 stacked trend charts, each with a heading and a short description. */
export async function drawYearTrendPage(
	pdf: jsPDF,
	page: PdfYearTrendPage,
	labels: PdfYearTrendLabels,
	startY: number,
	margin: number,
): Promise<void> {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const contentWidth = pageWidth - margin * 2;
	const contentHeight = pageHeight - startY - margin;
	// Only decides where each section STARTS. The chart itself is anchored to its heading.
	const sectionHeight = contentHeight / page.series.length;

	for (const [index, series] of page.series.entries()) {
		const sectionY = startY + index * sectionHeight;

		pdf.setFont("helvetica", "bold");
		pdf.setFontSize(10);
		pdf.setTextColor(45, 55, 65);
		pdf.text(series.label, margin, sectionY + 5);

		pdf.setFont("helvetica", "normal");
		pdf.setFontSize(8);
		pdf.setTextColor(100, 100, 100);
		pdf.text(series.description, margin, sectionY + 10);

		const chartTop = sectionY + HEADING_HEIGHT + HEADING_TO_CHART_GAP;
		const maxChartHeight = sectionHeight - HEADING_HEIGHT - HEADING_TO_CHART_GAP - LEGEND_HEIGHT;
		const fitted = fitChart(series.chart, margin, chartTop, contentWidth, maxChartHeight);
		// fitChart centres vertically inside the box; pin the chart to the top instead,
		// so the gap under the heading is the same no matter how much room is left.
		const chart = { ...fitted, y: chartTop };

		await drawChartSvg(pdf, series.chart, chart);
		if (!series.chart.hasData) drawNoData(pdf, labels.noData, chart);
		drawThresholdLegend(pdf, chart.x, chart.y + chart.height + 5, labels.danger, labels.warning);
	}
}
