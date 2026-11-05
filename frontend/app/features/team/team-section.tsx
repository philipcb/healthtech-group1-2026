import { OperatorExposureStatusTable } from "@/components/operator-exposure-status-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { matchesTeamStatusFilter, type TeamStatusFilter } from "@/features/team/team-status-filter.ts";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { RotateCwIcon, UserPlusIcon, XIcon } from "lucide-react";
import { type Ref, useId } from "react";
import { useTranslation } from "react-i18next";
import { href, Link } from "react-router";

type TeamSectionProps = {
	ref?: Ref<HTMLElement>;
	subordinates: Array<UserWithStatusDto>;
	isLoading: boolean;
	error: unknown;
	onRetry: () => void;
	statusFilter: TeamStatusFilter | null;
	onStatusFilterChange: (filter: TeamStatusFilter | null) => void;
};

/** The foreman's team with each member's exposure status. Members are added and removed in the team settings */
export function TeamSection({
	ref,
	subordinates,
	isLoading,
	error,
	onRetry,
	statusFilter,
	onStatusFilterChange,
}: TeamSectionProps) {
	const { t } = useTranslation();
	const titleId = useId();

	const isReady = !(isLoading || error);
	const isEmpty = isReady && subordinates.length === 0;

	const shownMembers =
		statusFilter === null
			? subordinates
			: subordinates.filter((member) => matchesTeamStatusFilter(member, statusFilter));

	const filterLabel =
		statusFilter === null
			? null
			: statusFilter === "inactive"
				? t(($) => $.foremanDashboard.overview.statCards.noActiveSensors.label)
				: t(($) => $.foremanDashboard.overview.statCards[statusFilter].label);

	return (
		// The sticky header would otherwise cover the heading when the section is scrolled to
		<section ref={ref} className="flex scroll-mt-24 flex-col gap-4" aria-labelledby={titleId}>
			<div className="flex min-h-8 items-baseline gap-2">
				<h2 id={titleId} className="font-semibold text-lg">
					{t(($) => $.foremanDashboard.team.title)}
				</h2>
				{isReady && !isEmpty && (
					<p className="text-muted-foreground text-sm">
						{t(($) => $.foremanDashboard.team.memberCountShort, { count: subordinates.length })}
					</p>
				)}
			</div>

			{isReady && !isEmpty && filterLabel !== null && (
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<p className="text-muted-foreground">
						{t(($) => $.foremanDashboard.team.filteredCount, {
							shown: shownMembers.length,
							total: subordinates.length,
						})}
					</p>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						aria-label={t(($) => $.foremanDashboard.team.clearFilter, { filter: filterLabel })}
						onClick={() => onStatusFilterChange(null)}
					>
						{filterLabel}
						<XIcon aria-hidden="true" />
					</Button>
				</div>
			)}

			{isLoading ? (
				<p className="p-4">{t(($) => $.common.loading)}</p>
			) : error ? (
				<div role="alert" className="flex flex-wrap items-center gap-3 p-4">
					<p className="text-destructive">{t(($) => $.foremanDashboard.team.failedToLoadMembers)}</p>
					<Button type="button" size="sm" variant="outline" onClick={onRetry}>
						<RotateCwIcon aria-hidden="true" />
						{t(($) => $.foremanDashboard.team.retry)}
					</Button>
				</div>
			) : isEmpty ? (
				<div className="flex flex-col items-start gap-3 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm">{t(($) => $.foremanDashboard.team.empty)}</p>
					<Button asChild={true} size="sm">
						<Link to={href("/foreman/team")}>
							<UserPlusIcon aria-hidden="true" />
							{t(($) => $.foremanDashboard.team.action.addSubordinate)}
						</Link>
					</Button>
				</div>
			) : shownMembers.length === 0 ? (
				<p className="rounded-lg border p-4 text-muted-foreground text-sm">
					{t(($) => $.foremanDashboard.team.noFilterMatches)}
				</p>
			) : (
				<OperatorExposureStatusTable data={shownMembers} />
			)}
		</section>
	);
}
