import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ExposureChartView } from "@/features/exposure-line-chart-card/exposure-chart-view.tsx";
import NoiseExposureLineChartCard from "@/features/exposure-line-chart-card/noise-exposure-line-chart-card.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export function NoiseExposureChartSection() {
	const { t, i18n } = useTranslation();

	const exposure: Exposure = "noise";
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation, setAggregation] = useQueryState<Aggregation>(
		"aggregation",
		parseAsAggregation.withDefault("average"),
	);
	const usePeakAggregation = aggregation === "peak";

	const { view, date, data, isLoading, isError, calendarData, minHour, maxHour } = useExposureChartData(exposure, {
		usePeakAggregation,
	});

	return (
		<div className="flex flex-1 flex-col gap-4">
			<Tabs value={aggregation} onValueChange={(value) => setAggregation(value as Aggregation)}>
				<TabsList>
					<TabsTrigger value="average">{t(($) => $.measurement.average)}</TabsTrigger>
					<TabsTrigger value="peak">{t(($) => $.measurement.peak)}</TabsTrigger>
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
				locale={i18n.language}
			>
				<NoiseExposureLineChartCard />
			</ExposureChartView>
		</div>
	);
}
