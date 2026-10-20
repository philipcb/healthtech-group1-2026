import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { AttentionCard } from "@/features/attention-card/attention-card.tsx";
import { ExposureSummaryGrid } from "@/features/attention-card/exposure-summary-grid.tsx";
import { DateAndViewPicker } from "@/features/date-picker/date-and-view-picker.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { ExposureToggle } from "@/features/exposure-toggle/exposure-toggle.tsx";
import { useOccupationalHygienistAreaData } from "@/features/occupational-hygienist/use-occupational-hygienist-area-data.ts";
import { LimitExplanation } from "@/features/sidebar/limit-explanation.tsx";
import { TeamSummary } from "@/features/sidebar/team-summary.tsx";
import { today } from "@/lib/date.ts";
import { exposures, parseAsExposure } from "@/lib/exposures.ts";
import { subDays } from "date-fns";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

/**
 * Like the foreman's overview, but without individual operators. Occupational hygienists work with the exposure of an
 * area as a whole, so they're only shown how many operators are within each danger level.
 */
export default function OccupationalHygienistOverview() {
	const { t } = useTranslation();

	const [exposure, setExposure] = useQueryState("exposure", parseAsExposure.withOptions({ history: "push" }));
	const {
		selection: { start: startDate, end: endDate },
	} = useDate();

	// TODO: Occupational hygienists should be able to see a longer period, but are limited like foremen for now
	const minSelectableDate = subDays(today(), 7);
	const maxSelectableDate = today();

	const timeRange = { startTime: startDate.toISOString(), endTime: endDate.toISOString() };
	const { operators, isOperatorsLoading, operatorsError, thresholdSummary, isThresholdSummaryLoading } =
		useOccupationalHygienistAreaData(timeRange);

	const operatorCount = operators?.length ?? 0;
	const areaSummary = (
		<TeamSummary
			subordinateCount={operatorCount}
			title={t(($) => $.occupationalHygienistDashboard.area.title)}
			membersCountLabel={t(($) => $.occupationalHygienistDashboard.area.operatorCount, { count: operatorCount })}
		/>
	);

	const title = exposure
		? t(($) => $.occupationalHygienistDashboard.title.exposure, {
				exposure: t(($) => $.exposures[exposure]).toLowerCase(),
			})
		: t(($) => $.occupationalHygienistDashboard.title.all);

	return (
		<div className="flex flex-col gap-8">
			<header className="flex w-full min-w-0 flex-col gap-4">
				<div className="flex min-w-0 items-center gap-2 md:gap-3">
					<ExposureIcon type={exposure ?? "all"} size="lg" className="mt-0.5 shrink-0 md:mt-1" />
					<h1 className="min-w-0 max-w-prose text-balance font-medium text-lg leading-tight md:text-2xl lg:text-3xl">
						{title}
					</h1>
				</div>

				<ExposureToggle value={exposure} onValueChange={setExposure} />
			</header>

			<div className="flex w-full flex-col gap-6 lg:flex-row">
				<aside className="contents lg:flex lg:w-1/5 lg:flex-col lg:gap-6">
					<div className="order-1 hidden lg:block">{areaSummary}</div>
					<div className="order-2">
						<LimitExplanation />
					</div>
				</aside>

				<div className="contents lg:grid lg:w-full lg:grid-cols-[minmax(0,3fr)_calc(var(--spacing)*73)] lg:gap-6">
					<div className="order-3 flex flex-col gap-8 p-4 sm:p-6 lg:order-none lg:gap-12 lg:p-0">
						{operatorsError ? (
							<div className="p-4 text-destructive">
								{t(($) => $.occupationalHygienistDashboard.area.failedToLoad)}
							</div>
						) : (
							<>
								<AttentionCard
									subordinates={operators ?? []}
									isSubordinatesLoading={isOperatorsLoading}
									thresholdSummary={thresholdSummary}
									isThresholdSummaryLoading={isThresholdSummaryLoading}
									showIndividuals={false}
								/>

								<ExposureSummaryGrid
									thresholdSummary={thresholdSummary}
									shownExposures={exposure ? [exposure] : exposures}
								/>

								<div className="lg:hidden">{areaSummary}</div>
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
