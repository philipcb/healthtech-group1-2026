import type jsPDF from "jspdf";

export interface CoverPageData {
	name: string;
	locationLabel: string;
	location: string;
	jobTitleLabel: string;
	jobTitle: string;
	securityRegulationsHeading: string;
	securityRegulations: Array<string>;
	jobDescriptionHeading: string;
	jobDescription: string;
	locale: string;
}

export function drawCoverPage(pdf: jsPDF, data: CoverPageData): void {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const leftMargin = 24;
	const textWidth = pageWidth - leftMargin * 2;
	let y = 30;

	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(24);
	pdf.text(data.name, leftMargin, y);
	y += 18;

	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(12);
	pdf.text(`${data.locationLabel}: ${data.location}`, leftMargin, y);
	y += 8;
	pdf.text(`${data.jobTitleLabel}: ${data.jobTitle}`, leftMargin, y);
	y += 18;

	pdf.setFont("helvetica", "bold");
	pdf.text(data.securityRegulationsHeading, leftMargin, y);
	y += 9;

	pdf.setFont("helvetica", "normal");
	for (const regulation of data.securityRegulations) {
		pdf.text(`- ${regulation}`, leftMargin, y);
		y += 7;
	}

	y += 11;
	pdf.setFont("helvetica", "bold");
	pdf.text(data.jobDescriptionHeading, leftMargin, y);
	y += 9;

	pdf.setFont("helvetica", "normal");
	const descriptionLines = pdf.splitTextToSize(data.jobDescription, textWidth);
	pdf.text(descriptionLines, leftMargin, y);
	y += descriptionLines.length * 6 + 12;

	const generatedAt = new Date();
	const generatedDate = generatedAt.toLocaleDateString(data.locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const generatedTime = generatedAt.toLocaleTimeString(data.locale, {
		hour: "numeric",
		minute: "2-digit",
	});
	pdf.text(`${generatedDate}, ${generatedTime}`, leftMargin, Math.min(y, pageHeight - 18));
}
