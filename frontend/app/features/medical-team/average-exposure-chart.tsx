import { ThresholdLegend } from "@/components/exposure-line-chart/threshold-legend.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import type { ExposureAverage } from "@/features/medical-team/medical-team-groups.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

/** Averages are shown as a percentage of the action value, so the action value itself is always 100 % */
const ACTION_VALUE_PERCENT = 100;
const AXIS_PADDING_PERCENT = 15;
const AXIS_TICK_STEP_PERCENT = 25;

type ChartDatum = {
	name: string;
	/** Percentage of the action value, which is what the bar plots */
	average: number;
	value: number;
	unit: string;
	color: string;
};

/** Each exposure's group average, plotted as a percentage of its action value */
export function AverageExposureChart({ averageValues }: { averageValues: Record<Exposure, ExposureAverage> }) {
	const { t } = useTranslation();
	const chartConfig = {
		average: {
			label: t(($) => $.medicalTeamDashboard.average),
			color: "var(--safe)",
		},
	};
	const chartData = toChartData(averageValues, t);
	const { domainMax, ticks } = getPercentAxis(chartData);

	return (
		<div className="px-3 pt-3">
			<p className="px-1 text-muted-foreground text-xs">
				{t(($) => $.medicalTeamDashboard.averageExposureTitle)}
			</p>
			<ChartContainer config={chartConfig} className="mt-2 aspect-auto h-44 w-full">
				<BarChart accessibilityLayer={true} data={chartData} layout="vertical" margin={{ left: 8, right: 20 }}>
					<CartesianGrid horizontal={false} />
					<XAxis
						type="number"
						domain={[0, domainMax]}
						ticks={ticks}
						tickFormatter={(value: number) => `${value}%`}
						axisLine={false}
						tickLine={false}
						fontSize={11}
					/>
					<YAxis type="category" dataKey="name" width={94} axisLine={false} tickLine={false} fontSize={11} />
					<ThresholdLine x={ACTION_VALUE_PERCENT} dangerLevel="warning" />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								formatter={(value, _name, item) => {
									const point = item.payload as ChartDatum;
									return `${point.value} ${point.unit} · ${value}% ${t(($) => $.medicalTeamDashboard.ofActionValue)}`;
								}}
							/>
						}
					/>
					<Bar dataKey="average" name={t(($) => $.medicalTeamDashboard.average)} radius={4}>
						{chartData.map((entry) => (
							<Cell key={entry.name} fill={entry.color} fillOpacity={0.3} stroke={entry.color} />
						))}
					</Bar>
				</BarChart>
			</ChartContainer>
			<ThresholdLegend items={[{ dangerLevel: "warning", color: "var(--warning)" }]} />
		</div>
	);
}

function toChartData(averageValues: Record<Exposure, ExposureAverage>, t: TranslateFn): Array<ChartDatum> {
	return exposures.map((exposure) => {
		const { average, unit, percentOfActionValue } = averageValues[exposure];

		return {
			name: t(($) => $.exposures[exposure]),
			average: percentOfActionValue,
			value: average,
			unit,
			color: percentOfActionValue <= ACTION_VALUE_PERCENT ? "var(--safe)" : "var(--warning)",
		};
	});
}

/** The x-axis always includes the action value, with some padding past the largest bar */
function getPercentAxis(chartData: Array<ChartDatum>) {
	const maxPercent = Math.max(ACTION_VALUE_PERCENT, ...chartData.map((entry) => entry.average));
	const domainMax = maxPercent + AXIS_PADDING_PERCENT;
	const ticks = Array.from(
		{ length: Math.ceil(domainMax / AXIS_TICK_STEP_PERCENT) + 1 },
		(_, index) => index * AXIS_TICK_STEP_PERCENT,
	);

	return { domainMax, ticks };
}
