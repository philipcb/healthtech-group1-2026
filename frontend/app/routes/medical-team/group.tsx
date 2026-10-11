import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/medical-team/empty-state.tsx";
import { GroupTrendChart } from "@/features/medical-team/group-trend-chart.tsx";
import { MedicalExposureToggle } from "@/features/medical-team/medical-exposure-toggle.tsx";
import { MedicalPeriodPicker } from "@/features/medical-team/medical-period-picker.tsx";
import { formatGroupValue, getGroupName, getGroupUnitLabel } from "@/features/medical-team/medical-team-groups.ts";
import { PeriodAndPrivacyNotice } from "@/features/medical-team/medical-team-notices.tsx";
import { type GroupTrendResponse, groupTrendQueryOptions } from "@/features/medical-team/medical-team-queries.ts";
import { useMedicalTeamSearchParams } from "@/features/medical-team/medical-team-search-params.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href, Link, useLocation } from "react-router";
import type { Route } from "./+types/group";

export default function MedicalTeamGroup({ params }: Route.ComponentProps) {
	const { t } = useTranslation();
	const { search } = useLocation();
	const { exposure, setExposure, periodSelection } = useMedicalTeamSearchParams();
	const { period, month, year } = periodSelection;
	const { data, isPending, isError } = useQuery(
		groupTrendQueryOptions({ groupId: params.groupId, exposure, period, month, year }),
	);

	return (
		<div className="flex w-full min-w-0 flex-col gap-7">
			<div className="flex flex-col gap-4 border-b pb-5">
				<Button asChild={true} variant="ghost" size="sm" className="-ml-2 w-fit">
					{/* Keeps the selection, so the overview shows the same exposure and period */}
					<Link to={{ pathname: href("/medical-team"), search }}>
						<ArrowLeft aria-hidden="true" className="size-4" />
						{t(($) => $.medicalTeamDashboard.group.back)}
					</Link>
				</Button>
				<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="space-y-1">
						<p className="text-muted-foreground text-sm">
							{t(($) => $.medicalTeamDashboard.group.eyebrow)}
						</p>
						{isPending ? (
							<Skeleton className="h-8 w-56" />
						) : (
							<h1 className="font-medium text-2xl">
								{data?.status === "ok"
									? getGroupName(data.group, t)
									: t(($) => $.medicalTeamDashboard.group.fallbackTitle)}
							</h1>
						)}
					</div>
					<MedicalPeriodPicker selection={periodSelection} />
				</header>
			</div>

			<MedicalExposureToggle
				label={t(($) => $.medicalTeamDashboard.exposureLabel)}
				value={exposure}
				onValueChange={setExposure}
			/>

			<PeriodAndPrivacyNotice periodSelection={periodSelection} />

			{isPending ? (
				<Skeleton className="h-96 w-full" />
			) : isError ? (
				<EmptyState title={t(($) => $.medicalTeamDashboard.group.error)} />
			) : data.status === "unavailable" ? (
				<EmptyState title={t(($) => $.medicalTeamDashboard.group.unavailable[data.reason])} />
			) : (
				<GroupDetails trend={data} exposure={exposure} />
			)}
		</div>
	);
}

function GroupDetails({
	trend,
	exposure,
}: {
	trend: Extract<GroupTrendResponse, { status: "ok" }>;
	exposure: Exposure;
}) {
	const { t } = useTranslation();
	const metricLabel = t(($) => $.medicalTeamDashboard.metrics[exposure]);

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<p className="text-muted-foreground text-sm">{t(($) => $.medicalTeamDashboard.group.periodAverage)}</p>
				<p className="font-semibold text-3xl tabular-nums">
					{trend.average === null
						? t(($) => $.medicalTeamDashboard.group.noPeriodAverage)
						: formatGroupValue(trend.average, trend.unit, t)}
				</p>
				<p className="text-muted-foreground text-xs">{metricLabel}</p>
			</Card>

			<Card className="gap-3">
				<div className="space-y-1">
					<h2 className="font-semibold">{t(($) => $.medicalTeamDashboard.group.trendTitle)}</h2>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.medicalTeamDashboard.group.unitAndGranularity, {
							unit: getGroupUnitLabel(trend.unit, t),
							// Vibration explains what each point averages, since it's an average of per-person averages
							granularity:
								exposure === "vibration"
									? t(($) => $.medicalTeamDashboard.group.vibrationGranularity[trend.granularity])
									: t(($) => $.medicalTeamDashboard.group.granularity[trend.granularity]),
						})}
					</p>
				</div>
				{trend.points.length === 0 ? (
					<EmptyState title={t(($) => $.medicalTeamDashboard.group.noData)} />
				) : trend.points.every((point) => point.value === null) ? (
					<EmptyState title={t(($) => $.medicalTeamDashboard.group.allSuppressed)} />
				) : (
					<GroupTrendChart
						points={trend.points}
						granularity={trend.granularity}
						unit={trend.unit}
						label={metricLabel}
					/>
				)}
				<ul className="list-disc space-y-1 pl-4 text-muted-foreground text-xs">
					<li>{t(($) => $.medicalTeamDashboard.group.gapsNotice)}</li>
					<li>{t(($) => $.medicalTeamDashboard.group.comparisonNotice)}</li>
				</ul>
			</Card>
		</div>
	);
}
