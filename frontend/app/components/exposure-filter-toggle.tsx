import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { OptionToggle } from "@/components/option-toggle.tsx";
import { type ExposureFilter, exposures } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

export function ExposureFilterToggle({
	value,
	onValueChange,
	labelledBy,
	hidesLabel = false,
	compact = false,
}: {
	value: ExposureFilter;
	onValueChange: (filter: ExposureFilter) => void;
	labelledBy?: string;
	hidesLabel?: boolean;
	compact?: boolean;
}) {
	const { t } = useTranslation();

	return (
		<OptionToggle<ExposureFilter>
			label={t(($) => $.exposures.filter.label)}
			labelledBy={labelledBy}
			hidesLabel={hidesLabel}
			compact={compact}
			value={value}
			onValueChange={onValueChange}
			options={[
				{ value: "all", label: t(($) => $.exposures.filter.all) },
				...exposures.map((exposure) => ({
					value: exposure,
					label: t(($) => $.exposures[exposure]),
					icon: <ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />,
				})),
			]}
		/>
	);
}
