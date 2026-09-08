import { ExportButton } from "@/components/export-button.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
	BaseExposureLineChartCard,
	ExposureLineChartCardSkeleton,
} from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useExportPDF } from "@/hooks/use-export-pdf.ts";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import {
	type DustField,
	defaultDustField,
	type Exposure,
	type ExposureUnit,
	parseAsDustField,
	parseAsExposureUnit,
} from "@/lib/exposures.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import { useQueryState } from "nuqs";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ExposureGraphEmptyState } from "../statistic-card.tsx";

interface Props {
	userId?: string;
}

export function DustExposureLineChartCard({ userId }: Props) {
	const { t, i18n } = useTranslation();
	const locale = i18n.language;
	const { user } = useUser();
	const { exportToPDF } = useExportPDF();
	const chartContainerId = useId();

	const [dustField] = useQueryState<DustField>("dustField", parseAsDustField.withDefault(defaultDustField));
	const [dustUnit, setDustUnit] = useQueryState("unit", parseAsExposureUnit.withDefault("ug"));

	const exposure: Exposure = "dust";

	const { date, query, data, isLoading, threshold, minY, maxY, minTime, maxTime } = useExposureChartData(exposure, {
		userId,
		dustField,
	});

	if (isLoading) {
		return <ExposureLineChartCardSkeleton />;
	}

	if (!data || data.length === 0) {
		return <ExposureGraphEmptyState date={date} locale={i18n.language} />;
	}

	return (
		<BaseExposureLineChartCard
			minTime={minTime}
			maxTime={maxTime}
			chartData={downsampleExposureData(exposure, data ?? [])}
			unit={dustUnit}
			id={chartContainerId}
			maxY={maxY}
			minY={minY}
			exposure={exposure}
			dustField={query.field}
			headerRight={
				<div className="flex items-center gap-2">
					<Tabs value={dustUnit} onValueChange={(v) => setDustUnit(v as ExposureUnit)}>
						<TabsList>
							<TabsTrigger value="ug">{t(($) => $.exposures.units.ug)}</TabsTrigger>
							<TabsTrigger value="mg">{t(($) => $.exposures.units.mg)}</TabsTrigger>
						</TabsList>
					</Tabs>
					<ExportButton
						title={t(($) => $.common.exportAsPdf)}
						onClick={() =>
							exportToPDF(
								chartContainerId,
								`${date.toLocaleDateString(locale, {
									day: "numeric",
									month: "long",
									year: "numeric",
								})}-${user.name}-Dust-Exposure-Overview`,
								`${t(($) => $.pdf.dustExposure)} - ${user.name} - ${date.toLocaleDateString(locale)}`,
							)
						}
					/>
				</div>
			}
		>
			<ThresholdLine y={threshold.danger} dangerLevel="danger" />
			<ThresholdLine y={threshold.warning} dangerLevel="warning" />
		</BaseExposureLineChartCard>
	);
}
