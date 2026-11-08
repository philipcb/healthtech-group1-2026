import { ChartDownload } from "@/components/chart-download.tsx";
import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { ThresholdLegend, ThresholdLegendLine } from "@/components/exposure-line-chart/threshold-legend.tsx";
import { Card, CardLabelHeader } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ComparisonFigures } from "@/features/aggregated-exposure/components/comparison-figures.tsx";
import {
	type ComparisonSeries,
	ComparisonTrendChart,
} from "@/features/aggregated-exposure/components/comparison-trend-chart.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { isMissing, useComparisonTrends } from "@/features/aggregated-exposure/hooks/use-comparison-trends.ts";
import {
	type ComparableGroup,
	type ComparedEntry,
	getComparableGroupName,
} from "@/features/aggregated-exposure/model/compare.ts";
import {
	type ComparisonDownloadRow,
	DOWNLOAD_FRACTION_DIGITS,
	getDownloadExposureName,
	toComparisonDownloadRows,
} from "@/features/aggregated-exposure/model/download.ts";
import {
	getGroupThreshold,
	getGroupUnitLabel,
	getMetricLabel,
	isExposureUnavailable,
} from "@/features/aggregated-exposure/model/groups.ts";
import type { toTrendPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getComparisonChartMarginRight } from "@/features/aggregated-exposure/model/trend-chart.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import type { DustField, Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
import { type ExportColumn, toDownloadFilename } from "@/lib/plot-export.ts";
import { cn } from "@/lib/utils.ts";
import { Info } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

// Phones: about three quarters of the screen's width, like the other charts there
const CHART_HEIGHT_CLASSNAME = "h-[75vw] max-h-[60dvh] lg:h-[clamp(16rem,calc(100dvh-28rem),36rem)] lg:max-h-none";

type ComparisonCardProps = {
	exposure: Exposure;
	dustField: DustField;
	/** Picked in the card's header, so the choice sits next to the chart it changes */
	onDustFieldChange: (dustField: DustField) => void;
	unit: ExposureUnit;
	entries: Array<ComparedEntry>;
	periodParams: ReturnType<typeof toTrendPeriodParams>;
	periodLabel: string;
	periodFilenamePart: string;
	/** The selected day, when the trends are its hours */
	day?: Date;
};

export function ComparisonCard({
	exposure,
	dustField,
	onDustFieldChange,
	unit,
	entries,
	periodParams,
	periodLabel,
	periodFilenamePart,
	day,
}: ComparisonCardProps) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const headingId = useId();
	const isMobile = useIsMobile();
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
	// A day's points are its hours
	const hiddenLegend =
		day === undefined
			? t(($) => $.aggregatedExposure.compare.hiddenDaysLegend)
			: t(($) => $.aggregatedExposure.compare.hiddenHoursLegend);
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
		// The date column only holds the date, so a day's hours get their time in Norwegian time in a column of their own
		...(day === undefined
			? []
			: [
					{
						header: t(($) => $.chartDownload.columns.time),
						value: (row: ComparisonDownloadRow) => formatDate(row.day, "HH:mm"),
					},
				]),
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
			<CardLabelHeader className="flex-wrap justify-between gap-x-3 gap-y-1.5 rounded-none">
				<h2 id={headingId} className="font-medium text-sm">
					{metricLabel}
					<span className="font-normal text-muted-foreground">{` · ${unitLabel}`}</span>
				</h2>
				{exposure === "dust" && !isUnavailable && (
					<DustFieldTabs
						value={dustField}
						onValueChange={onDustFieldChange}
						ariaLabel={t(($) => $.aggregatedExposure.group.dustFieldLabel)}
						isCompact={true}
					/>
				)}
			</CardLabelHeader>

			{isUnavailable ? (
				<div className="p-4">
					<EmptyState title={t(($) => $.aggregatedExposure.exposureUnavailable[exposure])} />
				</div>
			) : (
				<div className="grid gap-x-6 gap-y-4 p-4 max-lg:px-5 2xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] 2xl:items-start">
					<div className="flex min-w-0 flex-col gap-3">
						{isPending ? (
							<Skeleton className={cn("w-full", CHART_HEIGHT_CLASSNAME)} />
						) : series.length > 0 ? (
							<figure
								aria-label={
									day === undefined
										? t(($) => $.aggregatedExposure.compare.chartLabel, {
												metric: metricLabel,
												unit: unitLabel,
												period: periodLabel,
											})
										: t(($) => $.aggregatedExposure.compare.chartLabelDay, {
												metric: metricLabel,
												unit: unitLabel,
												period: periodLabel,
											})
								}
							>
								<ChartDownload
									filename={downloadFilename}
									sheetName={exposureName}
									columns={downloadColumns}
									rows={toComparisonDownloadRows(series, day)}
									plotMarginRight={getComparisonChartMarginRight(isMobile)}
									// Out to the screen's edges on phones, past the card's padding
									className="max-lg:-mx-5"
								>
									<ComparisonTrendChart
										series={series}
										unit={unit}
										threshold={threshold}
										className={CHART_HEIGHT_CLASSNAME}
										day={day}
									/>
								</ChartDownload>
							</figure>
						) : hasErrors ? (
							<EmptyState title={t(($) => $.aggregatedExposure.group.trendError)} />
						) : notInChart.some(({ status }) => status === "notEnoughData") ? (
							<EmptyState
								title={t(($) => $.aggregatedExposure.compare.notEnoughData)}
								description={
									day === undefined
										? t(($) => $.aggregatedExposure.compare.noGroupHasEnoughData, {
												period: periodLabel,
											})
										: t(($) => $.aggregatedExposure.compare.noGroupHasEnoughDayData, {
												period: periodLabel,
											})
								}
							/>
						) : (
							<EmptyState
								title={t(($) => $.aggregatedExposure.compare.noData)}
								description={
									day === undefined
										? t(($) => $.aggregatedExposure.compare.noGroupHasData, { period: periodLabel })
										: t(($) => $.aggregatedExposure.compare.noGroupHasDayData)
								}
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
							day={day}
						/>
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
								label={hiddenLegend}
								color="var(--muted-foreground)"
								strokeDasharray="2 4"
							/>
							{hiddenLegend}
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
