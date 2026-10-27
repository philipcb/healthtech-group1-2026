import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { InfoDialog, InfoSection } from "@/features/aggregated-exposure/components/info-dialog.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	getGroupUnitLabel,
	getThresholdNumberFormat,
	thresholdByExposure,
} from "@/features/aggregated-exposure/model/groups.ts";
import { type Exposure, exposures, exposureUnitByExposure } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

export function OverviewInfoDialog() {
	const { t, i18n } = useTranslation();
	const { showsGuidance } = useDashboardScope();
	const numberFormat = getThresholdNumberFormat(i18n.language);
	const formatThreshold = (value: number, exposure: Exposure) =>
		`${numberFormat.format(value)} ${getGroupUnitLabel(exposureUnitByExposure[exposure], t)}`;

	return (
		<InfoDialog
			triggerLabel={t(($) => $.aggregatedExposure.overview.info.trigger)}
			title={t(($) => $.aggregatedExposure.overview.info.title)}
			description={showsGuidance ? t(($) => $.aggregatedExposure.overview.info.description) : undefined}
		>
			<InfoSection title={t(($) => $.aggregatedExposure.overview.info.groupData.title)}>
				<p className="text-muted-foreground">
					{t(($) => $.aggregatedExposure.overview.info.groupData.aggregation)}
				</p>
			</InfoSection>

			<InfoSection title={t(($) => $.aggregatedExposure.overview.info.scale.title)}>
				<p className="text-muted-foreground">
					{t(($) => $.aggregatedExposure.overview.info.scale.colors)}
					{showsGuidance && ` ${t(($) => $.aggregatedExposure.overview.info.scale.assessment)}`}
				</p>
			</InfoSection>

			<InfoSection
				title={t(($) => $.aggregatedExposure.overview.info.thresholds.title)}
				className="min-w-0 gap-2"
			>
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
			</InfoSection>
		</InfoDialog>
	);
}
