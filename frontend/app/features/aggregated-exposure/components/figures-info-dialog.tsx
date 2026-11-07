import {
	AboutFiguresDialog,
	AboutFiguresText,
	ExposureCalculations,
	MissingStates,
	ThresholdComparison,
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
			source={
				<>
					<AboutFiguresText>
						{t(($) => $.aboutFigures.source.groups, {
							perOccupation: t(($) => $.aggregatedExposure.perOccupation),
						})}
					</AboutFiguresText>
					<AboutFiguresText>{t(($) => $.aboutFigures.source.hourly)}</AboutFiguresText>
				</>
			}
			calculation={
				<>
					<AboutFiguresText>{t(($) => $.aboutFigures.calculation.periodAverage)}</AboutFiguresText>
					<ExposureCalculations exposures={exposures} dustField={dustField} />
					<AboutFiguresText>{t(($) => $.aboutFigures.calculation.timeOver)}</AboutFiguresText>
					<AboutFiguresText>{t(($) => $.aboutFigures.calculation.timeOverVibration)}</AboutFiguresText>
				</>
			}
			comparedWith={<ThresholdComparison exposures={exposures} dustField={dustField} />}
			missing={<MissingStates states={["noData", "suppressed"]} />}
		/>
	);
}
