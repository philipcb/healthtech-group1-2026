import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { countAnswers } from "@/features/safety-journey/model/recovery-options.ts";
import type { ActionCount } from "@/features/safety-journey/model/types.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { cn } from "@/lib/utils.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/** What operators answered to "what helped?" this week, as counts per preset option */
export function WhatHelpedChart({ answers, className }: { answers: ReadonlyArray<ActionCount>; className?: string }) {
	const { t } = useTranslation();
	const [exposure, setExposure] = useState<Exposure | "all">("all");
	const rows = countAnswers(answers, exposure);
	const total = rows.reduce((sum, row) => sum + row.count, 0);
	const max = Math.max(1, ...rows.map((row) => row.count));

	return (
		<section className={cn("flex flex-col gap-4 rounded-lg border bg-card p-5", className)}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-semibold">{t(($) => $.safetyJourney.team.whatHelped)}</h2>
					<p className="text-muted-foreground text-sm">
						{t(($) => $.safetyJourney.team.fromAnswers, { count: total })}
					</p>
				</div>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					value={exposure}
					onValueChange={(value: Exposure | "all" | "") => setExposure(value || "all")}
					aria-label={t(($) => $.safetyJourney.team.exposureFilter)}
				>
					<ToggleGroupItem value="all" className="cursor-pointer px-3">
						{t(($) => $.safetyJourney.team.all)}
					</ToggleGroupItem>
					{exposures.map((e) => (
						<ToggleGroupItem key={e} value={e} className="cursor-pointer gap-1.5 px-3">
							<ExposureIcon type={e} iconOnly={true} iconClassName="size-4" />
							{t(($) => $.exposures[e])}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>

			<ul className="flex flex-col gap-3.5 text-sm">
				{rows.map((row) => (
					<li key={row.option} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3">
						<span>{t(($) => $.safetyJourney.prompt.options[row.option])}</span>
						<div className="h-3.5 overflow-hidden rounded bg-muted">
							<div
								className="h-full rounded"
								style={{ width: `${(row.count / max) * 100}%`, backgroundColor: COLORS.indigo }}
							/>
						</div>
						<span className="text-right font-semibold tabular-nums">{row.count}</span>
					</li>
				))}
			</ul>

			{exposure === "all" && (
				<p className="mt-auto rounded-md bg-muted px-3 py-2.5 text-sm">{t(($) => $.safetyJourney.team.tip)}</p>
			)}
		</section>
	);
}
