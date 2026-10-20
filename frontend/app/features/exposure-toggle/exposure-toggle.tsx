import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import type { Exposure } from "@/lib/exposures.ts";
import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type ExposureToggleProps = {
	value: Exposure | null;
	onValueChange: (value: Exposure | null) => void;
};

/** Picks a single exposure to filter by, with a button to clear the filter */
export function ExposureToggle({ value, onValueChange }: ExposureToggleProps) {
	const { t } = useTranslation();

	return (
		<div className="flex gap-1">
			<ToggleGroup
				type="single"
				value={value ?? "all"}
				variant="outline"
				onValueChange={(newValue: Exposure | "") => {
					onValueChange(newValue || null);
				}}
			>
				<ToggleGroupItem
					value="dust"
					aria-label={t(($) => $.exposures.dust)}
					className="rounded-l-xl! px-2 lg:px-3"
				>
					<ExposureIcon type="dust" iconOnly={true} iconClassName="size-4" />
					<p className="min-w-0 text-xs lg:text-sm">{t(($) => $.exposures.dust)}</p>
				</ToggleGroupItem>
				<ToggleGroupItem value="noise" aria-label={t(($) => $.exposures.noise)} className="px-2 lg:px-3">
					<ExposureIcon type="noise" iconOnly={true} iconClassName="size-4" />
					<p className="min-w-0 text-xs lg:text-sm">{t(($) => $.exposures.noise)}</p>
				</ToggleGroupItem>
				<ToggleGroupItem
					value="vibration"
					aria-label={t(($) => $.exposures.vibration)}
					className="rounded-r-md! px-2 lg:px-3"
				>
					<ExposureIcon type="vibration" iconOnly={true} iconClassName="size-4" />
					<p className="min-w-0 text-xs lg:text-sm">{t(($) => $.exposures.vibration)}</p>
				</ToggleGroupItem>
			</ToggleGroup>

			<Button
				type="button"
				aria-label={t(($) => $.foremanDashboard.overview.clearExposureFilter)}
				variant="outline"
				size="icon"
				onClick={() => onValueChange(null)}
				disabled={value === null}
				className="shrink-0 rounded-r-xl"
			>
				<XIcon className="size-4" aria-hidden="true" />
			</Button>
		</div>
	);
}
