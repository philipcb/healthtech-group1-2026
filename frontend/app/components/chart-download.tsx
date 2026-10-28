import { Button } from "@/components/ui/button.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import type { ExportColumn } from "@/lib/plot-export.ts";
import { downloadCsv } from "@/lib/plot-to-csv.ts";
import { downloadXlsx } from "@/lib/plot-to-xlsx.ts";
import { cn } from "@/lib/utils.ts";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { type PropsWithChildren, type ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";

type ChartDownloadProps<Row> = PropsWithChildren<{
	/** From `toDownloadFilename`, without an extension */
	filename: string;
	/** The Excel sheet's name, which is cut to Excel's 31 characters */
	sheetName: string;
	columns: ReadonlyArray<ExportColumn<Row>>;
	rows: ReadonlyArray<Row>;
	className?: string;
}>;

/**
 * Wraps a chart and puts a button in its top-right corner that downloads `rows` as an Excel or a CSV file. The button is
 * positioned inside the wrapper, so it moves with the chart wherever the chart is laid out. It wraps the chart where
 * it's used, not inside the chart component, so the PDF export's snapshots of the charts don't include it.
 */
export function ChartDownload<Row>({
	filename,
	sheetName,
	columns,
	rows,
	className,
	children,
}: ChartDownloadProps<Row>) {
	const { t, i18n } = useTranslation();
	const label = t(($) => $.chartDownload.download);
        const isReturningFocus = useRef(false);

	const downloadExcel = () => {
		downloadXlsx(filename, columns, rows, {
			sheetName,
			// Excel stores them as dates, so only how they're shown follows the language
			dateFormat: i18n.language === "no" ? "dd.mm.yyyy" : "yyyy-mm-dd",
		}).catch((error: unknown) => console.error("Could not create the Excel file", error));
	};

	return (
		<div className={cn("relative", className)}>
			{children}
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<DropdownMenuTrigger asChild={true}>
							<Button
								type="button"
								variant="ghost"
								size="lg"
								aria-label={label}
								disabled={rows.length === 0}
								onFocus={(event) => {
                                                                        if (isReturningFocus.current) {
                                                                                event.preventDefault()
                                                                        }
                                                                }}
								className="absolute top-5 right-5 z-10 bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-foreground"
							>
								<Download aria-hidden="true" className="size-7" />
							</Button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="left">{label}</TooltipContent>
				</Tooltip>
				<DropdownMenuContent align="end" 
                                        className="w-64"
                                        onCloseAutoFocus={() => {
                                                isReturningFocus.current = true;
                                                queueMicrotask(() => {
                                                        isReturningFocus.current = false;
                                                })
                                        }}>
					<DropdownMenuLabel className="text-muted-foreground text-xs">{label}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DownloadOption
						icon={<FileSpreadsheet aria-hidden="true" />}
						title={t(($) => $.chartDownload.excel.title)}
						description={t(($) => $.chartDownload.excel.description)}
						onSelect={downloadExcel}
					/>
					<DownloadOption
						icon={<FileText aria-hidden="true" />}
						title={t(($) => $.chartDownload.csv.title)}
						description={t(($) => $.chartDownload.csv.description)}
						onSelect={() => downloadCsv(filename, columns, rows)}
					/>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}


function DownloadOption({
	icon,
	title,
	description,
	onSelect,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem onSelect={onSelect} className="items-start gap-3 py-2 [&_svg]:mt-0.5">
			{icon}
			<div className="flex flex-col gap-0.5">
				<span className="font-medium">{title}</span>
				<span className="text-muted-foreground text-xs">{description}</span>
			</div>
		</DropdownMenuItem>
	);
}
