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
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { getGroupUnitLabel, thresholdByExposure } from "@/features/aggregated-exposure/model/groups.ts";
import { type Exposure, exposures, exposureUnitByExposure } from "@/lib/exposures.ts";
import { InfoIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function OverviewInfoDialog() {
	const { t, i18n } = useTranslation();
	const { showsGuidance } = useDashboardScope();
	const descriptionId = useId();
	const numberFormat = new Intl.NumberFormat(i18n.language === "no" ? "nb-NO" : "en-US");
	const formatThreshold = (value: number, exposure: Exposure) =>
		`${numberFormat.format(value)} ${getGroupUnitLabel(exposureUnitByExposure[exposure], t)}`;

	return (
		<Dialog>
			<DialogTrigger asChild={true}>
				<Button variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
					<InfoIcon aria-hidden="true" />
					{t(($) => $.aggregatedExposure.overview.info.trigger)}
				</Button>
			</DialogTrigger>

			<DialogContent
				className="max-h-[90dvh] overflow-y-auto"
				aria-describedby={showsGuidance ? descriptionId : undefined}
			>
				<DialogHeader>
					<DialogTitle>{t(($) => $.aggregatedExposure.overview.info.title)}</DialogTitle>
					{showsGuidance && (
						<DialogDescription id={descriptionId}>
							{t(($) => $.aggregatedExposure.overview.info.description)}
						</DialogDescription>
					)}
				</DialogHeader>

				<section className="flex flex-col gap-1.5 text-sm">
					<h3 className="font-medium">{t(($) => $.aggregatedExposure.overview.info.groupData.title)}</h3>
					<p className="text-muted-foreground">
						{t(($) => $.aggregatedExposure.overview.info.groupData.aggregation)}
					</p>
				</section>

				<section className="flex flex-col gap-1.5 text-sm">
					<h3 className="font-medium">{t(($) => $.aggregatedExposure.overview.info.scale.title)}</h3>
					<p className="text-muted-foreground">
						{t(($) => $.aggregatedExposure.overview.info.scale.colors)}
						{showsGuidance && ` ${t(($) => $.aggregatedExposure.overview.info.scale.assessment)}`}
					</p>
				</section>

				<section className="flex min-w-0 flex-col gap-2 text-sm">
					<h3 className="font-medium">{t(($) => $.aggregatedExposure.overview.info.thresholds.title)}</h3>
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
								<TableHead>{t(($) => $.aggregatedExposure.exposureLabel)}</TableHead>
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
