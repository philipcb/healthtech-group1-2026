import type { Exposure } from "@/lib/exposures.ts";
import type { RedDayRow } from "@/lib/pdf/red-days.ts";
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
	formatDay: (date: TZDate) => string;
	formatValue: (exposure: Exposure, value: number) => string;
	formatDuration: (minutes: number) => string;
};

/**
 * Draws one month's red days as a real vector table, so the rows stay
 * searchable and can later carry links to the appended day reports.
 */
export function drawRedDayTable(
	pdf: jsPDF,
	page: { exposure: Exposure; rows: Array<RedDayRow> },
	labels: PdfLabels,
	startY: number,
	margin: number,
): void {
	if (page.rows.length === 0) {
		pdf.setFont("helvetica", "normal");
		pdf.setFontSize(11);
		pdf.text(labels.noRedDays, margin, startY);
		return;
	}

	autoTable(pdf, {
		startY,
		margin: { left: margin, right: margin },
		styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
		headStyles: { fillColor: [244, 244, 245], textColor: 40 },
		// The note is free text, so it gets the slack while the rest stay compact.
		columnStyles: { 5: { cellWidth: 90 } },
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
}
