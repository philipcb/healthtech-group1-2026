import { SelectFilter } from "@/features/aggregated-exposure/components/select-filter.tsx";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

export function HallFilter({
	halls,
	value,
	onValueChange,
}: {
	halls: Array<string>;
	value: string | null;
	onValueChange: (hall: string | null) => void;
}) {
	const { t } = useTranslation();

	return (
		<SelectFilter
			label={t(($) => $.aggregatedExposure.filters.hall)}
			icon={Factory}
			options={halls}
			value={value}
			onValueChange={onValueChange}
			allLabel={t(($) => $.aggregatedExposure.filters.allHalls)}
		/>
	);
}
