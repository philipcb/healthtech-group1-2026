import { SelectFilter } from "@/features/aggregated-exposure/components/select-filter.tsx";
import type { YardFilterProps } from "@/features/aggregated-exposure/model/scope.ts";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Only filters what's shown. The backend decides which yards the user has access to. */
export function YardFilter({ yards, value, onValueChange, allowsAll = true, inline, hidesLabel }: YardFilterProps) {
	const { t } = useTranslation();

	return (
		<SelectFilter
			label={t(($) => $.aggregatedExposure.filters.yard)}
			icon={MapPin}
			options={yards}
			value={value}
			onValueChange={onValueChange}
			allLabel={allowsAll ? t(($) => $.aggregatedExposure.filters.allYards) : undefined}
			inline={inline}
			hidesLabel={hidesLabel}
		/>
	);
}
