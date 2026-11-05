import { ExposureRiskCard } from "@/components/exposure-level-card.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ExposurePieGrid } from "@/features/attention-card/exposure-pie-grid.tsx";
import { hasNoActiveSensors } from "@/features/attention-card/inactive-sensors.ts";
import { StatCard } from "@/features/attention-card/stat-card.tsx";
import type { TeamStatusFilter } from "@/features/team/team-status-filter.ts";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { ThresholdSummary } from "@/lib/threshold-summary.ts";
import { useTranslation } from "react-i18next";

interface AttentionCardProps {
	subordinates: Array<UserWithStatusDto>;
	isSubordinatesLoading?: boolean;
	thresholdSummary?: ThresholdSummary;
	isThresholdSummaryLoading?: boolean;
	exposure: Exposure | null;
	statusFilter: TeamStatusFilter | null;
	onStatusFilterChange: (filter: TeamStatusFilter | null) => void;
	onUserClick: (userId: string) => void;
}

const dangerLevels = ["danger", "warning", "safe"] as const satisfies ReadonlyArray<DangerLevel>;

/**
 * The team's status. For all exposures it's a card per danger level, which narrows the team list to the operators it
 * counts, and a pie chart per exposure. For one exposure, the operators are listed per danger level.
 */
export const AttentionCard = ({
	subordinates,
	isSubordinatesLoading,
	thresholdSummary,
	isThresholdSummaryLoading,
	exposure,
	statusFilter,
	onStatusFilterChange,
	onUserClick,
}: AttentionCardProps) => {
	const { t } = useTranslation();

	if (isThresholdSummaryLoading || thresholdSummary === undefined) {
		return (
			<Card className="gap-3 p-6">
				<Skeleton className="h-8 w-[50%] rounded-full bg-zinc-100 dark:bg-accent" />
				<Skeleton className="mt-4 h-32 w-full rounded-xl bg-zinc-100 dark:bg-accent" />
			</Card>
		);
	}

	const summary = thresholdSummary[exposure ?? "total"];
	const highestDangerLevel: DangerLevel =
		subordinates.length === 0 ? "safe" : summary.danger > 0 ? "danger" : summary.warning > 0 ? "warning" : "safe";

	const noActiveSensorsCount = subordinates.filter(hasNoActiveSensors).length;

	const countOf = (filter: TeamStatusFilter) => {
		if (filter === "inactive") {
			return noActiveSensorsCount;
		}

		// The backend counts users without any data as safe
		return filter === "safe" ? Math.max(0, summary.safe - noActiveSensorsCount) : summary[filter];
	};

	const toggle = (filter: TeamStatusFilter) => onStatusFilterChange(statusFilter === filter ? null : filter);

	const warningDescription =
		highestDangerLevel === "safe"
			? null
			: t(($) => $.foremanDashboard.actionCard[`${highestDangerLevel}Description`]);

	const statusCards = (
		// auto-fit collapses the empty track, so three cards fill the row as well as four
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
			{dangerLevels.map((level) => (
				<StatCard
					key={level}
					label={t(($) => $.foremanDashboard.overview.statCards[level].label)}
					dangerLevel={level}
					value={countOf(level)}
					selected={statusFilter === level}
					onClick={() => toggle(level)}
				/>
			))}

			{(noActiveSensorsCount > 0 || statusFilter === "inactive") && (
				<StatCard
					label={t(($) => $.foremanDashboard.overview.statCards.noActiveSensors.label)}
					value={noActiveSensorsCount}
					selected={statusFilter === "inactive"}
					onClick={() => toggle("inactive")}
				/>
			)}
		</div>
	);

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				{isSubordinatesLoading ? (
					<Skeleton className="h-7 w-[50%] rounded-full bg-zinc-100 dark:bg-accent" />
				) : (
					<>
						<h2 className="text-balance font-semibold text-foreground text-xl">
							{t(($) => $.foremanDashboard.actionCard[highestDangerLevel])}
						</h2>
						{warningDescription && (
							<p className="max-w-prose text-muted-foreground">{warningDescription}</p>
						)}
					</>
				)}
			</div>

			{exposure === null ? (
				<div className="flex flex-col gap-8">
					{statusCards}

					<div className="flex flex-col gap-4">
						<h3 className="font-medium text-lg">{t(($) => $.foremanDashboard.overview.exposure)}</h3>
						<ExposurePieGrid thresholdSummary={thresholdSummary} subordinates={subordinates} />
					</div>
				</div>
			) : (
				<div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
					{dangerLevels.map((level) => (
						<ExposureRiskCard
							key={level}
							users={subordinates}
							exposure={exposure}
							dangerLevel={level}
							onUserClick={(userId) => userId && onUserClick(userId)}
						/>
					))}
				</div>
			)}
		</section>
	);
};
