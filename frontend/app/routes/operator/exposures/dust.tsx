import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { DustExposureLineChartCard } from "@/features/exposure-line-chart-card/dust-exposure-line-chart-card.tsx";
import { ExposureChartView } from "@/features/exposure-line-chart-card/exposure-chart-view.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { DustTrendLineChartCard } from "@/features/trend-line-chart-card/dust-trend-line-chart-card.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import {
	type DustField,
	defaultDustField,
	dustFields,
	type Exposure,
	parseAsDustField,
	parseAsExposureUnit,
} from "@/lib/exposures.ts";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export default function Dust() {
	const { t, i18n } = useTranslation();
	const formatDate = useFormatDate();
	const locale = i18n.language;

	const [dustField, setDustField] = useQueryState<DustField>(
		"dustField",
		parseAsDustField.withDefault(defaultDustField),
	);
	const [dustUnit] = useQueryState("unit", parseAsExposureUnit.withDefault("ug"));

	const exposure: Exposure = "dust";

	const {
		view,
		date,
		data,
		isLoading,
		isError,
		threshold,
		averageValue,
		maxPoint,
		latestPoint,
		calendarData,
		minHour,
		maxHour,
	} = useExposureChartData(exposure, { dustField });

	const showTrendLineChart = view === "month" || view === "week";
	const showDustStatistics = view === "day";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-1 flex-col gap-4">
				<Tabs value={dustField} onValueChange={(value) => setDustField(value as DustField)}>
					<TabsList>
						{dustFields.map((field) => (
							<TabsTrigger key={field} value={field}>
								{t(($) => $.exposures.dustFields[field])}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>

				<ExposureChartView
					isLoading={isLoading}
					isError={isError}
					view={view}
					date={date}
					data={data}
					calendarData={calendarData}
					minHour={minHour}
					maxHour={maxHour}
					locale={locale}
				>
					<DustExposureLineChartCard />
				</ExposureChartView>

				{showDustStatistics && (
					<ExposureStatisticsSection
						isLoading={isLoading}
						isEmpty={isError || data?.length === 0}
						averageValue={averageValue}
						maxValue={maxPoint?.value ?? null}
						maxTime={maxPoint?.time ?? null}
						latestValue={latestPoint?.value ?? null}
						warningThreshold={threshold.warning}
						dangerThreshold={threshold.danger}
						unit={dustUnit}
						formatTime={(time) => formatDate(time, "HH:mm")}
					/>
				)}
			</div>
			{showTrendLineChart && <DustTrendLineChartCard unit={dustUnit} />}
		</div>
	);
}
