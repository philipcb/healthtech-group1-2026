import { Button } from "@/components/ui/button.tsx";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PdfExportDialog } from "../pdf-export/pdf-export-dialog.tsx";

// Lives in the page header, not the sidebar: user testing showed that next to the calendar,
// people assumed the calendar set the export period. The dialog has its own period picker.
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
			<Button variant="outline" aria-haspopup="dialog" onClick={() => setPdfDialogOpen(true)}>
				<FileText className="size-4" />
				{t(($) => $.layout.downloadReport)}
			</Button>
			<PdfExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} exposureType={exposureType} />
		</>
	);
}
