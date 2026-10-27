import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { OptionToggle } from "@/features/aggregated-exposure/components/option-toggle.tsx";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

export function ExposureToggle({
	label,
	hidesLabel = false,
	value,
	onValueChange,
}: {
	label: string;
	hidesLabel?: boolean;
	value: Exposure;
	onValueChange: (exposure: Exposure) => void;
}) {
	const { t } = useTranslation();

	return (
		<OptionToggle
			label={label}
			hidesLabel={hidesLabel}
			value={value}
			onValueChange={onValueChange}
			fillsWidth={false}
			options={exposures.map((exposure) => ({
				value: exposure,
				label: t(($) => $.exposures[exposure]),
				icon: <ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />,
			}))}
		/>
	);
}
