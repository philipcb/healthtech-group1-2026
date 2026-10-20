import { Skeleton } from "@/components/ui/skeleton.tsx";
import type {
	ExposureKpiResponse,
	ExposureKpiResult,
	ExposureKpiThresholds,
} from "@/features/aggregated-exposure/api/contracts.ts";
import { getGroupUnitLabel } from "@/features/aggregated-exposure/model/groups.ts";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import type { Exposure } from "@/lib/exposures.ts";
import type { UseQueryResult } from "@tanstack/react-query";
import { hoursToMinutes } from "date-fns";
import { useTranslation } from "react-i18next";

/** Minutes above a threshold are shown as a share of a standard 8-hour workday, not of the workdays in the period */
const WORKDAY_MINUTES = hoursToMinutes(8);

type ExposureKpiPanelProps = {
	kpiQuery: UseQueryResult<ExposureKpiResponse>;
	groupId: string;
	exposure: Exposure;
};

export function ExposureKpiPanel({ kpiQuery, groupId, exposure }: ExposureKpiPanelProps) {
	const { t } = useTranslation();

	if (kpiQuery.isPending) {
		return (
			<>
				<Skeleton className="h-14 rounded-xl md:h-26.25" />
				<Skeleton className="h-14 rounded-xl md:h-26.25" />
			</>
		);
	}

	if (kpiQuery.isError) {
		return <KpiMessage message={t(($) => $.aggregatedExposure.kpi.error)} />;
	}

	const result = kpiQuery.data.groups.find((group) => group.groupId === groupId)?.kpis[exposure];

	if (!result || result.status === "noData") {
		return <KpiMessage message={t(($) => $.aggregatedExposure.kpi.noData)} />;
	}

	if (result.status === "suppressed") {
		return <KpiMessage message={t(($) => $.aggregatedExposure.kpi.suppressed)} />;
	}

	const thresholds = kpiQuery.data.thresholds[exposure];

	if (result.status === "unavailable" || thresholds === null) {
		return <KpiMessage message={t(($) => $.aggregatedExposure.kpi.unavailable)} />;
	}

	return <KpiResult thresholds={thresholds} result={result} />;
}

function KpiResult({
	thresholds,
	result,
}: {
	thresholds: ExposureKpiThresholds;
	result: Extract<ExposureKpiResult, { status: "ok" }>;
}) {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "no" ? "nb-NO" : "en-US";
	const numberFormat = new Intl.NumberFormat(locale);
	const percentFormat = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
	const workdayPercentFormat = new Intl.NumberFormat(locale, {
		style: "percent",
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	});

	const formatThreshold = (value: number) => `${numberFormat.format(value)} ${getGroupUnitLabel(thresholds.unit, t)}`;
	const formatResult = (value: number) =>
		result.unit === "minutesPerWorkday"
			? t(($) => $.aggregatedExposure.kpi.values.percentOfWorkingTime, {
					value: workdayPercentFormat.format(value / WORKDAY_MINUTES),
				})
			: t(($) => $.aggregatedExposure.kpi.values.percentOfWorkdays, {
					value: percentFormat.format(value / 100),
				});

	// No indicator color, since a group's share above a threshold isn't a danger level
	return (
		<>
			<StatisticCardLayout
				label={t(($) => $.lineChart.warning)}
				value={formatResult(result.aboveAction)}
				caption={t(($) => $.aggregatedExposure.kpi.actionValue, {
					threshold: formatThreshold(thresholds.action),
				})}
			/>
			<StatisticCardLayout
				label={t(($) => $.lineChart.danger)}
				value={formatResult(result.aboveLimit)}
				caption={t(($) => $.aggregatedExposure.kpi.limitValue, {
					threshold: formatThreshold(thresholds.limit),
				})}
			/>
		</>
	);
}

function KpiMessage({ message }: { message: string }) {
	return <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm md:col-span-2">{message}</p>;
}
