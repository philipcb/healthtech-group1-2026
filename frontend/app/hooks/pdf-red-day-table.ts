import type { Exposure } from "@/lib/exposures.ts";
import { getDayReportKey, type RedDayRow } from "@/lib/pdf/red-days.ts";
import type { TZDate } from "@date-fns/tz";
import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Everything the red-day table needs from i18n and the locale, resolved once in
 * pdf-export-dialog.tsx. Keeping it in a plain object means this module stays
 * free of React and can be called from inside the PDF assembler loop.
 */
export type PdfLabels = {
	date: string;
	average: string;
	/** "Within safe limits" */
	safe: string;
	/** "Above action value" */
	warning: string;
	/** "Above limit value" */
	danger: string;
	note: string;
	noRedDays: string;
	noData: string;
	periodSummary: {
		exposure: string;
		totalRedDays: string;
		worstMonth: string;
		registeredDays: string;
		averageExposure: string;
	};
	formatDay: (date: TZDate) => string;
	formatValue: (exposure: Exposure, value: number) => string;
	formatAverage: (exposure: Exposure, value: number | null) => string;
	formatDuration: (minutes: number) => string;
};

/** Where a red day's date cell was drawn, so it can link to that day's report. */
export type DayReportLinkArea = {
	key: string;
	pageNumber: number;
	x: number;
	y: number;
	width: number;
	height: number;
};

// Standard link blue, so the date column reads as clickable.
const LINK_COLOR: [number, number, number] = [37, 99, 235];

/**
 * Draws one month's red days as a real vector table, so the rows stay
 * searchable. Returns where each date cell ended up: the day reports it links
 * to are drawn after this, so the links can only be attached once they exist.
 */
export function drawRedDayTable(
	pdf: jsPDF,
	page: { exposure: Exposure; rows: Array<RedDayRow> },
	labels: PdfLabels,
	startY: number,
	margin: number,
): Array<DayReportLinkArea> {
	if (page.rows.length === 0) {
		pdf.setFont("helvetica", "normal");
		pdf.setFontSize(11);
		pdf.text(labels.noRedDays, margin, startY);
		return [];
	}

	const linkAreas: Array<DayReportLinkArea> = [];

	autoTable(pdf, {
		startY,
		margin: { left: margin, right: margin },
		styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
		headStyles: { fillColor: [244, 244, 245], textColor: 40 },
		columnStyles: {
			0: { cellWidth: 16, textColor: LINK_COLOR },
			1: { cellWidth: 20 },
			// The note is free text, so it gets the slack while the rest stay compact.
			5: { cellWidth: 80 },
		},
		// The table can spill onto a second page, so record each cell's real page.
		didDrawCell: (data) => {
			if (data.section !== "body" || data.column.index !== 0) return;
			const row = page.rows[data.row.index];
			if (!row) return;

			linkAreas.push({
				key: getDayReportKey(row.exposure, row.date),
				pageNumber: pdf.getCurrentPageInfo().pageNumber,
				x: data.cell.x,
				y: data.cell.y,
				width: data.cell.width,
				height: data.cell.height,
			});
		},
		head: [[labels.date, labels.average, labels.safe, labels.warning, labels.danger, labels.note]],
		body: page.rows.map((row) => [
			labels.formatDay(row.date),
			labels.formatValue(row.exposure, row.averageValue),
			labels.formatDuration(row.zoneMinutes.safeMinutes),
			labels.formatDuration(row.zoneMinutes.warningMinutes),
			labels.formatDuration(row.zoneMinutes.dangerMinutes),
			row.note ?? "-",
		]),
	});

	return linkAreas;
}
