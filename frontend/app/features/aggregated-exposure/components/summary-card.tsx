import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card } from "@/components/ui/card.tsx";
import type { GroupSummary, GroupSummaryResponse } from "@/features/aggregated-exposure/api/contracts.ts";
import { DangerLevelBadge, ThresholdBar } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { formatGroupValue, thresholdByExposure } from "@/features/aggregated-exposure/model/groups.ts";
import { getDangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

export function SummaryCard({
	header,
	groupId,
	name,
	averages,
	units,
	shownExposures,
}: {
	header: ReactNode;
	groupId: string;
	name: string;
	averages: GroupSummary["averages"];
	units: GroupSummaryResponse["units"];
	shownExposures: ReadonlyArray<Exposure>;
}) {
	return (
		<Card variant="labeled" className="h-full rounded-lg">
			<div className="border-b px-4 py-2 sm:py-3">{header}</div>
			<ul className="flex flex-col gap-1 p-2">
				{shownExposures.map((exposure) => (
					<li key={exposure}>
						<ExposureLink
							groupId={groupId}
							name={name}
							average={averages[exposure]}
							exposure={exposure}
							unit={units[exposure]}
						/>
					</li>
				))}
			</ul>
		</Card>
	);
}

function ExposureLink({
	groupId,
	name,
	average,
	exposure,
	unit,
}: {
	groupId: string;
	name: string;
	average: number | null;
	exposure: Exposure;
	unit: GroupSummaryResponse["units"][Exposure];
}) {
	const { t } = useTranslation();
	const { search } = useLocation();
	const { getGroupPath } = useDashboardScope();

	const value =
		average === null ? t(($) => $.aggregatedExposure.overview.noValue) : formatGroupValue(average, unit, t);
	const threshold = thresholdByExposure[exposure];
	const level = average === null ? null : getDangerLevel(average, threshold.warning, threshold.danger);
	// The level is also written out and shown as dots, so it isn't only shown by the bar's colors. Without a value there's
	// no level, so a missing value never looks like a safe one.
	const levelLabel = level === "warning" || level === "danger" ? t(($) => $.lineChart[level]) : null;

	const searchParams = new URLSearchParams(search);
	searchParams.set("exposure", exposure);

	return (
		<Link
			to={{
				pathname: getGroupPath(groupId),
				search: `?${searchParams}`,
			}}
			aria-label={t(($) => $.aggregatedExposure.overview.openDetails, {
				exposure: t(($) => $.exposures[exposure]),
				group: name,
				value: levelLabel ? `${value}, ${levelLabel.toLowerCase()}` : value,
			})}
			className="flex flex-col gap-1.5 rounded-md p-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
				<span className="flex min-w-0 grow items-center gap-2">
					<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
					<span className="font-medium">{t(($) => $.exposures[exposure])}</span>
					<span className="w-0 grow truncate text-muted-foreground text-xs">
						{t(($) => $.aggregatedExposure.metricsShort[exposure])}
					</span>
				</span>
				<span className="ml-auto flex shrink-0 items-center gap-1 tabular-nums">
					{level && <DangerLevelBadge dangerLevel={level} />}
					{levelLabel && <span className="mr-1 text-muted-foreground text-xs">{levelLabel}</span>}
					{value}
					<ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
				</span>
			</span>
			<ThresholdBar value={average} threshold={threshold} />
		</Link>
	);
}
