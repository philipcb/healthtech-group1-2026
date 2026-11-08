import { TeamStats } from "@/features/safety-journey/components/foreman/team-stats.tsx";
import { WhatHelpedChart } from "@/features/safety-journey/components/foreman/what-helped-chart.tsx";
import { BackButton } from "@/features/safety-journey/components/shared/back-button.tsx";
import { TeamBadgeCard } from "@/features/safety-journey/components/shared/team-badge-card.tsx";
import { teamMock } from "@/features/safety-journey/model/mock-data.ts";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href } from "react-router";

/** Foreman view: team totals for this week only, never individual points */
export function TeamJourneyPage() {
	const { t } = useTranslation();
	const team = teamMock;

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<div className="flex flex-col gap-2 border-b pb-3">
				<BackButton fallback={href("/foreman")} />
				<header>
					<h1 className="font-medium text-2xl">{t(($) => $.safetyJourney.team.title)}</h1>
					<p className="text-muted-foreground text-sm">
						{t(($) => $.safetyJourney.team.subtitle, { team: team.teamName, count: team.operatorCount })}
					</p>
				</header>
			</div>

			<TeamStats team={team} />

			<div className="grid gap-4 lg:grid-cols-5">
				<WhatHelpedChart answers={team.answers} className="lg:col-span-3" />
				<TeamBadgeCard cleanShifts={team.cleanShifts} size="large" className="bg-card lg:col-span-2" />
			</div>

			<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
				<Lock className="size-3.5" aria-hidden={true} />
				{t(($) => $.safetyJourney.team.privacy)}
			</p>
		</div>
	);
}
