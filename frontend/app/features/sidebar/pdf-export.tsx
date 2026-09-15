import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PdfExportDialog } from "../pdf-export/pdf-export-dialog.tsx";

interface PdfExportProps {
	// Which exposure type we are exporting. This is passed down to the PdfExportDialog so it knows which charts to render.
	exposureType: "dust" | "noise" | "vibration" | "all";
}

// PDF Export Component
export function PdfExport({ exposureType }: PdfExportProps) {
	const { t } = useTranslation();

	// State to control whether the PDF export dialog is open or closed
	const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

	return (
		<>
			<Card muted={true} className="p-4">
				<Button variant="outline" className="w-full" onClick={() => setPdfDialogOpen(true)}>
					<FileText className="size-4" />
					{t(($) => $.layout.exportPdf)}
				</Button>
			</Card>
			<PdfExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} exposureType={exposureType} />
		</>
	);
}