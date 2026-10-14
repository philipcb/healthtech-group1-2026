import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getGroupUnitLabel } from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import type {
	ExposureKpiResponse,
	ExposureKpiResult,
	ExposureKpiThresholds,
} from "@/features/occupational-health-service/queries/occupational-health-service-contracts.ts";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import type { Exposure } from "@/lib/exposures.ts";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

type ExposureKpiPanelProps = {
	/** Fetched for the selected dust fraction, so dust's KPI belongs to the same fraction as the trend */
	kpiQuery: UseQueryResult<ExposureKpiResponse>;
	groupId: string;
	exposure: Exposure;
};

/**
 * A group's or a hall's KPI for one exposure on its details: how much is above the action and limit values. Two cards,
 * or one message in their place, meant to sit in the same grid as the period's average.
 */
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
		return <KpiMessage message={t(($) => $.occupationalHealthServiceDashboard.kpi.error)} />;
	}

	const result = kpiQuery.data.groups.find((group) => group.groupId === groupId)?.kpis[exposure];

	if (!result || result.status === "noData") {
		return <KpiMessage message={t(($) => $.occupationalHealthServiceDashboard.kpi.noData)} />;
	}

	if (result.status === "suppressed") {
		return <KpiMessage message={t(($) => $.occupationalHealthServiceDashboard.kpi.suppressed)} />;
	}

	const thresholds = kpiQuery.data.thresholds[exposure];

	// The contract never has a result without thresholds, but a result is never shown without what it was compared with
	if (result.status === "unavailable" || thresholds === null) {
		return <KpiMessage message={t(($) => $.occupationalHealthServiceDashboard.kpi.unavailable)} />;
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

	const formatThreshold = (value: number) => `${numberFormat.format(value)} ${getGroupUnitLabel(thresholds.unit, t)}`;
	const formatResult = (value: number) =>
		result.unit === "minutesPerWorkday"
			? t(($) => $.occupationalHealthServiceDashboard.kpi.values.minutesPerWorkday, {
					value: numberFormat.format(value),
				})
			: t(($) => $.occupationalHealthServiceDashboard.kpi.values.percentOfWorkdays, {
					value: percentFormat.format(value / 100),
				});

	// No indicator color, since a group's share above a threshold isn't a danger level
	return (
		<>
			<StatisticCardLayout
				label={t(($) => $.lineChart.warning)}
				value={formatResult(result.aboveAction)}
				caption={t(($) => $.occupationalHealthServiceDashboard.kpi.actionValue, {
					threshold: formatThreshold(thresholds.action),
				})}
			/>
			<StatisticCardLayout
				label={t(($) => $.lineChart.danger)}
				value={formatResult(result.aboveLimit)}
				caption={t(($) => $.occupationalHealthServiceDashboard.kpi.limitValue, {
					threshold: formatThreshold(thresholds.limit),
				})}
			/>
		</>
	);
}

/** Why there's no KPI to show, in place of both cards, kept small so it doesn't outweigh the period's average and trend */
function KpiMessage({ message }: { message: string }) {
	return <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm md:col-span-2">{message}</p>;
}
