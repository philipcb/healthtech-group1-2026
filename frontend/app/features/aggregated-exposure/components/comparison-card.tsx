import { ThresholdLegend, ThresholdLegendLine } from "@/components/exposure-line-chart/threshold-legend.tsx";
import { Card, CardLabelHeader } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ComparisonFigures } from "@/features/aggregated-exposure/components/comparison-figures.tsx";
import {
	type ComparisonSeries,
	ComparisonTrendChart,
} from "@/features/aggregated-exposure/components/comparison-trend-chart.tsx";
import { ComparisonValues } from "@/features/aggregated-exposure/components/comparison-values.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { isMissing, useComparisonTrends } from "@/features/aggregated-exposure/hooks/use-comparison-trends.ts";
import { type ComparableGroup, type ComparedEntry, getComparableGroupName } from "@/features/aggregated-exposure/model/compare.ts";
import {
	getGroupThreshold,
	getGroupUnitLabel,
	getMetricLabel,
	isExposureUnavailable,
} from "@/features/aggregated-exposure/model/groups.ts";
import {
       type ComparisonDownloadRow,
       DOWNLOAD_FRACTION_DIGITS,
       getDownloadExposureName,
       toComparisonDownloadRows,
} from "@/features/aggregated-exposure/model/download.ts";
import type { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import type { DustField, Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
import { cn } from "@/lib/utils.ts";
import { Info } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { TranslateFn } from "@/i18n/config.ts";
import { ChartDownload } from "@/components/chart-download.tsx";
import { type ExportColumn, toDownloadFilename } from "@/lib/plot-export.ts";

const CHART_HEIGHT_CLASSNAME = "h-64 lg:h-[clamp(16rem,calc(100dvh-28rem),36rem)]";

type ComparisonCardProps = {
	exposure: Exposure;
	dustField: DustField;
	unit: ExposureUnit;
	entries: Array<ComparedEntry>;
	periodParams: ReturnType<typeof toPeriodParams>;
	periodLabel: string;
	periodFilenamePart: string;
};

export function ComparisonCard({ exposure, dustField, unit, entries, periodParams, periodLabel, periodFilenamePart }: ComparisonCardProps) {
	const { t } = useTranslation();
	const headingId = useId();
	const isUnavailable = isExposureUnavailable(exposure);
	const results = useComparisonTrends({ entries, exposure, dustField, periodParams });

	const threshold = getGroupThreshold(exposure, dustField);
	const unitLabel = getGroupUnitLabel(unit, t);
	const metricLabel = getMetricLabel(exposure, dustField, t);

	const series: Array<ComparisonSeries> = entries.flatMap(({ group, slot }, index) => {
		const result = results[index];
		return result?.status === "ok"
			? [{ slot, name: getComparableGroupName(group, t), points: result.trend.points }]
			: [];
	});
	const notInChart = entries.flatMap(({ group }, index) => {
		const result = results[index];
		return result && isMissing(result) ? [{ group, status: result.status }] : [];
	});
	const hasHiddenDays = series.some(({ points }) => points.some((point) => point.value === null));
	const isPending = results.some((result) => result.status === "pending");
	const hasErrors = results.some((result) => result.status === "error");
        const yards = [...new Set(entries.map(({ group }) => group.site))];
        const groupBySlot = new Map(entries.map(({ group, slot }) => [slot, group]));
        const exposureName = getDownloadExposureName(exposure, dustField, t);
        const downloadFilename = toDownloadFilename([
                ...yards,
                t(($) => $.chartDownload.comparison),
                exposureName,
                periodFilenamePart,
        ]);
        const downloadColumns: Array<ExportColumn<ComparisonDownloadRow>> = [
                { header: t(($) => $.chartDownload.columns.date), value: (row) => row.day },
                ...series.map(({ slot, name }) => {
                        const group = groupBySlot.get(slot);

                        return {
                                header: `${group ? getDownloadGroupName(group, yards.length > 1, t) : name} (${unitLabel})`,
                                value: (row: ComparisonDownloadRow) => row.values.get(slot),
                                fractionDigits: DOWNLOAD_FRACTION_DIGITS[unit],
                        };
                }),
        ];

	return (
		<Card
			variant="labeled"
			aria-labelledby={headingId}
			className={cn("relative w-full", MOBILE_BREAKOUT_CARD_CLASSNAME)}
		>
			<CardLabelHeader className="rounded-none">
				<h2 id={headingId} className="font-medium text-sm">
					{metricLabel}
					<span className="font-normal text-muted-foreground">{` · ${unitLabel}`}</span>
				</h2>
			</CardLabelHeader>

			{isUnavailable ? (
				<div className="p-4">
					<EmptyState title={t(($) => $.aggregatedExposure.exposureUnavailable[exposure])} />
				</div>
			) : (
				<div className="grid gap-x-6 gap-y-4 p-4 2xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] 2xl:items-start">
					<div className="flex min-w-0 flex-col gap-3">
						{isPending ? (
							<Skeleton className={cn("w-full", CHART_HEIGHT_CLASSNAME)} />
						) : series.length > 0 ? (
							<figure
								aria-label={t(($) => $.aggregatedExposure.compare.chartLabel, {
									metric: metricLabel,
									unit: unitLabel,
									period: periodLabel,
								})}
							>
								<ChartDownload
									filename={downloadFilename}
									sheetName={exposureName}
									columns={downloadColumns}
									rows={toComparisonDownloadRows(series)}
									>
										<ComparisonTrendChart
											series={series}
											unit={unit}
											threshold={threshold}
											className={CHART_HEIGHT_CLASSNAME}
										/>
								</ChartDownload>
							</figure>
						) : hasErrors ? (
							<EmptyState title={t(($) => $.aggregatedExposure.group.trendError)} />
						) : notInChart.some(({ status }) => status === "notEnoughData") ? (
							<EmptyState
								title={t(($) => $.aggregatedExposure.compare.notEnoughData)}
								description={t(($) => $.aggregatedExposure.compare.noGroupHasEnoughData, {
									period: periodLabel,
								})}
							/>
						) : (
							<EmptyState
								title={t(($) => $.aggregatedExposure.compare.noData)}
								description={t(($) => $.aggregatedExposure.compare.noGroupHasData, {
									period: periodLabel,
								})}
							/>
						)}

						{series.length > 0 && notInChart.length > 0 && (
							<p className="flex items-start gap-1.5 text-muted-foreground text-xs">
								<Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
								{t(($) => $.aggregatedExposure.compare.notInChart, {
									groups: notInChart
										.map(
											({ group, status }) =>
												`${getComparableGroupName(group, t)} (${t(($) => $.aggregatedExposure.compare.reasons[status])})`,
										)
										.join(", "),
								})}
							</p>
						)}
					</div>

					<div className="flex min-w-0 flex-col gap-3">
						<ComparisonFigures
							exposure={exposure}
							dustField={dustField}
							unit={unit}
							entries={entries}
							results={results}
							periodLabel={periodLabel}
						/>
						{series.length > 0 && (
							<ComparisonValues
								series={series}
								unit={unit}
								bucket={periodParams.period === "year" ? "month" : "week"}
								periodLabel={periodLabel}
							/>
						)}
					</div>
				</div>
			)}

			{series.length > 0 && (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-muted-foreground text-xs">
					<ThresholdLegend
						items={[
							{ dangerLevel: "warning", color: "var(--warning)" },
							{ dangerLevel: "danger", color: "var(--danger)" },
						]}
						className="mt-0 gap-x-4"
					/>
					{hasHiddenDays && (
						<span className="flex items-center gap-2">
							<ThresholdLegendLine
								label={t(($) => $.aggregatedExposure.compare.hiddenDaysLegend)}
								color="var(--muted-foreground)"
								strokeDasharray="2 4"
							/>
							{t(($) => $.aggregatedExposure.compare.hiddenDaysLegend)}
						</span>
					)}
				</div>
			)}
		</Card>
	);
}

function getDownloadGroupName(group: ComparableGroup, showsYard: boolean, t: TranslateFn) {
        const name = getComparableGroupName(group, t);
        return showsYard && group.hall !== null ? `${group.site} · ${name}` : name;
}