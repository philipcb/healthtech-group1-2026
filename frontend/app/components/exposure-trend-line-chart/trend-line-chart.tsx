import {
	ChartScrubCursor,
	ChartScrubDot,
	ChartScrubHeader,
	ChartScrubTracker,
	ChartScrubValue,
	ScrubXAxisTick,
} from "@/components/chart-scrub.tsx";
import { ChartContainer } from "@/components/ui/chart.tsx";
import { SCRUB_CHART_HEIGHT_CLASSNAME, SCRUB_Y_AXIS_PROPS, useChartScrub } from "@/hooks/use-chart-scrub.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import type { ExposureDataDto } from "@/lib/api/generated/models/index.ts";
import { DangerLevels, dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import { buildYAxisTicks, DUST_Y_AXIS_STEP } from "@/lib/exposure-y-axis.ts";
import type { Exposure, ExposureTypeField, ExposureUnit } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { cn, formatExposureValue, normalizeDangerLevelForPeakForLineChart } from "@/lib/utils.ts";
import { addDays, addWeeks, endOfMonth, endOfWeek, getISOWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis } from "recharts";
import type { CurveType } from "recharts/types/shape/Curve";
import { ExposureDot } from "../exposure-line-chart/exposure-dot.tsx";
import { ExposureLegend } from "../exposure-line-chart/exposure-legend.tsx";
import { ExposureLineChartGradientStops } from "../exposure-line-chart/exposure-line-chart-gradient-stops.tsx";
import { ThresholdLegend } from "../exposure-line-chart/threshold-legend.tsx";
import { ThresholdLine } from "../exposure-line-chart/threshold-line.tsx";
import { ExposureTrendTooltip } from "./exposure-trend-tooltip.tsx";

type TrendGranularity = "day" | "week";

const Y_AXIS_WIDTH = 60;
// Room for dust in mg, which is shown with four decimals
const MG_Y_AXIS_WIDTH = 76;

export type TrendSeries = {
	exposure: Exposure;
	exposureField?: ExposureTypeField;
	data: Array<ExposureDataDto>;
};

export interface TrendLineChartProps {
	series: Array<TrendSeries>;
	selectedDate: Date;
	unit: ExposureUnit;
	minY: number;
	maxY: number;
	granularity: TrendGranularity;
	lineType?: CurveType;
	chartContainerClassName?: string;
	usePeakDangerThreshold?: boolean;
	breakoutOnMobile?: boolean;
}

export type SeriesDefinition = {
	exposure: Exposure;
	exposureField?: ExposureTypeField;
	dataKey: string;
	label: string;
	valuesByBucket: Map<string, number>;
};

export function TrendLineChart({
	series,
	selectedDate,
	unit,
	minY,
	maxY,
	granularity,
	lineType = "linear",
	chartContainerClassName,
	usePeakDangerThreshold = false,
	breakoutOnMobile = false,
}: TrendLineChartProps) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const gradientId = useId();
	const isMobile = useIsMobile();

	const bucketDates = getBucketDates(selectedDate, granularity);
	const seriesDefinitions = buildSeriesDefinitions(series, granularity, t);
	const chartData = buildChartData(bucketDates, seriesDefinitions, granularity, formatDate, t);

	const isMobileBreakout = breakoutOnMobile && isMobile;
	const yAxisWidth = unit === "mg" ? MG_Y_AXIS_WIDTH : Y_AXIS_WIDTH;
	const scrub = useChartScrub(isMobileBreakout);
	const [hoveredSeriesKey, setHoveredSeriesKey] = useState<string | null>(null);
	const isDustChart = series.every((serie) => serie.exposure === "dust");
	const yTicks = isDustChart ? buildYAxisTicks(minY, maxY, DUST_Y_AXIS_STEP) : undefined;
	const defaultFractionDigits = isDustChart ? 1 : 0;
	const fractionDigitsPerUnit = isDustChart ? { mg: 4 } : { mg: 3 };

	const isSingleSeries = seriesDefinitions.length === 1;

	// If we only have 1 series, we always show the thresholds for that series, otherwise we only show the thresholds for the hovered series
	const activeSeriesKey = isSingleSeries ? (seriesDefinitions[0]?.dataKey ?? null) : hoveredSeriesKey;

	const activeSeries = seriesDefinitions.find((serie) => serie.dataKey === activeSeriesKey) ?? null;

	const thresholdLines = activeSeries ? getThresholdLines(activeSeries, usePeakDangerThreshold) : [];

	const singleSeries = isSingleSeries ? (seriesDefinitions[0] ?? null) : null;

	let singleSeriesThreshold: ReturnType<typeof getThreshold> | null = null;
	let singleSeriesDangerThreshold: number | null = null;
	let singleSeriesWarningThreshold = 0;
	let singleSeriesValues: Array<number> = [];

	if (singleSeries) {
		singleSeriesThreshold = getThreshold(singleSeries.exposure, singleSeries.exposureField);

		singleSeriesDangerThreshold = usePeakDangerThreshold
			? singleSeriesThreshold.peakDanger
			: singleSeriesThreshold.danger;

		singleSeriesWarningThreshold = singleSeriesThreshold.warning;

		singleSeriesValues = Array.from(singleSeries.valuesByBucket.values());
	}

	const dataBucketCount = chartData.filter((row) =>
		seriesDefinitions.some((serie) => row[serie.dataKey] != null),
	).length;

	const showDot = dataBucketCount === 1;

	// Empty axes would take a chart's worth of space to say nothing
	if (dataBucketCount === 0) {
		return <p className="py-6 text-center text-muted-foreground text-sm">{t(($) => $.common.noData)}</p>;
	}

	// Pre-calculate max value for Area bounding box alignment
	const maxDataValue = singleSeriesValues.length > 0 ? Math.max(...singleSeriesValues) : maxY;

	const formatYValue = (value: number) =>
		formatExposureValue(value, unit, defaultFractionDigits, fractionDigitsPerUnit);
	const unitLabel = t(($) => $.exposures.units[unit]);

	// Phones show the picked bucket, or the latest one with data, above the chart instead of in a tooltip
	const shownIndex =
		scrub.activeIndex ??
		chartData.findLastIndex((row) => seriesDefinitions.some((serie) => row[serie.dataKey] != null));
	const shownRow = chartData[shownIndex];
	const lastLabel = chartData.at(-1)?.label ?? "";
	const getShownValue = (serie: SeriesDefinition) => {
		const value = shownRow?.[serie.dataKey];
		return typeof value === "number" ? value : null;
	};
	const getDotColor = (serie: SeriesDefinition, value: number) =>
		isSingleSeries && singleSeriesDangerThreshold !== null
			? dangerlevelStyles[
					normalizeDangerLevelForPeakForLineChart(
						getDangerLevel(value, singleSeriesWarningThreshold, singleSeriesDangerThreshold),
						usePeakDangerThreshold,
					)
				].color
			: getDustFieldColor(serie.exposureField);

	const chart = (
		<ChartContainer
			config={{}}
			className={cn("h-full w-full", chartContainerClassName, isMobileBreakout && SCRUB_CHART_HEIGHT_CLASSNAME)}
		>
			<ComposedChart
				accessibilityLayer={true}
				data={chartData}
				{...scrub.chartProps}
				margin={isMobileBreakout ? { left: 0, right: 0, top: 12 } : { left: 12, right: 12 }}
			>
				{!isMobileBreakout && (
					<CartesianGrid vertical={true} stroke="var(--color-muted-foreground)" strokeOpacity={0.2} />
				)}

				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					// A week's seven days or a month's weeks all fit on a phone, once the first and last are left out
					interval={isMobileBreakout ? 0 : undefined}
					// On phones the line runs from edge to edge
					scale={isMobileBreakout ? "point" : undefined}
					padding={isMobileBreakout ? undefined : { left: 24, right: 24 }}
					tick={
						isMobileBreakout
							? (props) => <ScrubXAxisTick {...props} />
							: { className: "text-sm", fill: "var(--color-muted-foreground)" }
					}
				/>

				<YAxis
					domain={[minY, maxY]}
					ticks={yTicks}
					tickFormatter={formatYValue}
					{...(isMobileBreakout
						? SCRUB_Y_AXIS_PROPS
						: {
								width: yAxisWidth,
								tickLine: false,
								axisLine: false,
								tick: { className: "text-base", fill: "var(--color-muted-foreground)" },
							})}
					label={
						isMobileBreakout
							? undefined
							: {
									value: t(($) => $.exposures.units[unit]),
									position: "inside",
									dx: -yAxisWidth / 2 - 2,
									angle: -90,
									className: "text-lg mr-4",
									fill: "var(--color-muted-foreground)",
								}
					}
				/>

				{isMobileBreakout ? (
					<ChartScrubTracker />
				) : (
					<ExposureTrendTooltip unit={unit} seriesDefinitions={seriesDefinitions} />
				)}

				{isSingleSeries && singleSeriesThreshold && singleSeriesDangerThreshold && (
					<defs>
						{/* Gradient for line stroke */}
						<linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="0" y2="1">
							<ExposureLineChartGradientStops
								values={singleSeriesValues}
								warningThreshold={singleSeriesWarningThreshold}
								dangerThreshold={singleSeriesDangerThreshold}
								usePeakData={usePeakDangerThreshold}
							/>
						</linearGradient>

						{/* Gradient for area background bounding box */}
						<linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
							<ExposureLineChartGradientStops
								values={[minY, maxDataValue]}
								warningThreshold={singleSeriesWarningThreshold}
								dangerThreshold={singleSeriesDangerThreshold}
								usePeakData={usePeakDangerThreshold}
							/>
						</linearGradient>

						{/* Fade Mask (Aggressive fadeout in the bottom 50%) */}
						<linearGradient id={`${gradientId}-fade-gradient`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="white" stopOpacity={1} />
							<stop offset="50%" stopColor="white" stopOpacity={1} />
							<stop offset="100%" stopColor="white" stopOpacity={0} />
						</linearGradient>
						<mask id={`${gradientId}-fade-mask`}>
							<rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId}-fade-gradient)`} />
						</mask>
					</defs>
				)}

				{isSingleSeries && activeSeriesKey && (
					<Area
						dataKey={activeSeriesKey}
						type={lineType}
						fill={`url(#${gradientId}-area)`}
						stroke="none"
						baseValue={minY}
						fillOpacity={0.25}
						mask={`url(#${gradientId}-fade-mask)`}
						isAnimationActive={false}
						animationDuration={0}
						connectNulls={true}
					/>
				)}

				{seriesDefinitions.map((serie) => (
					<Line
						key={serie.dataKey}
						name={serie.label}
						dataKey={serie.dataKey}
						type={lineType}
						stroke={isSingleSeries ? `url(#${gradientId}-line)` : getDustFieldColor(serie.exposureField)}
						strokeWidth={3}
						isAnimationActive={false}
						connectNulls={true}
						onMouseEnter={() => setHoveredSeriesKey(serie.dataKey)}
						onMouseLeave={() => setHoveredSeriesKey(null)}
						opacity={hoveredSeriesKey !== null && hoveredSeriesKey !== serie.dataKey ? 0.5 : 1}
						dot={showDot}
						activeDot={
							isMobileBreakout
								? false
								: isSingleSeries && singleSeriesDangerThreshold !== null
									? (props) => (
											<ExposureDot
												{...props}
												warning={singleSeriesWarningThreshold}
												danger={singleSeriesDangerThreshold}
												isPeak={usePeakDangerThreshold}
											/>
										)
									: {
											r: 5,
											fill: getDustFieldColor(serie.exposureField),
											stroke: "none",
										}
						}
					/>
				))}

				{thresholdLines.map((line) => (
					<ThresholdLine key={line.key} y={line.y} dangerLevel={line.dangerLevel} />
				))}

				{scrub.activeIndex !== null && shownRow && (
					<>
						<ChartScrubCursor x={String(shownRow.label)} xEnd={String(lastLabel)} />
						{seriesDefinitions.map((serie) => {
							const value = getShownValue(serie);

							return value === null ? null : (
								<ChartScrubDot
									key={serie.dataKey}
									x={String(shownRow.label)}
									y={value}
									color={getDotColor(serie, value)}
								/>
							);
						})}
					</>
				)}

				<Legend
					content={() => (
						<div
							className="mt-2 flex flex-col gap-3"
							style={{ marginLeft: isMobileBreakout ? 20 : yAxisWidth }}
						>
							{/* Only show exposure legend if there are multiple exposures or fields */}
							{!isSingleSeries && (
								<ExposureLegend
									items={seriesDefinitions.map((serie) => ({
										label: getSeriesLabel(serie.exposure, serie.exposureField, t),
										color: getDustFieldColor(serie.exposureField),
									}))}
								/>
							)}
							<ThresholdLegend
								items={[
									{
										dangerLevel: "danger",
										color: `var(--${DangerLevels.danger.color})`,
									},
									{
										dangerLevel: "warning",
										color: `var(--${DangerLevels.warning.color})`,
									},
								]}
							/>
						</div>
					)}
				/>
			</ComposedChart>
		</ChartContainer>
	);

	if (!(isMobileBreakout && shownRow)) {
		return chart;
	}

	const singleValue = singleSeries ? getShownValue(singleSeries) : null;

	return (
		<div className="flex w-full flex-col">
			<ChartScrubHeader
				dangerLevel={
					singleSeries && singleValue !== null && singleSeriesDangerThreshold !== null
						? normalizeDangerLevelForPeakForLineChart(
								getDangerLevel(singleValue, singleSeriesWarningThreshold, singleSeriesDangerThreshold),
								usePeakDangerThreshold,
							)
						: null
				}
				caption={
					granularity === "day"
						? formatDate(new Date(String(shownRow.bucketKey)), "EEEE d. MMMM")
						: String(shownRow.label)
				}
			>
				{singleSeries ? (
					<ChartScrubValue
						value={
							singleValue === null ? t(($) => $.common.noData) : formatExposureValue(singleValue, unit)
						}
						unit={singleValue === null ? "" : unitLabel}
					/>
				) : (
					<ul className="flex flex-col gap-1 text-sm">
						{seriesDefinitions.map((serie) => {
							const value = getShownValue(serie);

							return (
								<li key={serie.dataKey} className="flex items-center gap-2">
									<span
										aria-hidden="true"
										className="size-2 shrink-0 rounded-full"
										style={{ backgroundColor: getDustFieldColor(serie.exposureField) }}
									/>
									<span className="text-muted-foreground">{serie.label}</span>
									<span className="ml-auto font-semibold tabular-nums">
										{value === null
											? t(($) => $.common.noData)
											: `${formatExposureValue(value, unit)} ${unitLabel}`}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</ChartScrubHeader>
			{chart}
		</div>
	);
}

function getThresholdLines(
	serie: SeriesDefinition,
	usePeakDangerThreshold: boolean,
): Array<{ key: string; y: number; dangerLevel: "warning" | "danger" }> {
	const threshold = getThreshold(serie.exposure, serie.exposureField);
	const lines: Array<{
		key: string;
		y: number;
		dangerLevel: "warning" | "danger";
	}> = [];

	if (threshold.peakDanger && usePeakDangerThreshold) {
		lines.push({
			key: `${serie.dataKey}-danger`,
			y: threshold.peakDanger,
			dangerLevel: "danger",
		});
		return lines;
	}

	if (threshold.warning) {
		lines.push({
			key: `${serie.dataKey}-warning`,
			y: threshold.warning,
			dangerLevel: "warning",
		});
	}

	if (threshold.danger) {
		lines.push({
			key: `${serie.dataKey}-danger`,
			y: threshold.danger,
			dangerLevel: "danger",
		});
	}

	return lines;
}

function buildSeriesDefinitions(
	series: Array<TrendSeries>,
	granularity: TrendGranularity,
	t: ReturnType<typeof useTranslation>["t"],
): Array<SeriesDefinition> {
	return series.map((serie) => ({
		exposure: serie.exposure,
		exposureField: serie.exposureField,
		dataKey: getSeriesDataKey(serie.exposure, serie.exposureField),
		label: getSeriesLabel(serie.exposure, serie.exposureField, t),
		valuesByBucket: new Map(serie.data.map((item) => [normalizeBucketKey(item.time, granularity), item.value])),
	}));
}

function buildChartData(
	bucketDates: Array<Date>,
	seriesDefinitions: Array<SeriesDefinition>,
	granularity: TrendGranularity,
	formatDate: ReturnType<typeof useFormatDate>,
	t: ReturnType<typeof useTranslation>["t"],
): Array<Record<string, string | number | null>> {
	return bucketDates.map((date) => {
		const bucketKey = normalizeBucketKey(date, granularity);

		const row: Record<string, string | number | null> = {
			bucketKey,
			label: getBucketLabel(date, granularity, t, formatDate),
		};

		for (const serie of seriesDefinitions) {
			row[serie.dataKey] = serie.valuesByBucket.get(bucketKey) ?? null;
		}

		return row;
	});
}

function getBucketLabel(
	date: Date,
	granularity: TrendGranularity,
	t: ReturnType<typeof useTranslation>["t"],
	formatDate: ReturnType<typeof useFormatDate>,
): string {
	if (granularity === "week") {
		return t(($) => $.common.weekNumber, {
			week: getISOWeek(date),
		});
	}

	return formatDate(date, "dd.MM");
}

function getSeriesDataKey(exposure: Exposure, field?: ExposureTypeField): string {
	return field ? `${exposure}:${field}` : exposure;
}

function getSeriesLabel(
	exposure: Exposure,
	field: ExposureTypeField | undefined,
	t: ReturnType<typeof useTranslation>["t"],
): string {
	if (!field) {
		return t(($) => $.exposures[exposure]);
	}

	return t(($) => $.exposures.dustFields[field]);
}

function getDustFieldColor(field?: ExposureTypeField): string {
	switch (field) {
		case "pm1_twa":
			return "var(--color-green-700)";
		case "pm25_twa":
			return "var(--color-blue-600)";
		case "pm4_twa":
			return "var(--color-orange-400)";
		case "pm10_twa":
			return "var(--color-red-600)";
		default:
			return "var(--color-blue-600)";
	}
}

/**
 * Creates one bucket for every day of the week for granularity week,
 * or every week of the month for granularity month,
 * for the given data.
 */
function getBucketDates(selectedDate: Date, granularity: TrendGranularity): Array<Date> {
	const dates: Array<Date> = [];

	if (granularity === "day") {
		let current = startOfWeek(selectedDate, { weekStartsOn: 1 });
		const end = endOfWeek(selectedDate, { weekStartsOn: 1 });

		while (current <= end) {
			dates.push(current);
			current = addDays(current, 1);
		}

		return dates;
	}

	let current = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
	const end = startOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });

	while (current <= end) {
		dates.push(current);
		current = addWeeks(current, 1);
	}

	return dates;
}

function normalizeBucketKey(date: Date, granularity: TrendGranularity): string {
	if (granularity === "day") {
		return startOfDay(date).toISOString();
	}

	return startOfWeek(date, { weekStartsOn: 1 }).toISOString();
}
