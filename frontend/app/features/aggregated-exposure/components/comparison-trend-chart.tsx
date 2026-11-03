import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { SeriesKey, SeriesMarker } from "@/features/aggregated-exposure/components/series-key.tsx";
import { TrendTooltip } from "@/features/aggregated-exposure/components/trend-tooltip.tsx";
import { useTrendAxes } from "@/features/aggregated-exposure/hooks/use-trend-axes.tsx";
import { formatGroupValue } from "@/features/aggregated-exposure/model/groups.ts";
import { getSeriesColor, type SeriesSlot } from "@/features/aggregated-exposure/model/series.ts";
import {
	fillTrendGaps,
	getComparisonChartMarginRight,
	getTrendYDomain,
	toTrendDay,
} from "@/features/aggregated-exposure/model/trend-chart.ts";
import type { TrendPointDto } from "@/lib/api/generated/models/index.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import { CartesianGrid, ComposedChart, Line, usePlotArea, XAxis, YAxis } from "recharts";

const MAX_POINTS_WITH_EVERY_MARKER = 31;
const SPARSE_MARKER_COUNT = 12;
const END_LABEL_LINE_HEIGHT = 14;
const END_LABEL_GAP = 6;
const END_LABEL_MAX_LINE_LENGTH = 22;

export type ComparisonSeries = {
	slot: SeriesSlot;
	name: string;
	points: Array<TrendPointDto>;
};

type ChartRow = {
	timestamp: number;
} & Partial<Record<`series${SeriesSlot}` | `line${SeriesSlot}` | `bridge${SeriesSlot}`, number | null>>;

type ComparisonTrendChartProps = {
	series: Array<ComparisonSeries>;
	unit: ExposureUnit;
	threshold: Threshold;
	className?: string;
};

const getDataKey = (slot: SeriesSlot) => `series${slot}` as const;
const getLineKey = (slot: SeriesSlot) => `line${slot}` as const;
const getBridgeKey = (slot: SeriesSlot) => `bridge${slot}` as const;

export function ComparisonTrendChart({ series, unit, threshold, className }: ComparisonTrendChartProps) {
	const { t } = useTranslation();
	const chartConfig = Object.fromEntries(
		series.map(({ slot, name }) => [getDataKey(slot), { label: name, color: getSeriesColor(slot) }]),
	);

	const rowsByDay = new Map<number, ChartRow>();
	for (const { slot, points } of series) {
		for (const point of points) {
			const date = toTrendDay(point.time);
			const row = rowsByDay.get(date.getTime()) ?? { timestamp: date.getTime() };
			row[getDataKey(slot)] = point.value;
			rowsByDay.set(date.getTime(), row);
		}
	}
	const rows = [...rowsByDay.values()].toSorted((a, b) => a.timestamp - b.timestamp);
	const timestamps = rows.map((row) => row.timestamp);
	const hiddenSlots = new Set(
		series.filter(({ points }) => points.some((point) => point.value === null)).map(({ slot }) => slot),
	);
	for (const { slot } of series) {
		const values = rows.map((row) => row[getDataKey(slot)]);
		const line = fillTrendGaps(values, timestamps, false);
		const bridge = hiddenSlots.has(slot) ? fillTrendGaps(values, timestamps, true) : [];
		rows.forEach((row, index) => {
			row[getLineKey(slot)] = line[index];
			if (hiddenSlots.has(slot)) row[getBridgeKey(slot)] = bridge[index];
		});
	}

	const markerStep = rows.length <= MAX_POINTS_WITH_EVERY_MARKER ? 1 : Math.ceil(rows.length / SPARSE_MARKER_COUNT);
	const lastIndexBySlot = new Map(
		series.map(({ slot }) => [slot, rows.findLastIndex((row) => typeof row[getDataKey(slot)] === "number")]),
	);

	const values = series.flatMap(({ points }) =>
		points.flatMap((point) => (point.value === null ? [] : [point.value])),
	);
	const [yMin, yMax] = getTrendYDomain(values, threshold);
	const { xAxisProps, yAxisProps, isMobile, formatDay } = useTrendAxes({ timestamps, unit, yDomain: [yMin, yMax] });

	return (
		<>
			<ChartContainer config={chartConfig} className={cn("aspect-auto h-64 w-full", className)}>
				<ComposedChart
					accessibilityLayer={true}
					data={rows}
					margin={{ left: 12, right: getComparisonChartMarginRight(isMobile), top: 8 }}
				>
					<CartesianGrid vertical={false} stroke="var(--color-muted-foreground)" strokeOpacity={0.2} />
					<XAxis {...xAxisProps} />
					<YAxis {...yAxisProps} />
					<ChartTooltip
						cursor={{ stroke: "var(--color-muted-foreground)", strokeOpacity: 0.6 }}
						content={({ active, payload }) => {
							const row = payload?.[0]?.payload as ChartRow | undefined;

							if (!(active && row)) {
								return null;
							}

							return (
								<TrendTooltip
									title={formatDay(new Date(row.timestamp))}
									className="flex min-w-52 flex-col gap-1"
								>
									{series.map(({ slot, name }) => {
										const value = row[getDataKey(slot)];

										return value === undefined ? null : (
											<div
												key={slot}
												className="grid grid-cols-[auto_auto_1fr] items-center gap-2"
											>
												<SeriesKey slot={slot} width={16} />
												{value === null ? (
													<span className="text-muted-foreground">
														{t(($) => $.aggregatedExposure.compare.notEnoughData)}
													</span>
												) : (
													<span className="font-semibold tabular-nums">
														{formatGroupValue(value, unit, t)}
													</span>
												)}
												<span className="truncate text-muted-foreground">{name}</span>
											</div>
										);
									})}
								</TrendTooltip>
							);
						}}
					/>

					<ThresholdLine y={threshold.warning} dangerLevel="warning" />
					<ThresholdLine y={threshold.danger} dangerLevel="danger" />

					{series.flatMap(({ slot }) =>
						hiddenSlots.has(slot)
							? [
									<Line
										key={`bridge-${slot}`}
										dataKey={getBridgeKey(slot)}
										type="linear"
										stroke={getSeriesColor(slot)}
										strokeWidth={1.5}
										strokeDasharray="2 4"
										strokeOpacity={0.7}
										dot={false}
										activeDot={false}
										connectNulls={true}
										tooltipType="none"
										isAnimationActive={false}
									/>,
								]
							: [],
					)}
					{series.map(({ slot }) => (
						<Line
							key={slot}
							dataKey={getLineKey(slot)}
							type="linear"
							stroke={getSeriesColor(slot)}
							strokeWidth={2}
							strokeLinejoin="round"
							dot={({ cx, cy, payload, index }) =>
								typeof (payload as ChartRow)[getDataKey(slot)] === "number" &&
								cx !== undefined &&
								cy !== undefined &&
								(index % markerStep === 0 || index === lastIndexBySlot.get(slot)) ? (
									<SeriesMarker key={index} slot={slot} x={cx} y={cy} />
								) : null
							}
							activeDot={({ cx, cy, payload }) =>
								typeof (payload as ChartRow)[getDataKey(slot)] === "number" &&
								cx !== undefined &&
								cy !== undefined ? (
									<SeriesMarker slot={slot} x={cx} y={cy} size={11} />
								) : null
							}
							connectNulls={false}
							isAnimationActive={false}
						/>
					))}

					{!isMobile && <EndLabels series={series} yMin={yMin} yMax={yMax} />}
				</ComposedChart>
			</ChartContainer>
			{isMobile && (
				<ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
					{series.map(({ slot, name }) => (
						<li key={slot} className="flex min-w-0 items-center gap-1.5">
							<SeriesKey slot={slot} width={18} />
							<span className="truncate">{name}</span>
						</li>
					))}
				</ul>
			)}
		</>
	);
}

function toLabelLines(name: string) {
	const parts = name.split(" · ");
	const lines = parts.length > 1 ? [parts[0], parts.slice(1).join(" · ")] : [name];

	return lines.map((line) =>
		line.length > END_LABEL_MAX_LINE_LENGTH ? `${line.slice(0, END_LABEL_MAX_LINE_LENGTH - 1)}…` : line,
	);
}

function EndLabels({ series, yMin, yMax }: { series: Array<ComparisonSeries>; yMin: number; yMax: number }) {
	const plotArea = usePlotArea();

	if (plotArea === undefined) {
		return null;
	}

	const toY = (value: number) => plotArea.y + ((yMax - value) / (yMax - yMin)) * plotArea.height;
	const labels = series
		.flatMap(({ slot, name, points }) => {
			const last = points.findLast((point) => point.value !== null)?.value;
			const lines = toLabelLines(name);
			return last == null ? [] : [{ slot, lines, top: toY(last), height: lines.length * END_LABEL_LINE_HEIGHT }];
		})
		.toSorted((a, b) => a.top - b.top);

	for (let index = 1; index < labels.length; index++) {
		const previous = labels[index - 1];
		labels[index].top = Math.max(labels[index].top, previous.top + previous.height + END_LABEL_GAP);
	}

	const last = labels.at(-1);
	const below = last ? last.top + last.height - END_LABEL_LINE_HEIGHT / 2 - (plotArea.y + plotArea.height) : 0;
	const afterBelow = below > 0 ? -below : 0;
	const first = labels[0];
	const above = first ? plotArea.y - (first.top + afterBelow - END_LABEL_LINE_HEIGHT / 2) : 0;
	const shift = afterBelow + Math.max(above, 0);
	const x = plotArea.x + plotArea.width + 14;

	return (
		<g>
			{labels.map(({ slot, lines, top }) => {
				const y = top + shift;

				return (
					<g key={slot}>
						<SeriesMarker slot={slot} x={x} y={y} />
						<text x={x + 10} y={y + 4} className="text-xs">
							{lines.map((line, index) => (
								<tspan
									key={line}
									x={x + 10}
									dy={index === 0 ? 0 : END_LABEL_LINE_HEIGHT}
									className={index === 0 ? "fill-foreground font-medium" : "fill-muted-foreground"}
								>
									{line}
								</tspan>
							))}
						</text>
					</g>
				);
			})}
		</g>
	);
}
