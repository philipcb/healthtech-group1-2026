import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ExposureSlider } from "@/components/exposure-slider.tsx";
import { BaseExposureLineChartCard } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import type { ExposureDto, ExposureTypeField } from "@/lib/dto/exposure.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import type { Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import type { TZDate } from "@date-fns/tz";
import type { CurveType } from "recharts/types/shape/Curve";

interface LiveExposureCardProps {
	exposure: Exposure;
	exposureLabel: string;
	exposureField?: ExposureTypeField;
	exposureUnitLabel: string;
	chartUnit: ExposureUnit;
	data: Array<ExposureDto>;
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
	const { minY, maxY } = getExposureYAxisRange(exposure, data);

	const threshold = getThreshold(exposure, exposureField);
	const latestData = data.at(-1);
	const latestValue = latestData?.value;
	const latestDangerLevel = latestData?.dangerLevel;

	return (
		<div className="flex w-full gap-4">
			<ExposureSlider
				label={exposureLabel}
				exposure={exposure}
				field={exposureField}
				value={latestValue}
				dangerLevel={latestDangerLevel}
				unitLabel={exposureUnitLabel}
				className="w-48"
			/>
			<div className="w-128 flex-1 self-stretch">
				<BaseExposureLineChartCard
					minTime={minTime}
					maxTime={maxTime}
					chartData={data}
					unit={chartUnit}
					maxY={maxY}
					minY={minY}
					lineType={lineType}
					exposure={exposure}
					variant="compact"
					className={chartClassName}
					contentClassName="p-0"
					chartContainerClassName="!aspect-auto"
					showLegend={showLegend}
					xAxisMode="windowed"
					dustField={exposureField}
				>
					<ThresholdLine y={threshold.danger} dangerLevel="danger" />
					<ThresholdLine y={threshold.warning} dangerLevel="warning" />
				</BaseExposureLineChartCard>
			</div>
		</div>
	);
};
