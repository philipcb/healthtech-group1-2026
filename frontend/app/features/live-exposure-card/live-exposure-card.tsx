import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ExposureSlider } from "@/components/exposure-slider.tsx";
import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import type { ExposureDataDto } from "@/lib/api/generated/models/index.ts";
import { getLiveYAxisRange } from "@/lib/exposure-y-axis.ts";
import type { Exposure, ExposureTypeField, ExposureUnit } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import type { TZDate } from "@date-fns/tz";
import type { CurveType } from "recharts/types/shape/Curve";

interface LiveExposureCardProps {
	exposure: Exposure;
	exposureLabel: string;
	exposureField?: ExposureTypeField;
	exposureUnitLabel: string;
	chartUnit: ExposureUnit;
	data: Array<ExposureDataDto>;
	minTime: TZDate;
	maxTime: TZDate;
	chartClassName?: string;
	showLegend?: boolean;
	lineType?: CurveType;
}

export const LiveExposureCard = ({
	exposure,
	exposureLabel,
	exposureField,
	exposureUnitLabel,
	chartUnit,
	minTime,
	data,
	maxTime,
	chartClassName,
	showLegend = false,
	lineType,
}: LiveExposureCardProps) => {
	const threshold = getThreshold(exposure, exposureField);
	const { minY, maxY, ticks } = getLiveYAxisRange(exposure, data, threshold);
	const latestData = data.at(-1);
	const latestValue = latestData?.value;
	const latestDangerLevel = latestData?.dangerLevel;

	return (
		// Desktop: value beside the chart. Phones: the chart shows the value above itself, and it follows the finger.
		<div className="flex w-full flex-col lg:flex-row lg:gap-4">
			<ExposureSlider
				label={exposureLabel}
				exposure={exposure}
				field={exposureField}
				value={latestValue}
				dangerLevel={latestDangerLevel}
				unitLabel={exposureUnitLabel}
				className="max-lg:hidden lg:w-48"
				withinSection={true}
			/>
			<div className="min-w-0 self-stretch lg:w-128 lg:flex-1">
				<BaseExposureLineChartCard
					minTime={minTime}
					maxTime={maxTime}
					chartData={data}
					unit={chartUnit}
					maxY={maxY}
					minY={minY}
					yTicks={ticks}
					lineType={lineType}
					exposure={exposure}
					variant="compact"
					className={chartClassName}
					contentClassName="p-0"
					chartContainerClassName="!aspect-auto"
					showLegend={showLegend}
					xAxisMode="windowed"
					breakoutOnMobile={true}
					dustField={exposureField}
					// The section names noise and vibration, but not which of dust's three fractions this is
					title={exposure === "dust" ? exposureLabel : undefined}
				>
					<ThresholdLine y={threshold.danger} dangerLevel="danger" />
					<ThresholdLine y={threshold.warning} dangerLevel="warning" />
				</BaseExposureLineChartCard>
			</div>
		</div>
	);
};
