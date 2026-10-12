import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { type Exposure, exposures, isExposure } from "@/lib/exposures.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** Picks one exposure at a time */
export function MedicalExposureToggle({
	label,
	value,
	onValueChange,
}: {
	/** Visible label, naming what the exposure is picked for */
	label: string;
	value: Exposure;
	onValueChange: (exposure: Exposure) => void;
}) {
	const { t } = useTranslation();
	const labelId = useId();

	return (
		<div className="flex flex-col gap-1.5">
			<p id={labelId} className="font-medium text-sm">
				{label}
			</p>
			<ToggleGroup
				aria-labelledby={labelId}
				type="single"
				value={value}
				variant="outline"
				onValueChange={(selected: string) => {
					if (isExposure(selected)) onValueChange(selected);
				}}
			>
				{exposures.map((exposure) => (
					<ToggleGroupItem key={exposure} value={exposure} className="px-2 lg:px-3">
						<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
						<span className="text-xs lg:text-sm">{t(($) => $.exposures[exposure])}</span>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
