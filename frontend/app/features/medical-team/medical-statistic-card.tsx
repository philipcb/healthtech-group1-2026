import { Card } from "@/components/ui/card.tsx";

/**
 * One figure for a group, styled like the operator's and foreman's statistic cards, but without their share of the limit
 * value or danger level colors, since a group's figures can't be compared directly with individual thresholds. A
 * compact row on phones, where the value wraps below the label if it doesn't fit, and a card with a large value from
 * `md` up.
 */
export function MedicalStatisticCard({ label, value, caption }: { label: string; value: string; caption: string }) {
	return (
		<Card className="gap-1 px-3 py-2 md:min-h-26.25 md:p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-x-2 md:flex-col md:items-start md:gap-1">
				<p className="text-muted-foreground text-xs uppercase tracking-widest">{label}</p>
				<p className="ml-auto font-medium text-sm tabular-nums md:ml-0 md:font-semibold md:text-2xl">{value}</p>
			</div>
			<p className="text-muted-foreground text-xs">{caption}</p>
		</Card>
	);
}
