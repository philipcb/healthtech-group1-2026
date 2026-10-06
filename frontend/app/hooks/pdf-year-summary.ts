import type { Exposure } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import type jsPDF from "jspdf";

export type PdfYearSummaryMetric = {
	label: string;
	average: number | null;
	redDays: string;
	worstMonth: string;
	registeredDays: string;
};

export type PdfYearSummaryRow = {
	exposure: Exposure;
	metrics: Array<PdfYearSummaryMetric>;
};

export type PdfYearSummaryPage = {
	kind: "year-summary";
	periodStart: TZDate;
	periodEnd: TZDate;
	rows: Array<PdfYearSummaryRow>;
};

export type PdfYearSummaryLabels = {
	yearSummary: {
		exposure: string;
		totalRedDays: string;
		worstMonth: string;
		registeredDays: string;
		averageExposure: string;
	};
	formatAverage: (exposure: Exposure, value: number | null) => string;
	exposureName: (exposure: Exposure) => string;
};

/** Draws the vector summary table placed before the monthly year-report pages. */
export function drawYearSummaryPage(
	pdf: jsPDF,
	page: PdfYearSummaryPage,
	labels: PdfYearSummaryLabels,
	startY: number,
	margin: number,
): number {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const tableWidth = pageWidth - margin * 2;
	const columns = [
		{ label: labels.yearSummary.exposure, width: tableWidth / 5 },
		{ label: labels.yearSummary.totalRedDays, width: tableWidth / 5 },
		{ label: labels.yearSummary.worstMonth, width: tableWidth / 5 },
		{ label: labels.yearSummary.registeredDays, width: tableWidth / 5 },
		{ label: labels.yearSummary.averageExposure, width: tableWidth / 5 },
	];
	const rowHeight = 20;
	const headerHeight = 14;
	let x = margin;

	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(8);
	pdf.setTextColor(40, 40, 40);
	for (const column of columns) {
		pdf.setFillColor(244, 244, 245);
		pdf.setDrawColor(210, 210, 212);
		pdf.rect(x, startY, column.width, headerHeight, "FD");
		pdf.text(column.label, x + 2, startY + 8, { maxWidth: column.width - 4 });
		x += column.width;
	}

	page.rows.forEach((row, rowIndex) => {
		const y = startY + headerHeight + rowIndex * rowHeight;
		x = margin;
		const values = [
			labels.exposureName(row.exposure),
			row.metrics
				.map((metric) => (row.exposure === "dust" ? `${metric.label}: ${metric.redDays}` : `${metric.redDays}`))
				.join("\n"),
			row.metrics
				.map((metric) =>
					row.exposure === "dust" ? `${metric.label}: ${metric.worstMonth}` : metric.worstMonth,
				)
				.join("\n"),
			row.metrics
				.map((metric) =>
					row.exposure === "dust" ? `${metric.label}: ${metric.registeredDays}` : metric.registeredDays,
				)
				.join("\n"),
			row.metrics
				.map((metric) =>
					row.exposure === "dust"
						? `${metric.label}: ${labels.formatAverage(row.exposure, metric.average)}`
						: labels.formatAverage(row.exposure, metric.average),
				)
				.join("\n"),
		];

		values.forEach((value, columnIndex) => {
			const column = columns[columnIndex];
			pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 249, 249, 250);
			pdf.setDrawColor(225, 225, 226);
			pdf.rect(x, y, column.width, rowHeight, "FD");
			pdf.setFont("helvetica", columnIndex === 0 ? "bold" : "normal");
			pdf.setFontSize(8);
			pdf.setTextColor(45, 45, 45);
			pdf.text(value.split("\n"), x + 2, y + 7, { maxWidth: column.width - 4, lineHeightFactor: 1.25 });
			x += column.width;
		});
	});

	return startY + headerHeight + page.rows.length * rowHeight;
}
