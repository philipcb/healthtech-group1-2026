import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import {
	getGroupUnitLabel,
	thresholdByExposure,
} from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import { type Exposure, exposures, exposureUnitByExposure } from "@/lib/exposures.ts";
import { InfoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Explains how to read the overview: what a group value is, how groups are sorted, and what the bar colors mean */
export function OverviewInfoDialog() {
	const { t, i18n } = useTranslation();
	const numberFormat = new Intl.NumberFormat(i18n.language === "no" ? "nb-NO" : "en-US");
	const formatThreshold = (value: number, exposure: Exposure) =>
		`${numberFormat.format(value)} ${getGroupUnitLabel(exposureUnitByExposure[exposure], t)}`;

	return (
		<Dialog>
			<DialogTrigger asChild={true}>
				<Button variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
					<InfoIcon aria-hidden="true" />
					{t(($) => $.occupationalHealthServiceDashboard.overview.info.trigger)}
				</Button>
			</DialogTrigger>

			<DialogContent className="max-h-[90dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t(($) => $.occupationalHealthServiceDashboard.overview.info.title)}</DialogTitle>
					<DialogDescription>
						{t(($) => $.occupationalHealthServiceDashboard.overview.info.description)}
					</DialogDescription>
				</DialogHeader>

				<section className="flex flex-col gap-1.5 text-sm">
					<h3 className="font-medium">
						{t(($) => $.occupationalHealthServiceDashboard.overview.info.groupData.title)}
					</h3>
					<p className="text-muted-foreground">
						{t(($) => $.occupationalHealthServiceDashboard.overview.info.groupData.aggregation)}
					</p>
				</section>

				<section className="flex flex-col gap-1.5 text-sm">
					<h3 className="font-medium">
						{t(($) => $.occupationalHealthServiceDashboard.overview.info.scale.title)}
					</h3>
					<p className="text-muted-foreground">
						{t(($) => $.occupationalHealthServiceDashboard.overview.info.scale.colors)}
					</p>
				</section>

				{/* `min-w-0` keeps the table from widening the dialog past the screen, so a too wide table scrolls itself */}
				<section className="flex min-w-0 flex-col gap-2 text-sm">
					<h3 className="font-medium">
						{t(($) => $.occupationalHealthServiceDashboard.overview.info.thresholds.title)}
					</h3>
					<dl className="flex flex-col gap-2">
						<div>
							<dt className="font-medium">{t(($) => $.limitExplanation.actionValue.label)}</dt>
							<dd className="text-muted-foreground text-xs">
								{t(($) => $.limitExplanation.actionValue.description)}
							</dd>
						</div>
						<div>
							<dt className="font-medium">{t(($) => $.limitExplanation.limitValue.label)}</dt>
							<dd className="text-muted-foreground text-xs">
								{t(($) => $.limitExplanation.limitValue.description)}
							</dd>
						</div>
					</dl>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t(($) => $.occupationalHealthServiceDashboard.exposureLabel)}</TableHead>
								<TableHead className="text-right">
									{t(($) => $.limitExplanation.actionValue.label)}
								</TableHead>
								<TableHead className="text-right">
									{t(($) => $.limitExplanation.limitValue.label)}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{exposures.map((exposure) => {
								const { warning, danger } = thresholdByExposure[exposure];

								return (
									<TableRow key={exposure}>
										<TableCell>
											<span className="flex items-center gap-2">
												<ExposureIcon type={exposure} size="xs" />
												{t(($) => $.exposures[exposure])}
											</span>
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatThreshold(warning, exposure)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatThreshold(danger, exposure)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</section>
			</DialogContent>
		</Dialog>
	);
}
