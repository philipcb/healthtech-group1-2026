import { ExposureRiskCard } from "@/components/exposure-level-card.tsx";
import { OptionToggle } from "@/components/option-toggle.tsx";
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
import { ChartPieIcon, LayoutGridIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
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

const summaryDisplays = ["cards", "charts"] as const;
type SummaryDisplay = (typeof summaryDisplays)[number];

/**
 * The team's status. For all exposures it's a card per danger level, which narrows the team list to the operators it
 * counts, or a pie chart per exposure. For one exposure, the operators are listed per danger level.
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
	const [display, setDisplay] = useQueryState("summary", parseAsStringLiteral(summaryDisplays).withDefault("cards"));

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
			<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
				<div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
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

				{/* With one exposure, its operators are already listed per danger level, so there is nothing to switch */}
				{exposure === null && (
					<OptionToggle<SummaryDisplay>
						label={t(($) => $.foremanDashboard.overview.summaryDisplay.label)}
						hidesLabel={true}
						fillsWidth={false}
						value={display}
						onValueChange={setDisplay}
						options={[
							{
								value: "cards",
								label: t(($) => $.foremanDashboard.overview.summaryDisplay.cards),
								icon: <LayoutGridIcon className="size-4" aria-hidden="true" />,
							},
							{
								value: "charts",
								label: t(($) => $.foremanDashboard.overview.summaryDisplay.charts),
								icon: <ChartPieIcon className="size-4" aria-hidden="true" />,
							},
						]}
					/>
				)}
			</div>

			{exposure === null ? (
				display === "charts" ? (
					<ExposurePieGrid thresholdSummary={thresholdSummary} subordinates={subordinates} />
				) : (
					statusCards
				)
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
