import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card.tsx";
import { UserStatusPieChart } from "@/components/users-status-pie-chart.tsx";
import {
	DANGER_LEVEL_SEVERITY,
	type DangerLevel,
	DangerLevelSchema,
	dangerlevelStyles,
	mapDangerLevelToColor,
} from "@/lib/danger-levels.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { cn } from "@/lib/utils.ts";
import { ArrowRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

export type PieChartCardProps = {
	className?: string;
	to: string;
	label: string;
	data: Record<DangerLevel, number>;
	exposureType: Exposure;
	/** Users without data for this exposure in the period. Not part of the pie chart */
	inactive: number;
	onInactiveClick: () => void;
};

export const PieChartCard = ({
	className,
	to,
	label,
	data,
	exposureType,
	inactive,
	onInactiveClick,
}: PieChartCardProps) => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const hasData = DangerLevelSchema.options.some((level) => data[level] && data[level] > 0);

	if (!hasData) {
		return (
			<Card className={cn("h-full gap-4", className)}>
				<CardHeader className="text-sm">
					<h3 className="flex items-center gap-3 text-sm uppercase tracking-wide">
						<ExposureIcon type={exposureType} size="sm" />
						{label}
					</h3>
				</CardHeader>
				<CardContent className="h-full">
					<p className="text-muted-foreground">{t(($) => $.foremanDashboard.overview.pieChart.noData)}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card hoverable={true} className={cn("relative h-full gap-3 px-3 pt-3", className)}>
			<CardHeader className="text-sm">
				<h3 className="flex items-center gap-3 text-sm uppercase tracking-wide">
					<ExposureIcon type={exposureType} size="sm" />
					{/* Stretched over the whole card, so the inactive button doesn't have to be inside a link */}
					<Link
						to={to}
						className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
					>
						{label}
					</Link>
				</h3>
			</CardHeader>
			<CardContent className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] grid-rows-[1fr_auto] gap-x-3 gap-y-2">
				<div className="row-span-2 flex flex-col justify-center gap-2 text-xs">
					{DangerLevelSchema.options
						.toSorted((a, b) => DANGER_LEVEL_SEVERITY[b] - DANGER_LEVEL_SEVERITY[a])
						.map((level) => (
							<div key={level}>
								<div className={`${dangerlevelStyles[level].border} border-l-4 pl-1.5`}>
									<p className="pb-1 text-neutral-500 text-xs dark:text-zinc-400">
										{t(($) => $.foremanDashboard.overview.statCards[level].label)}
									</p>
									<p
										className={`text-2xl tabular-nums leading-6 text-${mapDangerLevelToColor(level)}`}
									>
										{data[level]}
									</p>
								</div>
							</div>
						))}
					<button
						type="button"
						className="relative z-10 cursor-pointer rounded-sm text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						onClick={onInactiveClick}
					>
						<div className="border-muted-foreground border-l-4 pl-1.5">
							<p className="pb-1 text-neutral-500 text-xs dark:text-zinc-400">
								{t(($) => $.foremanDashboard.overview.statCards.inactive.label)}
							</p>
							<p className="text-2xl text-muted-foreground tabular-nums leading-6">{inactive}</p>
						</div>
					</button>
				</div>
				{/* Above the stretched link so the chart's tooltips still show. The link is the keyboard route */}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: the card's link already does this for the keyboard */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: the card's link already does this for the keyboard */}
				<div className="relative z-10 min-h-0" onClick={() => navigate(to)}>
					<UserStatusPieChart data={data} hoverable={true} />
				</div>
				<CardFooter className="justify-end gap-1 self-end pr-1 text-muted-foreground text-xs">
					<p>{t(($) => $.interactiveCard.viewDetails)}</p>
					<ArrowRightIcon className="size-4 transition-transform group-hover/card:translate-x-0.5" />
				</CardFooter>
			</CardContent>
		</Card>
	);
};
