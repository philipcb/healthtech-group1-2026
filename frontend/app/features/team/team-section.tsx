import { OperatorExposureStatusTable } from "@/components/operator-exposure-status-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { matchesTeamStatusFilter, type TeamStatusFilter } from "@/features/team/team-status-filter.ts";
import { toFrontendUser, type User, UserRole } from "@/features/user/user.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { UserSearch } from "@/features/user/user-search.tsx";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { useAddSubordinates, useGetUsers, useRemoveSubordinates } from "@/lib/api/generated/user.ts";
import { invalidateSubordinates } from "@/lib/api/invalidation.ts";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, RotateCwIcon, UserMinusIcon, UserPenIcon, UserPlusIcon, XIcon } from "lucide-react";
import { type Ref, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type TeamSectionProps = {
	ref?: Ref<HTMLElement>;
	subordinates: Array<UserWithStatusDto>;
	isLoading: boolean;
	error: unknown;
	onRetry: () => void;
	statusFilter: TeamStatusFilter | null;
	onStatusFilterChange: (filter: TeamStatusFilter | null) => void;
};

/** The foreman's team with each member's exposure status, and where members are added and removed */
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
	const { user } = useUser();
	const titleId = useId();
	const [isManaging, setIsManaging] = useState(false);

	const queryClient = useQueryClient();
	const mutation = {
		onSuccess: (_: unknown, { managerId }: { managerId: string }) => invalidateSubordinates(queryClient, managerId),
	};
	const addSubordinates = useAddSubordinates({ mutation });
	const removeSubordinates = useRemoveSubordinates({ mutation });

	const isReady = !(isLoading || error);
	const isEmpty = isReady && subordinates.length === 0;
	// An empty team can only be added to, so it doesn't wait for the foreman to start managing it
	const showsEditing = isManaging || isEmpty;
	const hasMutationError = addSubordinates.isError || removeSubordinates.isError;

	const shownMembers =
		statusFilter === null
			? subordinates
			: subordinates.filter((member) => matchesTeamStatusFilter(member, statusFilter));

	const isRemoving = (member: UserWithStatusDto) =>
		removeSubordinates.isPending && removeSubordinates.variables.data.includes(member.id);

	const filterLabel =
		statusFilter === null
			? null
			: statusFilter === "inactive"
				? t(($) => $.foremanDashboard.overview.statCards.noActiveSensors.label)
				: t(($) => $.foremanDashboard.overview.statCards[statusFilter].label);

	return (
		// The sticky header would otherwise cover the heading when the section is scrolled to
		<section ref={ref} className="flex scroll-mt-24 flex-col gap-4" aria-labelledby={titleId}>
			<div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<div className="flex items-baseline gap-2">
					<h2 id={titleId} className="font-semibold text-lg">
						{t(($) => $.foremanDashboard.team.title)}
					</h2>
					{isReady && !isEmpty && (
						<p className="text-muted-foreground text-sm">
							{t(($) => $.foremanDashboard.team.memberCountShort, { count: subordinates.length })}
						</p>
					)}
				</div>
				{isReady && !isEmpty && (
					<Button
						type="button"
						size="sm"
						variant={isManaging ? "default" : "outline"}
						onClick={() => setIsManaging((current) => !current)}
					>
						{isManaging ? <CheckIcon aria-hidden="true" /> : <UserPenIcon aria-hidden="true" />}
						{isManaging
							? t(($) => $.foremanDashboard.team.action.done)
							: t(($) => $.foremanDashboard.team.action.manage)}
					</Button>
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

			{isEmpty && <p className="text-muted-foreground text-sm">{t(($) => $.foremanDashboard.team.empty)}</p>}

			{showsEditing && (
				<AddMembers
					subordinates={subordinates}
					isPending={addSubordinates.isPending}
					onAdd={(members, onSuccess) =>
						addSubordinates.mutate(
							{ managerId: user.id, data: members.map((member) => member.id) },
							{ onSuccess },
						)
					}
				/>
			)}

			{hasMutationError && (
				<p role="alert" className="text-destructive text-sm">
					{t(($) => $.foremanDashboard.team.updateFailed)}
				</p>
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
			) : isEmpty ? null : shownMembers.length === 0 ? (
				<p className="rounded-lg border p-4 text-muted-foreground text-sm">
					{t(($) => $.foremanDashboard.team.noFilterMatches)}
				</p>
			) : (
				<OperatorExposureStatusTable
					data={shownMembers}
					rowAction={
						isManaging
							? (member) => (
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="text-destructive hover:text-destructive"
										aria-label={t(($) => $.foremanDashboard.team.action.removeMember, {
											name: member.name,
										})}
										disabled={isRemoving(member)}
										onClick={() =>
											removeSubordinates.mutate({ managerId: user.id, data: [member.id] })
										}
									>
										<UserMinusIcon aria-hidden="true" />
										{t(($) => $.foremanDashboard.team.action.remove)}
									</Button>
								)
							: undefined
					}
				/>
			)}
		</section>
	);
}

type AddMembersProps = {
	subordinates: Array<UserWithStatusDto>;
	isPending: boolean;
	onAdd: (members: Array<User>, onSuccess: () => void) => void;
};

/** Mounted only while the team is edited, so the list of all users is only fetched then */
function AddMembers({ subordinates, isPending, onAdd }: AddMembersProps) {
	const { t } = useTranslation();
	const [selection, setSelection] = useState<Array<User>>([]);
	const { data: users } = useGetUsers();

	// Operators who aren't in the team yet
	const candidates = useMemo(() => {
		const subordinateIds = new Set(subordinates.map((subordinate) => subordinate.id));

		return (users ?? [])
			.map(toFrontendUser)
			.filter((candidate) => candidate.role === UserRole.Operator && !subordinateIds.has(candidate.id));
	}, [users, subordinates]);

	return (
		<fieldset className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted p-4">
			<legend className="float-left font-medium text-sm">{t(($) => $.foremanDashboard.team.addLabel)}</legend>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start">
				<UserSearch
					users={candidates}
					placeholder={t(($) => $.user.searchPlaceholder)}
					multiple={true}
					value={selection}
					onValueChange={(value) => setSelection(value ?? [])}
					disabled={candidates.length === 0}
					emptyLabel={t(($) => $.common.noOptions)}
				/>
				<Button
					type="button"
					className="w-full sm:w-auto"
					disabled={selection.length === 0 || isPending}
					onClick={() => onAdd(selection, () => setSelection([]))}
				>
					<UserPlusIcon aria-hidden="true" />
					{t(($) => $.foremanDashboard.team.action.addSubordinate)}
				</Button>
			</div>
		</fieldset>
	);
}
