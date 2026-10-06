import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { type Exposure, type ExposureUnit, exposures } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { cn } from "@/lib/utils.ts";
import { InfoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLevelLabels, severityOrder } from "./level-labels.ts";

const exposureUnits: Record<Exposure, ExposureUnit> = {
	dust: "ug",
	noise: "db",
	vibration: "points",
};

export function LevelClassificationDialog() {
	const { t, i18n } = useTranslation();

	const levelLabels = getLevelLabels(t);
	const levelRules: Record<DangerLevel, string> = {
		safe: t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.rules.safe),
		warning: t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.rules.warning),
		danger: t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.rules.danger),
	};

	const numberFormat = new Intl.NumberFormat(i18n.language === "no" ? "nb-NO" : "en-US");
	const formatThreshold = (value: number, exposure: Exposure) =>
		`${numberFormat.format(value)} ${t(($) => $.exposures.units[exposureUnits[exposure]])}`;

	const noisePeak = getThreshold("noise").peakDanger;

	return (
		<Dialog>
			<DialogTrigger asChild={true}>
				<Button variant="ghost" size="sm" className="text-muted-foreground">
					<InfoIcon aria-hidden="true" />
					{t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.trigger)}
				</Button>
			</DialogTrigger>

			<DialogContent className="max-h-[90dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.title)}</DialogTitle>
					<DialogDescription>
						{t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.description)}
					</DialogDescription>
				</DialogHeader>

				<ul className="flex flex-col gap-3">
					{severityOrder.map((level) => (
						<li key={level} className={cn("border-l-4 pl-1.5", dangerlevelStyles[level].border)}>
							<p className="font-medium text-sm">{levelLabels[level]}</p>
							<p className="text-muted-foreground text-xs">{levelRules[level]}</p>
						</li>
					))}
				</ul>

				<dl className="flex flex-col gap-2 text-sm">
					<div>
						<dt className="font-medium">{t(($) => $.limitExplanation.actionValue.label)}</dt>
						<dd className="text-muted-foreground text-xs">
							{t(($) => $.limitExplanation.actionValue.description)}
						</dd>
					</div>
					<div>
						<dt className="font-medium">{t(($) => $.limitExplanation.limitValue.label)}</dt>
						<dd className="text-muted-foreground text-xs">
							{t(($) => $.limitExplanation.limitValue.description)}
						</dd>
					</div>
				</dl>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.exposure)}
							</TableHead>
							<TableHead className="text-right">
								{t(($) => $.limitExplanation.actionValue.label)}
							</TableHead>
							<TableHead className="text-right">
								{t(($) => $.limitExplanation.limitValue.label)}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{exposures.map((exposure) => {
							const { warning, danger } = getThreshold(exposure);

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

				<ul className="flex list-disc flex-col gap-1 pl-4 text-muted-foreground text-xs">
					<li>
						{t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.actionValueIncludesLimit)}
					</li>
					{noisePeak !== null && (
						<li>
							{t(($) => $.medicalTeamDashboard.yardOverview.levelClassification.noisePeaks, {
								peak: formatThreshold(noisePeak, "noise"),
							})}
						</li>
					)}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
