import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SeriesKey } from "@/features/aggregated-exposure/components/series-key.tsx";
import { DangerLevelBadge, ThresholdBar } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import type { GroupResult, MissingStatus } from "@/features/aggregated-exposure/hooks/use-comparison-trends.ts";
import { useGroupDetailsLink } from "@/features/aggregated-exposure/hooks/use-group-details-link.ts";
import {
	type ComparedEntry,
	getComparableGroupContext,
	getComparableGroupName,
} from "@/features/aggregated-exposure/model/compare.ts";
import {
	formatAverageShare,
	formatGroupValue,
	getGroupThreshold,
	getShareLabels,
	hasTimeOverThresholds,
	MIN_GROUP_SIZE,
	NO_VALUE,
} from "@/features/aggregated-exposure/model/groups.ts";
import { countHiddenDays } from "@/features/aggregated-exposure/model/trend-chart.ts";
import type { AggregatedTrendOkDto } from "@/lib/api/generated/models/index.ts";
import { getDangerLevel } from "@/lib/danger-levels.ts";
import type { DustField, Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

type ComparisonFiguresProps = {
	exposure: Exposure;
	dustField: DustField;
	unit: ExposureUnit;
	entries: Array<ComparedEntry>;
	results: Array<GroupResult>;
	periodLabel: string;
};

export function ComparisonFigures({
	exposure,
	dustField,
	unit,
	entries,
	results,
	periodLabel,
}: ComparisonFiguresProps) {
	const { t } = useTranslation();
	const shareLabels = getShareLabels(exposure, t);
	const hasShares = hasTimeOverThresholds(exposure, dustField);
	const rows = entries.map((entry, index) => ({ entry, result: results[index] ?? { status: "pending" as const } }));
	const averageProps = { exposure, dustField, unit };

	return (
		<div className="@container flex min-w-0 flex-col gap-2">
			<table className="@xl:table hidden w-full text-sm">
				<caption className="sr-only">
					{t(($) => $.aggregatedExposure.compare.tableCaption, {
						exposure: t(($) => $.exposures[exposure]),
						period: periodLabel,
					})}
				</caption>
				<thead>
					<tr className="border-b text-left text-muted-foreground text-xs">
						<th scope="col" className="pr-3 pb-2 font-medium">
							{t(($) => $.aggregatedExposure.compare.group)}
						</th>
						<th scope="col" className="px-3 pb-2 font-medium">
							{t(($) => $.aggregatedExposure.group.periodAverage)}
						</th>
						<th scope="col" className="px-3 pb-2 font-medium">
							{shareLabels.action}
						</th>
						<th scope="col" className="pb-2 pl-3 font-medium">
							{shareLabels.limit}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ entry, result }) => (
						<tr key={entry.group.groupId} className="border-t first:border-t-0">
							<th scope="row" className="py-3 pr-3 text-left align-top font-normal">
								<GroupName entry={entry} result={result} exposure={exposure} />
							</th>
							{result.status === "ok" ? (
								<>
									<td className="px-3 py-3 align-top">
										<Average trend={result.trend} {...averageProps} />
									</td>
									<td className="px-3 py-3 align-top tabular-nums">
										<Share trend={result.trend} kind="action" hasShares={hasShares} />
									</td>
									<td className="py-3 pl-3 align-top tabular-nums">
										<Share trend={result.trend} kind="limit" hasShares={hasShares} />
									</td>
								</>
							) : (
								<td colSpan={3} className="py-3 pl-3 align-top text-muted-foreground">
									<MissingFigures result={result} periodLabel={periodLabel} />
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>

			<ul className="flex @xl:hidden flex-col">
				{rows.map(({ entry, result }) => (
					<li key={entry.group.groupId} className="flex flex-col gap-2 border-t py-3 first:border-t-0">
						<GroupName entry={entry} result={result} exposure={exposure} />
						{result.status === "ok" ? (
							<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
								<div className="col-span-full">
									<dt className="text-muted-foreground text-xs">
										{t(($) => $.aggregatedExposure.group.periodAverage)}
									</dt>
									<dd>
										<Average trend={result.trend} {...averageProps} />
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground text-xs">{shareLabels.action}</dt>
									<dd className="tabular-nums">
										<Share trend={result.trend} kind="action" hasShares={hasShares} />
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground text-xs">{shareLabels.limit}</dt>
									<dd className="tabular-nums">
										<Share trend={result.trend} kind="limit" hasShares={hasShares} />
									</dd>
								</div>
							</dl>
						) : (
							<div className="text-muted-foreground text-sm">
								<MissingFigures result={result} periodLabel={periodLabel} />
							</div>
						)}
					</li>
				))}
			</ul>

			{!hasShares && (
				<p className="text-muted-foreground text-xs">
					{t(($) => $.aggregatedExposure.group.timeOverOnlyForDustField, {
						dustField: t(($) => $.exposures.dustFields.pm1_twa),
					})}
				</p>
			)}
		</div>
	);
}

function GroupName({
	entry: { group, slot },
	result,
	exposure,
}: {
	entry: ComparedEntry;
	result: GroupResult;
	exposure: Exposure;
}) {
	const { t } = useTranslation();
	const getDetailsLink = useGroupDetailsLink();
	const name = getComparableGroupName(group, t);

	return (
		<div className="flex items-start gap-2.5">
			<span className="mt-1">
				{result.status === "ok" ? <SeriesKey slot={slot} /> : <span className="block w-5.5" />}
			</span>
			<div className="min-w-0">
				<Link
					to={getDetailsLink(group.groupId, exposure)}
					className="font-medium text-foreground underline-offset-3 hover:underline"
				>
					{name}
				</Link>
				<p className="text-muted-foreground text-xs">{getComparableGroupContext(group, t)}</p>
			</div>
		</div>
	);
}

function Average({
	trend,
	exposure,
	dustField,
	unit,
}: {
	trend: AggregatedTrendOkDto;
	exposure: Exposure;
	dustField: DustField;
	unit: ExposureUnit;
}) {
	const { t } = useTranslation();
	const threshold = getGroupThreshold(exposure, dustField);
	const { average } = trend;
	const hiddenDays = countHiddenDays(trend.points);

	if (average === undefined) {
		return <span>{t(($) => $.aggregatedExposure.group.noPeriodAverage)}</span>;
	}

	const level = getDangerLevel(average, threshold.warning, threshold.danger);
	const levelLabel =
		level === "safe" ? t(($) => $.aggregatedExposure.overview.belowActionValue) : t(($) => $.lineChart[level]);

	return (
		<div className="flex max-w-48 flex-col gap-1.5">
			<span className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span className="font-semibold text-base tabular-nums">{formatGroupValue(average, unit, t)}</span>
				<DangerLevelBadge dangerLevel={level} />
				<span className="text-muted-foreground text-xs">{levelLabel}</span>
			</span>
			<ThresholdBar value={average} threshold={threshold} />
			{hiddenDays > 0 && (
				<span className="text-muted-foreground text-xs">
					{t(($) => $.aggregatedExposure.compare.hiddenDays, { count: hiddenDays })}
				</span>
			)}
		</div>
	);
}

function Share({
	trend,
	kind,
	hasShares,
}: {
	trend: AggregatedTrendOkDto;
	kind: "action" | "limit";
	hasShares: boolean;
}) {
	if (!hasShares) {
		return NO_VALUE;
	}

	return formatAverageShare(
		trend.points.map((point) => (kind === "action" ? point.averageTimeOverAction : point.averageTimeOverLimit)),
	);
}

function MissingFigures({
	result,
	periodLabel,
}: {
	result: Exclude<GroupResult, { status: "ok" }>;
	periodLabel: string;
}): ReactNode {
	const { t } = useTranslation();

	if (result.status === "pending") {
		return <Skeleton className="h-5 w-40" />;
	}

	if (result.status === "error") {
		return (
			<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
				{t(($) => $.aggregatedExposure.group.trendError)}
				<Button variant="outline" size="xs" onClick={result.retry}>
					<RotateCw aria-hidden="true" />
					{t(($) => $.aggregatedExposure.compare.retry)}
				</Button>
			</span>
		);
	}

	const text: Record<MissingStatus, { title: string; description: string }> = {
		noData: {
			title: t(($) => $.aggregatedExposure.compare.noData),
			description: t(($) => $.aggregatedExposure.compare.noDataDescription, { period: periodLabel }),
		},
		notEnoughData: {
			title: t(($) => $.aggregatedExposure.compare.notEnoughData),
			description: t(($) => $.aggregatedExposure.compare.notEnoughDataDescription, {
				count: MIN_GROUP_SIZE,
				period: periodLabel,
			}),
		},
		unavailable: {
			title: t(($) => $.aggregatedExposure.unavailableValue),
			description: t(($) => $.aggregatedExposure.compare.unavailableDescription),
		},
	};

	return (
		<>
			<span className="font-medium text-foreground">{text[result.status].title}</span>
			<span className="block text-xs">{text[result.status].description}</span>
		</>
	);
}
