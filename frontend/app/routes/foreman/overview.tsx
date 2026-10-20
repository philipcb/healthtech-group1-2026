import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { NotesCard } from "@/components/notes-card.tsx";
import { OperatorExposureStatusTable } from "@/components/operator-exposure-status-table.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { UserStatusChart } from "@/components/users-status-chart.tsx";
import { AttentionCard } from "@/features/attention-card/attention-card.tsx";
import { ExposureSummaryGrid } from "@/features/attention-card/exposure-summary-grid.tsx";
import { DateAndViewPicker } from "@/features/date-picker/date-and-view-picker.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { ExposureToggle } from "@/features/exposure-toggle/exposure-toggle.tsx";
import { LimitExplanation } from "@/features/sidebar/limit-explanation.tsx";
import { TeamSummary } from "@/features/sidebar/team-summary.tsx";
import type { User } from "@/features/user/user.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { UserSelect } from "@/features/user/user-select.tsx";
import { UserDetails } from "@/features/user-details/user-details.tsx";
import { useView } from "@/features/views/use-view.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import { useGetSubordinates, useGetThresholdSummary } from "@/lib/api/generated/user.ts";
import { today } from "@/lib/date.ts";
import { type Exposure, parseAsExposure } from "@/lib/exposures.ts";
import { withMissingCountsAsZero } from "@/lib/threshold-summary.ts";
import { subDays } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export default function ForemanOverview() {
	const { t } = useTranslation();
	const { user } = useUser();

	const [exposure, setExposure] = useQueryState("exposure", parseAsExposure.withOptions({ history: "push" }));
	const {
		selection: { start: startDate, end: endDate },
	} = useDate();
	const [selectedUserId, setSelectedUserId] = useQueryState("userId", parseAsString.withOptions({ history: "push" }));

	const { view } = useView();
	const isWeekly = view === "week";

	// Foremen can only see dates within the last week
	const minSelectableDate = subDays(today(), 7);
	const maxSelectableDate = today();

	const { data: users } = useGetSubordinates(user.id);
	const timeRange = { startTime: startDate.toISOString(), endTime: endDate.toISOString() };
	const {
		data: subordinates,
		isLoading: isSubordinatesLoading,
		error: subordinatesError,
	} = useGetSubordinates(user.id, timeRange);
	const { data: thresholdSummary, isLoading: isThresholdSummaryLoading } = useGetThresholdSummary(
		user.id,
		timeRange,
		{ query: { select: withMissingCountsAsZero } },
	);

	const selectedUser = users?.find((subordinate) => subordinate.id === selectedUserId);
	const subordinateCount = subordinates?.length ?? 0;
	const isUserSelected = selectedUser !== undefined;

	const title = resolveForemanOverviewTitle(t, exposure, selectedUser);

	return (
		<div className="flex flex-col gap-8">
			<header className="flex w-full min-w-0 flex-col gap-4">
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-2 md:gap-3">
						<ExposureIcon type={exposure ?? "all"} size="lg" className="mt-0.5 shrink-0 md:mt-1" />
						<h1 className="min-w-0 max-w-prose text-balance font-medium text-lg leading-tight md:text-2xl lg:text-3xl">
							{title}
						</h1>
					</div>
				</div>

				<div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:gap-6">
					<div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-[auto_1fr]">
						<ExposureToggle value={exposure} onValueChange={setExposure} />

						{users === undefined || isSubordinatesLoading ? (
							<Skeleton className="h-9 w-73 justify-self-end" />
						) : (
							<div className="w-full min-w-0 md:w-73 md:justify-self-end">
								<UserSelect
									users={users}
									value={selectedUserId}
									onValueChange={setSelectedUserId}
									placeholder={t(($) => $.foremanDashboard.overview.selectUserPlaceholder)}
								/>
							</div>
						)}
					</div>
				</div>
			</header>

			<div className="flex w-full flex-col gap-6 lg:flex-row">
				<aside className="contents lg:flex lg:w-1/5 lg:flex-col lg:gap-6">
					<div className="order-1 hidden lg:block">
						<TeamSummary subordinateCount={subordinateCount} />
					</div>
					<div className="order-2">
						<LimitExplanation />
					</div>
					<div className="order-4 lg:order-none">
						<NotesCard />
					</div>
				</aside>

				<div className="contents lg:grid lg:w-full lg:grid-cols-[minmax(0,3fr)_calc(var(--spacing)*73)] lg:gap-6">
					<div className="order-3 flex flex-col gap-8 p-4 sm:p-6 lg:order-none lg:gap-12 lg:p-0">
						{/* TODO: Redo the loading logic here */}
						{isUserSelected ? (
							<UserDetails selectedUser={selectedUser} exposure={exposure} />
						) : (
							<>
								<AttentionCard
									subordinates={subordinates ?? []}
									isSubordinatesLoading={isSubordinatesLoading}
									thresholdSummary={thresholdSummary}
									isThresholdSummaryLoading={isThresholdSummaryLoading}
								/>

								{exposure ? (
									<UserStatusChart
										users={subordinates ?? []}
										exposure={exposure}
										isWeekly={isWeekly}
										userOnClick={(id) => setSelectedUserId(id)}
									/>
								) : (
									<>
										<ExposureSummaryGrid thresholdSummary={thresholdSummary} />

										<div className="lg:hidden">
											<TeamSummary subordinateCount={subordinateCount} />
										</div>

										<div className="flex flex-col gap-4">
											<h2 className="font-medium text-lg">
												{t(($) => $.foremanDashboard.team.title)}
											</h2>
											{isSubordinatesLoading ? (
												<div className="p-4">{t(($) => $.common.loading)}</div>
											) : subordinatesError ? (
												<div className="p-4 text-destructive">
													{t(($) => $.foremanDashboard.team.failedToLoadMembers)}
												</div>
											) : !subordinates || subordinates.length === 0 ? (
												<div className="p-4">
													{t(($) => $.foremanDashboard.team.noMembersFound)}
												</div>
											) : (
												<OperatorExposureStatusTable data={subordinates} />
											)}
										</div>
									</>
								)}
							</>
						)}
					</div>

					{/* order-first: on mobile this sits directly under the header; on lg+ it returns to the
					    right-hand column. */}
					<aside className="order-first flex flex-col gap-4 lg:order-none">
						<DateAndViewPicker
							allowedViews={["day", "week"]}
							minDate={minSelectableDate}
							maxDate={maxSelectableDate}
							lockNavigation={true}
						/>
					</aside>
				</div>
			</div>
		</div>
	);
}

function resolveForemanOverviewTitle(t: TranslateFn, exposure: Exposure | null, selectedUser: User | undefined) {
	const exposureTitle = exposure
		? t(($) => $.exposures[exposure]).toLowerCase()
		: t(($) => $.operatorHeader.subtitle.allExposureTypes).toLowerCase();

	if (selectedUser) {
		if (exposure === null) {
			return t(($) => $.foremanDashboard.overview.title.allForUser, {
				exposure: exposureTitle,
				name: selectedUser.name,
			});
		}

		return t(($) => $.foremanDashboard.overview.title.exposureForUser, {
			exposure: exposureTitle,
			name: selectedUser.name,
		});
	}

	if (exposure === null) {
		return t(($) => $.foremanDashboard.overview.title.all, {
			exposure: exposureTitle,
		});
	}

	return t(($) => $.foremanDashboard.overview.title.exposure, {
		exposure: exposureTitle,
	});
}
