import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { InfoDialog, InfoSection } from "@/features/aggregated-exposure/components/info-dialog.tsx";
import {
	getGroupThreshold,
	getGroupUnitLabel,
	getThresholdNumberFormat,
} from "@/features/aggregated-exposure/model/groups.ts";
import { type DustField, defaultDustField, type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The "Limits and calculation" dialog every aggregated page shares. It writes the two headings itself, in the order of
 * the button's label: the limits first, since they're what people open it for, then the calculation.
 */
export function AboutFiguresDialog({ comparedWith, calculation }: { comparedWith: ReactNode; calculation: ReactNode }) {
	const { t } = useTranslation();

	return (
		<InfoDialog
			triggerLabel={t(($) => $.aboutFigures.trigger)}
			title={t(($) => $.aboutFigures.title)}
			description={t(($) => $.aboutFigures.description)}
		>
			<InfoSection title={t(($) => $.aboutFigures.headings.comparedWith)} className="min-w-0 gap-2">
				{comparedWith}
			</InfoSection>
			<InfoSection title={t(($) => $.aboutFigures.headings.calculation)} className="min-w-0 gap-2">
				{calculation}
			</InfoSection>
		</InfoDialog>
	);
}

export function AboutFiguresText({ children }: { children: ReactNode }) {
	return <p className="text-pretty text-muted-foreground">{children}</p>;
}

/** What each exposure's value is, in the order the page shows the exposures */
export function ExposureCalculations({
	exposures,
	dustField = defaultDustField,
}: {
	exposures: ReadonlyArray<Exposure>;
	dustField?: DustField;
}) {
	const { t, i18n } = useTranslation();
	const numberFormat = getThresholdNumberFormat(i18n.language);
	const formatExample = (value: number, exposure: Exposure) =>
		`${numberFormat.format(value)} ${getGroupUnitLabel(exposureUnitByExposure[exposure], t)}`;

	return (
		<>
			<dl className="flex flex-col gap-2">
				{exposures.map((exposure) => (
					<div key={exposure}>
						<dt className="flex items-center gap-2 font-medium">
							<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
							{t(($) => $.exposures[exposure])}
						</dt>
						<dd className="text-pretty text-muted-foreground">
							{t(($) => $.aboutFigures.calculation.exposure[exposure], {
								unit: getGroupUnitLabel(exposureUnitByExposure[exposure], t),
								dustField: t(($) => $.exposures.dustFields[dustField]),
							})}
						</dd>
					</div>
				))}
			</dl>
			<ExampleTitle>{t(($) => $.aboutFigures.calculation.exposureExample.title)}</ExampleTitle>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t(($) => $.aboutFigures.calculation.exposureExample.exposure)}</TableHead>
						<TableHead className="text-right">
							{t(($) => $.aboutFigures.calculation.exampleWorkers.ola)}
						</TableHead>
						<TableHead className="text-right">
							{t(($) => $.aboutFigures.calculation.exampleWorkers.kari)}
						</TableHead>
						<TableHead className="text-right">
							{t(($) => $.aboutFigures.calculation.exposureExample.group)}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{exposures.map((exposure) => {
						const { ola, kari, group } = EXPOSURE_EXAMPLE[exposure];

						return (
							<TableRow key={exposure}>
								<TableCell>
									<span className="flex items-center gap-2">
										<ExposureIcon type={exposure} size="xs" />
										<span>
											{t(($) => $.exposures[exposure])}
											<span className="text-muted-foreground">
												{", "}
												{exposure === "vibration"
													? t(($) => $.aboutFigures.calculation.exposureExample.dayTotal)
													: t(($) => $.aboutFigures.calculation.exposureExample.atEight)}
											</span>
										</span>
									</span>
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{formatExample(ola, exposure)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{formatExample(kari, exposure)}
								</TableCell>
								<TableCell className="text-right font-medium tabular-nums">
									{formatExample(group, exposure)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</>
	);
}

// Made-up values for the example workers, an hour for noise and dust and a day's total for vibration. The group's figure
// is the average of the two.
const EXPOSURE_EXAMPLE: Record<Exposure, { ola: number; kari: number; group: number }> = {
	dust: { ola: 4, kari: 6, group: 5 },
	noise: { ola: 80, kari: 84, group: 82 },
	vibration: { ola: 120, kari: 80, group: 100 },
};

// Made-up hours for the example workers on one day
const TIME_OVER_EXAMPLE = [
	{ worker: "ola", measured: 8, over: 2 },
	{ worker: "kari", measured: 8, over: 0 },
] as const;

/** How the time above a threshold is calculated, with the example workers' day as a table */
export function TimeOverCalculation() {
	const { t, i18n } = useTranslation();
	const numberFormat = getThresholdNumberFormat(i18n.language);
	const formatPercent = (share: number) => `${numberFormat.format(share * 100)} %`;
	const shares = TIME_OVER_EXAMPLE.map(({ measured, over }) => over / measured);
	const dayShare = shares.reduce((sum, share) => sum + share, 0) / shares.length;

	return (
		<>
			<AboutFiguresText>{t(($) => $.aboutFigures.calculation.timeOver)}</AboutFiguresText>
			<ExampleTitle>{t(($) => $.aboutFigures.calculation.timeOverExample.title)}</ExampleTitle>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t(($) => $.aboutFigures.calculation.timeOverExample.worker)}</TableHead>
						<TableHead className="text-right">
							{t(($) => $.aboutFigures.calculation.timeOverExample.measured)}
						</TableHead>
						<TableHead className="text-right">
							{t(($) => $.aboutFigures.calculation.timeOverExample.over)}
						</TableHead>
						<TableHead className="text-right">
							{t(($) => $.aboutFigures.calculation.timeOverExample.share)}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{TIME_OVER_EXAMPLE.map(({ worker, measured, over }, index) => (
						<TableRow key={worker}>
							<TableCell>{t(($) => $.aboutFigures.calculation.exampleWorkers[worker])}</TableCell>
							<TableCell className="text-right tabular-nums">{measured}</TableCell>
							<TableCell className="text-right tabular-nums">{over}</TableCell>
							<TableCell className="text-right tabular-nums">{formatPercent(shares[index])}</TableCell>
						</TableRow>
					))}
					<TableRow>
						<TableCell colSpan={3} className="font-medium">
							{t(($) => $.aboutFigures.calculation.timeOverExample.day)}
						</TableCell>
						<TableCell className="text-right font-medium tabular-nums">{formatPercent(dayShare)}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
			<AboutFiguresText>{t(($) => $.aboutFigures.calculation.timeOverNote)}</AboutFiguresText>
			<AboutFiguresText>{t(($) => $.aboutFigures.calculation.timeOverVibration)}</AboutFiguresText>
		</>
	);
}

// Names the table below it, in the same weight as the dialog's other labels
function ExampleTitle({ children }: { children: ReactNode }) {
	return <p className="mt-1 font-medium">{children}</p>;
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
										{t(($) => $.exposures[exposure])}
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
