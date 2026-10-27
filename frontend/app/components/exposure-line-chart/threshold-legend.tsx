import type { DangerLevel } from "@/lib/danger-levels.ts";
import { getThresholdStrokeDasharray } from "@/lib/thresholds.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";

export type ThresholdLegendItem = {
	dangerLevel: DangerLevel;
	color: string;
};

export function ThresholdLegend({ items, className }: { items: Array<ThresholdLegendItem>; className?: string }) {
	const { t } = useTranslation();

	return (
		<div className={cn("mt-4 flex items-center gap-6 text-muted-foreground text-xs", className)}>
			{items.map((item) => {
				const strokeDasharray = getThresholdStrokeDasharray(item.dangerLevel);

				const dangerLevelLabel = t(($) => $.lineChart[item.dangerLevel]);

				return (
					<div key={item.dangerLevel} className="flex items-center gap-2">
						<ThresholdLegendLine
							label={dangerLevelLabel}
							color={item.color}
							strokeDasharray={strokeDasharray}
						/>
						<span>{dangerLevelLabel}</span>
					</div>
				);
			})}
		</div>
	);
}

/** A sample of a threshold line, drawn in its color and dash pattern. Without `strokeDasharray`, the line is solid. */
export function ThresholdLegendLine({
	label,
	color,
	strokeDasharray,
}: {
	label: string;
	color: string;
	strokeDasharray?: string;
}) {
	return (
		<svg width="24" height="8" className="shrink-0" aria-label={label}>
			<title>{label}</title>
			<line x1="0" y1="4" x2="24" y2="4" stroke={color} strokeWidth="2" strokeDasharray={strokeDasharray} />
		</svg>
	);
}
