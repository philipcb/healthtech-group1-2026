import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { OptionToggle } from "@/features/aggregated-exposure/components/option-toggle.tsx";
import type { ExposureFilter } from "@/features/aggregated-exposure/model/groups.ts";
import { exposures } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

export function ExposureFilterToggle({
	value,
	onValueChange,
}: {
	value: ExposureFilter;
	onValueChange: (filter: ExposureFilter) => void;
}) {
	const { t } = useTranslation();

	return (
		<OptionToggle<ExposureFilter>
			label={t(($) => $.aggregatedExposure.overview.exposureFilter.label)}
			value={value}
			onValueChange={onValueChange}
			options={[
				{ value: "all", label: t(($) => $.aggregatedExposure.overview.exposureFilter.all) },
				...exposures.map((exposure) => ({
					value: exposure,
					label: t(($) => $.exposures[exposure]),
					icon: <ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />,
				})),
			]}
		/>
	);
}
