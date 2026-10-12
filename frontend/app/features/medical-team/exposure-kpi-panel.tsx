import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getGroupUnitLabel } from "@/features/medical-team/medical-team-groups.ts";
import { getPeriodLabel } from "@/features/medical-team/medical-team-period.ts";
import type {
	ExposureKpiPeriod,
	ExposureKpiResponse,
	ExposureKpiResult,
	ExposureKpiThresholds,
} from "@/features/medical-team/queries/medical-team-contracts.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

type ExposureKpiPanelProps = {
	kpiQuery: UseQueryResult<ExposureKpiResponse>;
	groupId: string;
	exposure: Exposure;
};

/** A group's or a hall's KPI for one exposure on its details: how much is above the action and limit values */
export function ExposureKpiPanel({ kpiQuery, groupId, exposure }: ExposureKpiPanelProps) {
	const { t } = useTranslation();

	if (kpiQuery.isPending) {
		return <Skeleton className="h-40 w-full" />;
	}

	if (kpiQuery.isError) {
		return <KpiMessage message={t(($) => $.medicalTeamDashboard.kpi.error)} />;
	}

	const result = kpiQuery.data.groups.find((group) => group.groupId === groupId)?.kpis[exposure];

	if (!result || result.status === "noData") {
		return <KpiMessage message={t(($) => $.medicalTeamDashboard.kpi.noData)} />;
	}

	if (result.status === "suppressed") {
		return <KpiMessage message={t(($) => $.medicalTeamDashboard.kpi.suppressed)} />;
	}

	if (result.status === "unavailable") {
		return <KpiMessage message={t(($) => $.medicalTeamDashboard.kpi.unavailable)} />;
	}

	return (
		<KpiResult
			exposure={exposure}
			period={kpiQuery.data.period}
			thresholds={kpiQuery.data.thresholds[exposure]}
			result={result}
		/>
	);
}

function KpiResult({
	exposure,
	period,
	thresholds,
	result,
}: {
	exposure: Exposure;
	period: ExposureKpiPeriod;
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
			? t(($) => $.medicalTeamDashboard.kpi.values.minutesPerWorkday, { value: numberFormat.format(value) })
			: result.unit === "percentOfMeasurementPeriods"
				? t(($) => $.medicalTeamDashboard.kpi.values.percentOfMeasurementPeriods, {
						value: percentFormat.format(value / 100),
					})
				: t(($) => $.medicalTeamDashboard.kpi.values.percentOfWorkdays, {
						value: percentFormat.format(value / 100),
					});

	return (
		<Card className="gap-3">
			<div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
				<h2 className="font-semibold">{t(($) => $.medicalTeamDashboard.kpi.titles[exposure])}</h2>
				<p className="text-muted-foreground text-sm">{getPeriodLabel(period, t)}</p>
			</div>
			<dl className="flex flex-col gap-1.5 text-sm">
				<div className="flex flex-wrap items-baseline justify-between gap-x-3">
					<dt className="text-muted-foreground">
						{t(($) => $.medicalTeamDashboard.kpi.aboveAction, {
							threshold: formatThreshold(thresholds.action),
						})}
					</dt>
					<dd className="font-semibold tabular-nums">{formatResult(result.aboveAction)}</dd>
				</div>
				<div className="flex flex-wrap items-baseline justify-between gap-x-3">
					<dt className="text-muted-foreground">
						{t(($) => $.medicalTeamDashboard.kpi.aboveLimit, {
							threshold: formatThreshold(thresholds.limit),
						})}
					</dt>
					<dd className="font-semibold tabular-nums">{formatResult(result.aboveLimit)}</dd>
				</div>
			</dl>
		</Card>
	);
}

/** Why there's no KPI to show, kept small so it doesn't outweigh the period's average and trend */
function KpiMessage({ message }: { message: string }) {
	return <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm">{message}</p>;
}
