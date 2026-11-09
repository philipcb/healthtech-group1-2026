import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { Gift, type LucideIcon, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

function SummaryTile({
	icon: Icon,
	color,
	value,
	label,
}: {
	icon: LucideIcon;
	color: string;
	value: number;
	label: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-lg border p-3">
			<span
				className="flex size-9 shrink-0 items-center justify-center rounded-full"
				style={{ backgroundColor: tint(color), color }}
			>
				<Icon className="size-4" aria-hidden={true} />
			</span>
			<div className="min-w-0">
				<p className="font-bold text-xl tabular-nums">{value}</p>
				<p className="text-muted-foreground text-xs">{label}</p>
			</div>
		</div>
	);
}

/** Lifetime points decide the level and never go down; the balance is what can be spent */
export function PointsSummary() {
	const { t } = useTranslation();
	const { lifetimePoints, balance } = useSafetyJourney();

	return (
		<div className="grid grid-cols-2 gap-3">
			<SummaryTile
				icon={Star}
				color={COLORS.gold}
				value={lifetimePoints}
				label={t(($) => $.safetyJourney.overview.lifetime)}
			/>
			<SummaryTile
				icon={Gift}
				color={COLORS.indigo}
				value={balance}
				label={t(($) => $.safetyJourney.overview.balance)}
			/>
		</div>
	);
}
