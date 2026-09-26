/** Vector drawing helpers for PDF calendars and their exposure summaries. */
import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { PdfCalendarDay } from "@/lib/pdf/calendar-days.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { SummaryLevelCounts } from "@/lib/time-bucket-types.ts";
import type { TZDate } from "@date-fns/tz";
import type jsPDF from "jspdf";

export type PdfCalendarLabels = {
	/** Single-letter or short weekday abbreviations, Monday first — e.g. ["Ma","Ti","On","To","Fr","Lø","Sø"]. */
	weekdays: Array<string>;
	safe: string;
	warning: string;
	danger: string;
	formatHoursAndMinutes: (minutes: number) => string;
	formatHour: (hour: number) => string;
	exposureName: (exposure: Exposure) => string;
};

export type PdfDayGridPage = {
	exposure: Exposure;
	hours: Array<{ hour: number; dangerLevel: DangerLevel | null }>;
	summary: SummaryLevelCounts;
};

export type PdfWeekGridPage = {
	hours: Array<number>;
	days: Array<{ date: TZDate; dangerLevels: Array<DangerLevel | null> }>;
	summary: SummaryLevelCounts;
};

const CELL_COLORS: Record<DangerLevel, { fill: [number, number, number]; border: [number, number, number] }> = {
	safe: { fill: [225, 250, 227], border: [99, 199, 118] },
	warning: { fill: [255, 227, 194], border: [225, 143, 57] },
	danger: { fill: [255, 212, 205], border: [240, 86, 83] },
};

const GRID_BORDER: [number, number, number] = [222, 222, 223];
const MUTED_TEXT: [number, number, number] = [140, 140, 140];
const DAY_TEXT: [number, number, number] = [40, 40, 40];
const TEXT_COLORS: Record<DangerLevel, [number, number, number]> = {
	safe: [0, 58, 0],
	warning: [84, 6, 0],
	danger: [107, 0, 0],
};
const SECONDARY: [number, number, number] = [247, 247, 248];
const MONTH_CALENDAR_WIDTH = 24 * 7;

/** Draws a month calendar and its exposure summary as vector shapes and text. */
export function drawCalendarPage(
	pdf: jsPDF,
	page: { monthDate: TZDate; days: Array<PdfCalendarDay>; summary: SummaryLevelCounts },
	labels: PdfCalendarLabels,
	startY: number,
): void {
	const cellWidth = 24;
	const cellHeight = 20;
	const calendarWidth = MONTH_CALENDAR_WIDTH;
	const calendarX = (pdf.internal.pageSize.getWidth() - calendarWidth) / 2;
	const headerHeight = 7;

	drawExposureSummary(pdf, page.summary, labels, calendarX, startY, calendarWidth);
	const weekdayY = startY + 24;

	// Weekday header row
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(9);
	pdf.setTextColor(...MUTED_TEXT);
	labels.weekdays.forEach((label, i) => {
		pdf.text(label, calendarX + i * cellWidth + cellWidth / 2, weekdayY, { align: "center" });
	});

	// Day cells, 7 per row
	const weeks: Array<Array<PdfCalendarDay>> = [];
	for (let i = 0; i < page.days.length; i += 7) {
		weeks.push(page.days.slice(i, i + 7));
	}

	weeks.forEach((week, weekIndex) => {
		const rowY = weekdayY + headerHeight + weekIndex * cellHeight;

		week.forEach((day, dayIndex) => {
			const cellX = calendarX + dayIndex * cellWidth;
			drawDangerCell(pdf, day.dangerLevel, cellX + 1, rowY + 1, cellWidth - 2, cellHeight - 2);

			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(9);
			pdf.setTextColor(...(day.inMonth ? DAY_TEXT : MUTED_TEXT));
			pdf.text(String(day.date.getDate()), cellX + cellWidth / 2, rowY + cellHeight / 2 + 1.5, {
				align: "center",
			});
		});
	});
}

/** Draws a single day's hourly exposure cells and summary. */
export function drawDayGridPage(
	pdf: jsPDF,
	page: PdfDayGridPage,
	labels: PdfCalendarLabels,
	startY: number,
	margin: number,
) {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const gridWidth = Math.min(MONTH_CALENDAR_WIDTH, pageWidth - margin * 2);
	const gridX = (pageWidth - gridWidth) / 2;
	drawExposureSummary(pdf, page.summary, labels, gridX, startY, gridWidth);

	const gap = 1;
	const cellWidth = Math.min(12, (gridWidth - gap * (page.hours.length - 1)) / page.hours.length);
	const totalWidth = cellWidth * page.hours.length + gap * (page.hours.length - 1);
	const cellsX = (pageWidth - totalWidth) / 2;
	const labelY = startY + 32;
	const cellY = labelY + 5;

	page.hours.forEach(({ hour, dangerLevel }, index) => {
		const cellX = cellsX + index * (cellWidth + gap);
		drawDangerCell(pdf, dangerLevel, cellX, cellY, cellWidth, cellWidth);
		pdf.setFontSize(cellWidth < 10 ? 6 : 7);
		pdf.setTextColor(...MUTED_TEXT);
		pdf.text(labels.formatHour(hour), cellX + cellWidth / 2, cellY + cellWidth + 4, { align: "center" });
	});
}

/** Draws a week's hourly exposure cells and summary. */
export function drawWeekGridPage(
	pdf: jsPDF,
	page: PdfWeekGridPage,
	labels: PdfCalendarLabels,
	startY: number,
	margin: number,
) {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const summaryWidth = Math.min(MONTH_CALENDAR_WIDTH, pageWidth - margin * 2);
	const summaryX = (pageWidth - summaryWidth) / 2;
	drawExposureSummary(pdf, page.summary, labels, summaryX, startY, summaryWidth);

	const timeColumnWidth = 13;
	const gridWidth = summaryWidth;
	const gridX = summaryX + timeColumnWidth;
	const columnWidth = (gridWidth - timeColumnWidth) / 7;
	const headerY = startY + 31;
	const firstRowY = headerY + 7;
	const rowHeight = Math.min(9, (150 - firstRowY) / page.hours.length);

	page.days.forEach(({ date }, index) => {
		const dayX = gridX + index * columnWidth;
		pdf.setFont("helvetica", "normal");
		pdf.setFontSize(8);
		pdf.setTextColor(...MUTED_TEXT);
		pdf.text(`${labels.weekdays[index]} ${date.getDate()}`, dayX + columnWidth / 2, headerY, { align: "center" });
	});

	page.hours.forEach((hour, rowIndex) => {
		const rowY = firstRowY + rowIndex * rowHeight;
		pdf.setFont("helvetica", "normal");
		pdf.setFontSize(7);
		pdf.setTextColor(...MUTED_TEXT);
		pdf.text(labels.formatHour(hour), summaryX, rowY + rowHeight / 2 + 1, { align: "left" });

		page.days.forEach((day, dayIndex) => {
			drawDangerCell(
				pdf,
				day.dangerLevels[rowIndex] ?? null,
				gridX + dayIndex * columnWidth + 1,
				rowY + 0.5,
				columnWidth - 1,
				rowHeight - 1,
			);
		});
	});
}

/** Draws the safe, warning, and danger duration summary boxes. */
export function drawExposureSummary(
	pdf: jsPDF,
	summary: SummaryLevelCounts,
	labels: PdfCalendarLabels,
	x: number,
	y: number,
	width: number,
) {
	const levels: Array<{ level: DangerLevel; label: string; minutes: number }> = [
		{ level: "safe", label: labels.safe, minutes: summary.safeMinutes },
		{ level: "warning", label: labels.warning, minutes: summary.warningMinutes },
		{ level: "danger", label: labels.danger, minutes: summary.dangerMinutes },
	];
	const gap = 3;
	const boxWidth = (width - gap * 2) / 3;

	levels.forEach(({ level, label, minutes }, index) => {
		const boxX = x + index * (boxWidth + gap);
		const colors = CELL_COLORS[level];
		pdf.setFillColor(...(minutes > 0 ? colors.fill : SECONDARY));
		pdf.setDrawColor(...(minutes > 0 ? colors.border : GRID_BORDER));
		pdf.roundedRect(boxX, y, boxWidth, 12, 1.5, 1.5, "FD");
		pdf.setTextColor(...(minutes > 0 ? TEXT_COLORS[level] : MUTED_TEXT));
		pdf.setFont("helvetica", "normal");
		pdf.setFontSize(8);
		pdf.text(label, boxX + 2, y + 4.5);
		pdf.setFontSize(9);
		pdf.text(labels.formatHoursAndMinutes(minutes), boxX + 2, y + 9);
	});
}

function drawDangerCell(
	pdf: jsPDF,
	dangerLevel: DangerLevel | null,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	const colors = dangerLevel ? CELL_COLORS[dangerLevel] : null;
	pdf.setFillColor(...(colors?.fill ?? [255, 255, 255]));
	pdf.setDrawColor(...(colors?.border ?? GRID_BORDER));
	pdf.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
	if (dangerLevel) drawDangerDots(pdf, dangerLevel, x + width - 2, y + height - 2);
}

/** Draws the dot pattern associated with a danger level. */
function drawDangerDots(pdf: jsPDF, dangerLevel: DangerLevel, x: number, y: number) {
	pdf.setFillColor(...TEXT_COLORS[dangerLevel]);
	const radius = 0.4;

	if (dangerLevel === "safe") {
		pdf.circle(x, y, radius, "F");
	} else if (dangerLevel === "warning") {
		pdf.circle(x, y - 0.8, radius, "F");
		pdf.circle(x, y + 0.8, radius, "F");
	} else {
		pdf.circle(x, y - 1.1, radius, "F");
		pdf.circle(x - 1.1, y + 0.8, radius, "F");
		pdf.circle(x + 1.1, y + 0.8, radius, "F");
	}
}
