import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { type CsvColumn, downloadCsv, toCsv } from "@/lib/plot-to-csv.ts";
import { cn } from "@/lib/utils.ts";
import { Download } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

type ChartDownloadProps<Row> = PropsWithChildren<{
	filename: string;
	columns: ReadonlyArray<CsvColumn<Row>>;
	rows: ReadonlyArray<Row>;
	className?: string;
}>;

/**
 * Wraps a chart and puts a button in its top-right corner that downloads `rows` as a CSV file. The button is positioned
 * inside the wrapper, so it moves with the chart wherever the chart is laid out. It wraps the chart where it's used,
 * not inside the chart component, so the PDF export's snapshots of the charts don't include it.
 */
export function ChartDownload<Row>({ filename, columns, rows, className, children }: ChartDownloadProps<Row>) {
	const { t } = useTranslation();
	const label = t(($) => $.chartDownload.downloadCsv);

	return (
		<div className={cn("relative", className)}>
			{children}
			<Tooltip>
				<TooltipTrigger asChild={true}>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={label}
						disabled={rows.length === 0}
						onClick={() => downloadCsv(filename, toCsv(columns, rows))}
						className="absolute top-0 right-0 z-10 bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-foreground"
					>
						<Download aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</div>
	);
}
