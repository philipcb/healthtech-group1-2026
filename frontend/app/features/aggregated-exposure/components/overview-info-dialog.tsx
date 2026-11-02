import {
	AboutFiguresDialog,
	AboutFiguresText,
	ExposureCalculations,
	MissingStates,
	ThresholdComparison,
} from "@/features/aggregated-exposure/components/about-figures.tsx";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

/** The overview's "About the figures", for the exposures the filter shows */
export function OverviewInfoDialog({
	exposures,
	dustField,
}: {
	exposures: ReadonlyArray<Exposure>;
	dustField: DustField;
}) {
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
				</>
			}
			comparedWith={<ThresholdComparison exposures={exposures} dustField={dustField} />}
			missing={<MissingStates states={["suppressed"]} />}
		/>
	);
}
