import { getPeriodLabel, type PeriodSelection } from "@/features/aggregated-exposure/model/period.ts";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PeriodNotice({
	periodSelection,
}: {
	periodSelection: Pick<PeriodSelection, "period" | "day" | "month" | "year">;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-2 text-muted-foreground text-sm">
			<CalendarDays aria-hidden="true" className="size-4" />
			<span>{getPeriodLabel(periodSelection, t)}</span>
		</div>
	);
}
