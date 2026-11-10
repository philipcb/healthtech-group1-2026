import {
	AboutFiguresDialog,
	AboutFiguresText,
	ExposureCalculations,
	ThresholdComparison,
	TimeOverCalculation,
} from "@/features/aggregated-exposure/components/about-figures.tsx";
import { type DustField, exposures } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

/**
 * The aggregated pages' "Limits and calculation". Always covers every exposure type, whichever the page shows, so the
 * limits can be looked up in one place.
 */
export function FiguresInfoDialog({ dustField }: { dustField: DustField }) {
	const { t } = useTranslation();

	return (
		<AboutFiguresDialog
			comparedWith={<ThresholdComparison exposures={exposures} dustField={dustField} />}
			calculation={
				<>
					<AboutFiguresText>{t(($) => $.aboutFigures.calculation.periodAverage)}</AboutFiguresText>
					<ExposureCalculations exposures={exposures} dustField={dustField} />
					<TimeOverCalculation />
				</>
			}
		/>
	);
}
