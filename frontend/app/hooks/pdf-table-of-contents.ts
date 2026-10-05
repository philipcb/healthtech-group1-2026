import type jsPDF from "jspdf";

/**
 * One line in the year report's table of contents, as built by the export
 * dialog. Positions are indices into the exported `pages` list, not PDF page
 * numbers: the dialog knows which page is which month, but only the assembler
 * knows where each one actually lands in the PDF.
 */
export type PdfTocEntry = {
	label: string;
	/** 0 = section heading (an exposure type, or "Day reports"), 1 = an entry under it. */
	level: 0 | 1;
	pageIndex: number;
	/** When set, the entry shows a page range ending on this page's last PDF page. */
	lastPageIndex?: number;
};

/** A TOC entry once the assembler knows which PDF pages it landed on. */
export type ResolvedTocEntry = {
	label: string;
	level: 0 | 1;
	firstPage: number;
	lastPage?: number;
};

/** How many entries fit on one portrait TOC page below the page title. */
export const TOC_ENTRIES_PER_PAGE = 35;

const LINE_HEIGHT = 7;
const INDENT = 8;
const LEADER_COLOR: [number, number, number] = [150, 150, 150];

/**
 * Draws one TOC page's entries: the label on the left, its page number (or
 * range) right-aligned, joined by a dotted leader. The whole line links to the
 * entry's first page.
 */
export function drawTableOfContentsEntries(
	pdf: jsPDF,
	entries: Array<ResolvedTocEntry>,
	startY: number,
	margin: number,
): void {
	const right = pdf.internal.pageSize.getWidth() - margin;

	entries.forEach((entry, index) => {
		const y = startY + index * LINE_HEIGHT;
		const x = entry.level === 0 ? margin : margin + INDENT;
		// Plain hyphen: jsPDF's built-in Helvetica only reliably covers Latin-1.
		const pageText =
			entry.lastPage !== undefined && entry.lastPage !== entry.firstPage
				? `${entry.firstPage}-${entry.lastPage}`
				: `${entry.firstPage}`;

		pdf.setFont("helvetica", entry.level === 0 ? "bold" : "normal");
		pdf.setFontSize(entry.level === 0 ? 12 : 11);
		pdf.setTextColor(0, 0, 0);
		pdf.text(entry.label, x, y);
		pdf.text(pageText, right, y, { align: "right" });

		const leaderStart = x + pdf.getTextWidth(entry.label) + 2;
		const leaderEnd = right - pdf.getTextWidth(pageText) - 2;
		if (leaderEnd > leaderStart) {
			pdf.setDrawColor(...LEADER_COLOR);
			pdf.setLineDashPattern([0.4, 1.2], 0);
			pdf.line(leaderStart, y, leaderEnd, y);
			pdf.setLineDashPattern([], 0);
		}

		pdf.link(margin, y - LINE_HEIGHT + 2, right - margin, LINE_HEIGHT, { pageNumber: entry.firstPage });
	});
}
