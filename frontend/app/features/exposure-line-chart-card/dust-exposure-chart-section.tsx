import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { DustExposureLineChartCard } from "@/features/exposure-line-chart-card/dust-exposure-line-chart-card.tsx";
import { ExposureChartView } from "@/features/exposure-line-chart-card/exposure-chart-view.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { type DustField, defaultDustField, dustFields, type Exposure, parseAsDustField } from "@/lib/exposures.ts";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export function DustExposureChartSection() {
	const { t, i18n } = useTranslation();

	const [dustField, setDustField] = useQueryState<DustField>(
		"dustField",
		parseAsDustField.withDefault(defaultDustField),
	);

	const exposure: Exposure = "dust";

	const { view, date, data, isLoading, isError, calendarData, minHour, maxHour } = useExposureChartData(exposure, {
		dustField,
	});

	return (
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
				locale={i18n.language}
			>
				<DustExposureLineChartCard />
			</ExposureChartView>
		</div>
	);
}
