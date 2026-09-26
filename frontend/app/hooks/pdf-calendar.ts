/** Vector drawing helpers for PDF calendars and their exposure summaries. */
import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { PdfCalendarDay } from "@/lib/pdf/calendar-days.ts";
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

/** Draws a month calendar and its exposure summary as vector shapes and text. */
export function drawCalendarPage(
	pdf: jsPDF,
	page: { monthDate: TZDate; days: Array<PdfCalendarDay>; summary: SummaryLevelCounts },
	labels: PdfCalendarLabels,
	startY: number,
	margin: number,
): void {
	const cellWidth = 24;
	const cellHeight = 20;
	const calendarWidth = cellWidth * 7;
	const calendarX = (pdf.internal.pageSize.getWidth() - calendarWidth) / 2;
	const headerHeight = 7;

	drawSummary(pdf, page.summary, labels, calendarX, startY, calendarWidth);
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
			const colors = day.dangerLevel ? CELL_COLORS[day.dangerLevel] : null;

			if (colors) {
				pdf.setFillColor(...colors.fill);
				pdf.setDrawColor(...colors.border);
			} else {
				pdf.setFillColor(255, 255, 255);
				pdf.setDrawColor(...GRID_BORDER);
			}

			pdf.roundedRect(cellX + 1, rowY + 1, cellWidth - 2, cellHeight - 2, 1.5, 1.5, "FD");

			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(9);
			pdf.setTextColor(...(day.inMonth ? DAY_TEXT : MUTED_TEXT));
			pdf.text(String(day.date.getDate()), cellX + cellWidth / 2, rowY + cellHeight / 2 + 1.5, {
				align: "center",
			});

			if (day.dangerLevel) {
				drawDangerDots(pdf, day.dangerLevel, cellX + cellWidth - 4, rowY + cellHeight - 4);
			}
		});
	});
}

/** Draws the safe, warning, and danger duration summary boxes. */
function drawSummary(
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
