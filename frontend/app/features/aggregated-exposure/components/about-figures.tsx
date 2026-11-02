import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { InfoDialog, InfoSection } from "@/features/aggregated-exposure/components/info-dialog.tsx";
import {
	getGroupThreshold,
	getGroupUnitLabel,
	getThresholdNumberFormat,
	MIN_GROUP_SIZE,
} from "@/features/aggregated-exposure/model/groups.ts";
import { type DustField, defaultDustField, type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The "About the figures" dialog every aggregated page shares. It writes the four headings itself, always in the same
 * order, so a page only decides what goes under them. A section that doesn't apply to the page is left out with `null`.
 * The texts are facts about how the figures are calculated rather than about a page, so the pages can share them.
 */
export function AboutFiguresDialog({
	source,
	calculation,
	comparedWith,
	missing,
}: {
	source: ReactNode;
	calculation: ReactNode;
	comparedWith: ReactNode;
	missing: ReactNode;
}) {
	const { t } = useTranslation();
	const sections = [
		{ title: t(($) => $.aboutFigures.headings.source), content: source },
		{ title: t(($) => $.aboutFigures.headings.calculation), content: calculation },
		{ title: t(($) => $.aboutFigures.headings.comparedWith), content: comparedWith },
		{ title: t(($) => $.aboutFigures.headings.missing), content: missing },
	];

	return (
		<InfoDialog
			triggerLabel={t(($) => $.aboutFigures.trigger)}
			title={t(($) => $.aboutFigures.title)}
			description={t(($) => $.aboutFigures.description)}
		>
			{sections.map(
				({ title, content }) =>
					content !== null && (
						<InfoSection key={title} title={title} className="min-w-0 gap-2">
							{content}
						</InfoSection>
					),
			)}
		</InfoDialog>
	);
}

export function AboutFiguresText({ children }: { children: ReactNode }) {
	return <p className="text-muted-foreground">{children}</p>;
}

/** What each exposure's value is, in the order the page shows the exposures */
export function ExposureCalculations({
	exposures,
	dustField = defaultDustField,
}: {
	exposures: ReadonlyArray<Exposure>;
	dustField?: DustField;
}) {
	const { t } = useTranslation();

	return (
		<dl className="flex flex-col gap-2">
			{exposures.map((exposure) => (
				<div key={exposure}>
					<dt className="flex items-center gap-2 font-medium">
						<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
						{t(($) => $.exposures[exposure])}
					</dt>
					<dd className="text-muted-foreground">
						{t(($) => $.aboutFigures.calculation.exposure[exposure], {
							unit: getGroupUnitLabel(exposureUnitByExposure[exposure], t),
							dustField: t(($) => $.exposures.dustFields[dustField]),
						})}
					</dd>
				</div>
			))}
		</dl>
	);
}

/** The action and limit values the bars and colors compare each exposure's value to */
export function ThresholdComparison({
	exposures,
	dustField = defaultDustField,
}: {
	exposures: ReadonlyArray<Exposure>;
	dustField?: DustField;
}) {
	const { t, i18n } = useTranslation();
	const numberFormat = getThresholdNumberFormat(i18n.language);
	const formatThreshold = (value: number, exposure: Exposure) =>
		`${numberFormat.format(value)} ${getGroupUnitLabel(exposureUnitByExposure[exposure], t)}`;

	return (
		<>
			<dl className="flex flex-col gap-2">
				<div>
					<dt className="font-medium">{t(($) => $.limitExplanation.actionValue.label)}</dt>
					<dd className="text-muted-foreground">{t(($) => $.limitExplanation.actionValue.description)}</dd>
				</div>
				<div>
					<dt className="font-medium">{t(($) => $.limitExplanation.limitValue.label)}</dt>
					<dd className="text-muted-foreground">{t(($) => $.limitExplanation.limitValue.description)}</dd>
				</div>
			</dl>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t(($) => $.aggregatedExposure.exposureLabel)}</TableHead>
						<TableHead className="text-right">{t(($) => $.limitExplanation.actionValue.label)}</TableHead>
						<TableHead className="text-right">{t(($) => $.limitExplanation.limitValue.label)}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{exposures.map((exposure) => {
						const { warning, danger } = getGroupThreshold(exposure, dustField);

						return (
							<TableRow key={exposure}>
								<TableCell>
									<span className="flex items-center gap-2">
										<ExposureIcon type={exposure} size="xs" />
										<span className="flex flex-col">
											{t(($) => $.exposures[exposure])}
											{/* See `thresholdByExposure`: the dust thresholds have no documented source */}
											{exposure === "dust" && (
												<span className="text-muted-foreground text-xs">
													{t(($) => $.aboutFigures.comparedWith.unconfirmed)}
												</span>
											)}
										</span>
									</span>
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{formatThreshold(warning, exposure)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{formatThreshold(danger, exposure)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</>
	);
}

type MissingState = "suppressed";

/** What it means when a group or a value isn't shown */
export function MissingStates({ states }: { states: ReadonlyArray<MissingState> }) {
	const { t } = useTranslation();

	return states.map((state) => (
		<AboutFiguresText key={state}>
			{t(($) => $.aboutFigures.missing[state], { count: MIN_GROUP_SIZE })}
		</AboutFiguresText>
	));
}
