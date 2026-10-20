import { MIN_GROUP_SIZE } from "@/features/aggregated-exposure/model/groups.ts";
import { getPeriodLabel, type PeriodSelection } from "@/features/aggregated-exposure/model/period.ts";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PeriodAndPrivacyNotice({
	periodSelection,
}: {
	periodSelection: Pick<PeriodSelection, "period" | "month" | "year">;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<CalendarDays aria-hidden="true" className="size-4" />
				<span>{getPeriodLabel(periodSelection, t)}</span>
			</div>
			<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
				<ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
				{t(($) => $.aggregatedExposure.privacyNotice, { count: MIN_GROUP_SIZE })}
			</p>
		</div>
	);
}
