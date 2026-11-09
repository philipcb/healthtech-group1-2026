import { DangerLevelDots } from "@/components/danger-level-dots.tsx";
import { Card, CardContent, CardLabelHeader, CardLabelTitle } from "@/components/ui/card.tsx";
import { GaugeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LimitExplanation() {
	const { t } = useTranslation();

	return (
		<Card muted={true} variant="labeled">
			<CardLabelHeader>
				<GaugeIcon className="size-4 shrink-0 text-muted-foreground" />
				<CardLabelTitle>{t(($) => $.limitExplanation.title)}</CardLabelTitle>
			</CardLabelHeader>
			{/* Side-by-side below lg (matches this app's mobile threshold) so the two legend
			    rows share a row instead of each taking the full width; lg:flex-col restores
			    the original stacked layout used by every other page rendering this card. */}
			<CardContent className="flex-row flex-wrap lg:flex-col lg:flex-nowrap">
				<div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 lg:flex-none">
					<div className="flex size-5 scale-75 items-center justify-center rounded-full border border-danger-border bg-danger-subtle">
						<DangerLevelDots dangerLevel="danger" size="sm" />
					</div>
					<p className="font-medium text-sm">{t(($) => $.limitExplanation.limitValue.label)}</p>
					<p className="col-start-2 text-xs">{t(($) => $.limitExplanation.limitValue.description)}</p>
				</div>
				<div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 lg:flex-none">
					<div className="flex size-5 scale-75 items-center justify-center rounded-full border border-warning-border bg-warning-subtle">
						<DangerLevelDots dangerLevel="warning" size="sm" />
					</div>
					<p className="font-medium text-sm">{t(($) => $.limitExplanation.actionValue.label)}</p>
					<p className="col-start-2 text-xs">{t(($) => $.limitExplanation.actionValue.description)}</p>
				</div>
			</CardContent>
		</Card>
	);
}
