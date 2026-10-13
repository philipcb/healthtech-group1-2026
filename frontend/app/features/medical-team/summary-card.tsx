import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card } from "@/components/ui/card.tsx";
import { formatGroupValue, thresholdByExposure } from "@/features/medical-team/medical-team-groups.ts";
import type { GroupSummary, GroupSummaryResponse } from "@/features/medical-team/queries/medical-team-contracts.ts";
import { ThresholdBar } from "@/features/medical-team/threshold-bar.tsx";
import { getDangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { href, Link, useLocation } from "react-router";

/** A group's or a whole hall's averages for the shown exposures, each linking to its details */
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
	/** Read by screen readers in every row's link */
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

/** The whole row, value and bar included, is one link to the details for this exposure */
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

	const value =
		average === null ? t(($) => $.medicalTeamDashboard.overview.noValue) : formatGroupValue(average, unit, t);
	const threshold = thresholdByExposure[exposure];
	const level = average === null ? null : getDangerLevel(average, threshold.warning, threshold.danger);
	// The level is also written out, so it isn't only shown by the bar's colors
	const levelLabel = level === "warning" || level === "danger" ? t(($) => $.lineChart[level]) : null;

	// Keeps every other selection, so the details show the same period and going back restores the overview
	const searchParams = new URLSearchParams(search);
	searchParams.set("exposure", exposure);

	return (
		<Link
			to={{
				pathname: href("/medical-team/groups/:groupId", { groupId }),
				search: `?${searchParams}`,
			}}
			aria-label={t(($) => $.medicalTeamDashboard.overview.openDetails, {
				exposure: t(($) => $.exposures[exposure]),
				group: name,
				value: levelLabel ? `${value}, ${levelLabel.toLowerCase()}` : value,
			})}
			className="flex flex-col gap-1.5 rounded-md p-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			{/* On narrow cards the value wraps below the exposure, so the row never gets wider than the card */}
			<span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
				<span className="flex min-w-0 grow items-center gap-2">
					<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
					<span className="font-medium">{t(($) => $.exposures[exposure])}</span>
					{/* Without a width of its own, it only fills the space left over and never makes the value wrap */}
					<span className="w-0 grow truncate text-muted-foreground text-xs">
						{t(($) => $.medicalTeamDashboard.metricsShort[exposure])}
					</span>
				</span>
				<span className="ml-auto flex shrink-0 items-center gap-1 tabular-nums">
					{levelLabel && <span className="mr-1 text-muted-foreground text-xs">{levelLabel}</span>}
					{value}
					<ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
				</span>
			</span>
			<ThresholdBar value={average} threshold={threshold} />
		</Link>
	);
}
