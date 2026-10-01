import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import type jsPDF from "jspdf";
import {
	drawCompactDayGrid,
	drawDayGridPage,
	drawExposureSummary,
	type PdfCalendarLabels,
	type PdfDayGridPage,
} from "./pdf-calendar.ts";
import type { PdfLabels } from "./pdf-red-day-table.ts";

export type PdfChartSvg = {
	element: SVGSVGElement;
	width: number;
	height: number;
	hasData: boolean;
};

export type PdfDaySeries = {
	label: string;
	grid: PdfDayGridPage;
	chart: PdfChartSvg;
};

export type PdfDayReport = {
	kind: "day-report";
	exposure: Exposure;
	date: TZDate;
	series: Array<PdfDaySeries>;
};

const GRID_COLOR: [number, number, number] = [220, 224, 228];
const STATUS_COLORS: Record<DangerLevel, [number, number, number]> = {
	safe: [40, 185, 105],
	warning: [230, 137, 43],
	danger: [232, 75, 72],
};

const SVG_STYLE_PROPERTIES = [
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-opacity",
	"stroke-dasharray",
	"stroke-linecap",
	"stroke-linejoin",
	"font-family",
	"font-size",
	"font-weight",
	"text-anchor",
	"dominant-baseline",
	"opacity",
	"stop-color",
	"stop-opacity",
];

/** Makes a Recharts SVG self-contained and compatible with svg2pdf. */
export function serializeChartSvg(source: SVGSVGElement, hasData: boolean): PdfChartSvg {
	const clone = source.cloneNode(true) as SVGSVGElement;
	const sourceNodes = [source, ...Array.from(source.querySelectorAll<SVGElement>("*"))];
	const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<SVGElement>("*"))];
	const colorProperties = new Set(["fill", "stroke", "stop-color"]);
	// svg2pdf does not understand CSS OKLCH colors, so resolve them through the browser's sRGB renderer.
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	/** Converts browser-supported CSS colors to sRGB values understood by svg2pdf. */
	const normalizeColor = (value: string) => {
		if (!context || value === "none" || value === "transparent" || value.startsWith("url(")) return value;
		context.clearRect(0, 0, 1, 1);
		context.fillStyle = "#000000";
		context.fillStyle = value;
		context.fillRect(0, 0, 1, 1);
		const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
		return alpha === 255 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
	};

	// svg2pdf cannot paint a gradient stroke; split the original Recharts path into short, color-matched vectors.
	for (const [index, sourceNode] of sourceNodes.entries()) {
		const computed = window.getComputedStyle(sourceNode);
		const target = cloneNodes[index];
		target.removeAttribute("style");
		for (const property of SVG_STYLE_PROPERTIES) {
			let value = computed.getPropertyValue(property);
			if (value && colorProperties.has(property)) value = normalizeColor(value);
			if (value) target.setAttribute(property, value);
		}
	}
	for (const [index, sourceNode] of sourceNodes.entries()) {
		if (sourceNode.localName !== "path") continue;
		const sourceStroke = sourceNode.getAttribute("stroke") ?? "";
		const gradientId = sourceStroke.match(/^url\(#([^)]*)\)$/)?.[1];
		if (!gradientId) continue;

		const gradient = Array.from(clone.querySelectorAll("linearGradient")).find((item) => item.id === gradientId);
		const stops = gradient ? readGradientStops(gradient) : [];
		if (stops.length === 0) continue;

		const path = sourceNode as SVGPathElement;
		const points = readLinearPathPoints(path.getAttribute("d") ?? "");
		if (points.length < 2) continue;

		const bounds = path.getBBox();
		const fallbackColor = formatPdfColor(getGradientColor(stops, 0.5));
		const segments = points.slice(1).map((point, pointIndex) => {
			const previous = points[pointIndex];
			const midpointY = (previous.y + point.y) / 2;
			const offset = bounds.height > 0 ? (midpointY - bounds.y) / bounds.height : 0.5;
			const segment = cloneNodes[index].cloneNode(false) as SVGPathElement;
			segment.setAttribute("d", `M${previous.x},${previous.y}L${point.x},${point.y}`);
			segment.setAttribute("fill", "none");
			segment.setAttribute("stroke", formatPdfColor(getGradientColor(stops, offset)) || fallbackColor);
			return segment;
		});
		cloneNodes[index].replaceWith(...segments);
	}

	const bounds = source.getBoundingClientRect();
	clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	clone.setAttribute("width", String(bounds.width));
	clone.setAttribute("height", String(bounds.height));
	if (!clone.hasAttribute("viewBox")) {
		clone.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
	}

	return {
		element: clone,
		width: bounds.width,
		height: bounds.height,
		hasData,
	};
}

type GradientStop = { offset: number; color: [number, number, number] };
type SvgPoint = { x: number; y: number };

/** Reads normalized color stops and their positions from a linear gradient. */
function readGradientStops(gradient: SVGLinearGradientElement): Array<GradientStop> {
	return Array.from(gradient.querySelectorAll("stop")).flatMap((stop) => {
		const color = readRgbColor(stop.getAttribute("stop-color") ?? "");
		const offsetValue = stop.getAttribute("offset") ?? "0";
		const offset = Number.parseFloat(offsetValue) / (offsetValue.endsWith("%") ? 100 : 1);
		return color ? [{ offset, color }] : [];
	});
}

/** Extracts the RGB channels from a computed rgb()/rgba() color. */
function readRgbColor(value: string): [number, number, number] | null {
	const channels = value.match(/[\d.]+/g)?.map(Number);
	if (!channels || channels.length < 3) return null;
	return [channels[0], channels[1], channels[2]];
}

/** Formats RGB channels in the syntax used by the cloned SVG. */
function formatPdfColor(color: [number, number, number]): string {
	return `rgb(${color.map((channel) => Math.round(channel)).join(",")})`;
}

/** Finds the color at an offset by interpolating between the surrounding stops. */
function getGradientColor(stops: Array<GradientStop>, offset: number): [number, number, number] {
	const boundedOffset = Math.max(0, Math.min(1, offset));
	let left = stops[0];
	if (boundedOffset <= left.offset) return left.color;
	for (const right of stops.slice(1)) {
		if (boundedOffset < right.offset) {
			const span = right.offset - left.offset;
			const ratio = span > 0 ? (boundedOffset - left.offset) / span : 1;
			return left.color.map((channel, index) => channel + (right.color[index] - channel) * ratio) as [
				number,
				number,
				number,
			];
		}
		left = right;
	}
	return left.color;
}

/** Reads the move/line points emitted by Recharts for a linear curve. */
function readLinearPathPoints(pathData: string): Array<SvgPoint> {
	const commands = pathData.match(/[ML][^ML]*/g) ?? [];
	const [firstCommand, ...remainingCommands] = commands;
	if (!firstCommand || remainingCommands.length === 0 || firstCommand[0] !== "M") return [];
	return commands.flatMap((command) => {
		const values = command
			.slice(1)
			.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)
			?.map(Number);
		if (!values || values.length < 2) return [];
		const points: Array<SvgPoint> = [];
		for (let index = 0; index + 1 < values.length; index += 2) {
			points.push({ x: values[index], y: values[index + 1] });
		}
		return points;
	});
}

export type PdfChartLayout = { x: number; y: number; width: number; height: number };

/** Draws either one full-width report or stacked chart/grid sections for multiple series. */
export async function drawDayReportPage(
	pdf: jsPDF,
	page: PdfDayReport,
	labels: PdfLabels & PdfCalendarLabels,
	startY: number,
	margin: number,
): Promise<void> {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const contentWidth = pageWidth - margin * 2;

	if (page.series.length <= 1) {
		// Single-exposure reports keep the full-width hour grid above a normally proportioned chart.
		const [series] = page.series;
		if (!series) return;

		drawDayGridPage(pdf, series.grid, labels, startY, margin);
		const chartTop = startY + 60;
		const chart = fitChart(series.chart, margin, chartTop, contentWidth, pageHeight - chartTop - margin - 20);
		await drawChartSvg(pdf, series.chart, chart);
		if (!series.chart.hasData) drawNoData(pdf, labels.noData, chart);
		drawThresholdLegend(pdf, chart.x, chart.y + chart.height + 5, labels.danger, labels.warning);
		return;
	}

	// Dust has one compact section per PM field, with the hour squares beside each chart.
	const contentHeight = pageHeight - startY - margin - 4;
	const sectionHeight = contentHeight / page.series.length;
	const sidebarWidth = 58;
	const sidebarGap = 5;
	const chartWidth = contentWidth - sidebarWidth - sidebarGap;
	const chartTopOffset = 22;
	const chartHeight = sectionHeight - chartTopOffset - 12;

	for (const [index, series] of page.series.entries()) {
		const sectionY = startY + index * sectionHeight;
		pdf.setFont("helvetica", "bold");
		pdf.setFontSize(9);
		pdf.setTextColor(45, 55, 65);
		pdf.text(series.label, margin, sectionY + 4);
		drawExposureSummary(pdf, series.grid.summary, labels, margin, sectionY + 6, contentWidth);

		const chart = fitChart(series.chart, margin, sectionY + chartTopOffset, chartWidth, chartHeight);
		await drawChartSvg(pdf, series.chart, chart);
		if (!series.chart.hasData) drawNoData(pdf, labels.noData, chart);
		drawThresholdLegend(pdf, chart.x, chart.y + chart.height + 3, labels.danger, labels.warning);
		drawCompactDayGrid(
			pdf,
			series.grid,
			labels,
			margin + chartWidth + sidebarGap,
			sectionY + chartTopOffset,
			sidebarWidth,
			chartHeight,
		);

		if (index < page.series.length - 1) {
			pdf.setDrawColor(...GRID_COLOR);
			pdf.setLineWidth(0.2);
			pdf.line(margin, sectionY + sectionHeight, pageWidth - margin, sectionY + sectionHeight);
		}
	}
}

/** Fits an SVG inside a layout box without changing its aspect ratio. */
function fitChart(chart: PdfChartSvg, x: number, y: number, maxWidth: number, maxHeight: number): PdfChartLayout {
	const scale = Math.min(maxWidth / Math.max(chart.width, 1), maxHeight / Math.max(chart.height, 1));
	const width = chart.width * scale;
	const height = chart.height * scale;
	return { x: x + (maxWidth - width) / 2, y: y + (maxHeight - height) / 2, width, height };
}

/** Adds the detached SVG to the current PDF page as vector content. */
async function drawChartSvg(pdf: jsPDF, chart: PdfChartSvg, layout: PdfChartLayout): Promise<void> {
	if (chart.width <= 0 || chart.height <= 0) return;
	// Lazy loading keeps Vite from loading svg2pdf while the operator route starts.
	const { svg2pdf } = await import("svg2pdf.js");
	await svg2pdf(chart.element, pdf, layout);
}

/** Places a localized message over the chart area when its series has no points. */
function drawNoData(pdf: jsPDF, label: string, layout: PdfChartLayout): void {
	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(7);
	pdf.setTextColor(80, 80, 80);
	pdf.text(label, layout.x + layout.width / 2, layout.y + layout.height / 2, { align: "center" });
}

/** Draws the danger and warning threshold samples below a chart. */
function drawThresholdLegend(pdf: jsPDF, x: number, y: number, danger: string, warning: string): void {
	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(5.5);
	pdf.setTextColor(45, 55, 65);
	const entries: Array<{ label: string; color: [number, number, number]; offset: number }> = [
		{ label: danger, color: STATUS_COLORS.danger, offset: 0 },
		{ label: warning, color: STATUS_COLORS.warning, offset: 49 },
	];
	for (const { label, color, offset } of entries) {
		pdf.setDrawColor(...color);
		pdf.setLineWidth(0.35);
		pdf.setLineDashPattern([1.5, 1], 0);
		pdf.line(x + offset, y, x + offset + 6, y);
		pdf.setLineDashPattern([], 0);
		pdf.text(label, x + offset + 8, y + 1.5);
	}
}
