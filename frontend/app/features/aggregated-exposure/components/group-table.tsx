import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { DangerLevelBadge, ThresholdBar } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useGroupDetailsLink } from "@/features/aggregated-exposure/hooks/use-group-details-link.ts";
import { type ComparableGroup, getComparableGroupName } from "@/features/aggregated-exposure/model/compare.ts";
import {
	type ExposureFilter,
	formatGroupValue,
	getGroupThreshold,
	getOccupationLabel,
	getShownExposures,
	isExposureUnavailable,
} from "@/features/aggregated-exposure/model/groups.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import type { MeasurementUnitsDto } from "@/lib/api/generated/models/index.ts";
import { DANGER_LEVEL_SEVERITY, type DangerLevel, getDangerLevel } from "@/lib/danger-levels.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

type GroupTableProps = {
	groups: Array<ComparableGroup>;
	units: MeasurementUnitsDto;
	filter: ExposureFilter;
	/** The dust fraction the dust column shows, and is compared to the thresholds of */
	dustField: DustField;
	/** Picked in the dust column's header, so the choice sits next to the values it changes */
	onDustFieldChange: (field: DustField) => void;
	showsYard: boolean;
	labelledBy: string;
};

/** One row per group and one column per shown exposure, the worst status first */
export function GroupTable({
	groups,
	units,
	filter,
	dustField,
	onDustFieldChange,
	showsYard,
	labelledBy,
}: GroupTableProps) {
	const { t } = useTranslation();
	const exposures = getShownExposures(filter);
	const sortedGroups = groups.toSorted((a, b) => compareGroups(a, b, exposures, dustField));

	return (
		<div className="overflow-x-auto rounded-xl border bg-card">
			<table aria-labelledby={labelledBy} className="w-full border-collapse text-left text-sm">
				<thead className="bg-secondary">
					<tr>
						<th
							scope="col"
							className="sticky left-0 z-10 min-w-40 bg-secondary px-4 py-2.5 align-middle font-medium"
						>
							{t(($) => $.aggregatedExposure.overview.groupColumn)}
						</th>
						{exposures.map((exposure) => (
							<ExposureHeader
								key={exposure}
								exposure={exposure}
								dustField={dustField}
								onDustFieldChange={onDustFieldChange}
							/>
						))}
					</tr>
				</thead>
				<tbody>
					{sortedGroups.map((group) => (
						<tr key={group.groupId} className="border-t">
							<th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2.5 align-top font-normal">
								<span className="block font-medium">{getRowName(group, t)}</span>
								<span className="block text-muted-foreground text-xs">
									{getRowContext(group, showsYard, t)}
								</span>
							</th>
							{exposures.map((exposure) => (
								<ExposureCell
									key={exposure}
									group={group}
									exposure={exposure}
									dustField={dustField}
									unit={units[exposure]}
								/>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/** The exposure's name only. The metric and thresholds are in "About the figures", the status in each cell. */
function ExposureHeader({
	exposure,
	dustField,
	onDustFieldChange,
}: {
	exposure: Exposure;
	dustField: DustField;
	onDustFieldChange: (field: DustField) => void;
}) {
	const { t } = useTranslation();

	return (
		<th scope="col" className="min-w-56 px-4 py-2.5 align-middle font-medium">
			<span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
				<span className="flex items-center gap-1.5">
					<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
					{t(($) => $.exposures[exposure])}
				</span>
				{exposure === "dust" && !isExposureUnavailable(exposure) && (
					<DustFieldTabs
						value={dustField}
						onValueChange={onDustFieldChange}
						ariaLabel={t(($) => $.aggregatedExposure.group.dustFieldLabel)}
						isCompact={true}
					/>
				)}
			</span>
		</th>
	);
}

const cellTints: Record<DangerLevel, string | undefined> = {
	danger: "bg-danger-subtle/60",
	warning: "bg-warning-subtle/60",
	safe: undefined,
};

const labelTones: Record<DangerLevel, string | undefined> = {
	danger: "text-danger-text",
	warning: "text-warning-text",
	safe: undefined,
};

function ExposureCell({
	group,
	exposure,
	dustField,
	unit,
}: {
	group: ComparableGroup;
	exposure: Exposure;
	dustField: DustField;
	unit: MeasurementUnitsDto[Exposure];
}) {
	const { t } = useTranslation();
	const getDetailsLink = useGroupDetailsLink();
	const average = group.averages[exposure];
	const threshold = getGroupThreshold(exposure, dustField);
	const level = getLevel(group, exposure, dustField);
	const value = isExposureUnavailable(exposure)
		? t(($) => $.aggregatedExposure.unavailableValue)
		: average === null
			? t(($) => $.aggregatedExposure.overview.noValue)
			: formatGroupValue(average, unit, t);
	// Safe values are only marked by their dot, so the warnings and exceedances stand out. Without a value there's no
	// level, so a missing value never looks like a safe one.
	const levelLabel = level === "warning" || level === "danger" ? t(($) => $.dangerLevelStatus[level]) : null;

	return (
		<td className={cn("h-px p-0 align-top", level && cellTints[level])}>
			<Link
				to={getDetailsLink(group.groupId, exposure)}
				aria-label={t(($) => $.aggregatedExposure.overview.openDetails, {
					exposure: t(($) => $.exposures[exposure]),
					group: getComparableGroupName(group, t),
					value: levelLabel ? `${value}, ${levelLabel.toLowerCase()}` : value,
				})}
				className="flex h-full flex-col gap-2 px-4 py-2.5 transition-colors hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
			>
				<span className="flex items-center gap-2">
					{level ? (
						<DangerLevelBadge dangerLevel={level} />
					) : (
						<span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-dashed" />
					)}
					<span
						className={cn(
							"font-medium tabular-nums",
							average === null && "font-normal text-muted-foreground",
						)}
					>
						{value}
					</span>
					{levelLabel && (
						<span className={cn("ml-auto text-right font-medium text-xs", level && labelTones[level])}>
							{levelLabel}
						</span>
					)}
				</span>
				<ThresholdBar value={average} threshold={threshold} />
			</Link>
		</td>
	);
}

function getLevel(group: ComparableGroup, exposure: Exposure, dustField: DustField) {
	const average = group.averages[exposure];
	const threshold = getGroupThreshold(exposure, dustField);

	return average === null || isExposureUnavailable(exposure)
		? null
		: getDangerLevel(average, threshold.warning, threshold.danger);
}

function getRowName(group: ComparableGroup, t: TranslateFn) {
	return group.occupation === null ? (group.hall ?? group.site) : getOccupationLabel(group.occupation, t);
}

function getRowContext(group: ComparableGroup, showsYard: boolean, t: TranslateFn) {
	switch (group.level) {
		case "yard":
			return t(($) => $.aggregatedExposure.compare.wholeYard);
		case "hall":
			return showsYard
				? `${group.site} · ${t(($) => $.aggregatedExposure.wholeHall)}`
				: t(($) => $.aggregatedExposure.wholeHall);
		case "yardOccupation":
			return `${group.site} · ${t(($) => $.aggregatedExposure.filters.allHalls)}`;
		case "hallOccupation":
			return showsYard ? `${group.site} · ${group.hall}` : (group.hall ?? group.site);
	}
}

/**
 * The worst status first, then the second worst and so on, so a group over the limit for two exposures comes before one
 * over it for one. Groups with the same statuses are sorted by how close their values are to the limits.
 */
function compareGroups(
	a: ComparableGroup,
	b: ComparableGroup,
	exposures: ReadonlyArray<Exposure>,
	dustField: DustField,
) {
	const severitiesA = getSeverities(a, exposures, dustField);
	const severitiesB = getSeverities(b, exposures, dustField);
	const bySeverity = severitiesA.reduce(
		(result, severity, index) => result || (severitiesB[index] ?? 0) - severity,
		0,
	);

	return (
		bySeverity ||
		getLimitShare(b, exposures, dustField) - getLimitShare(a, exposures, dustField) ||
		a.site.localeCompare(b.site) ||
		(a.hall ?? "").localeCompare(b.hall ?? "") ||
		(a.occupation ?? "").localeCompare(b.occupation ?? "")
	);
}

/** Each exposure's severity, the worst first. A missing value ranks below a safe one. */
function getSeverities(group: ComparableGroup, exposures: ReadonlyArray<Exposure>, dustField: DustField) {
	return exposures
		.map((exposure) => {
			const level = getLevel(group, exposure, dustField);
			return level === null ? -1 : DANGER_LEVEL_SEVERITY[level];
		})
		.toSorted((a, b) => b - a);
}

function getLimitShare(group: ComparableGroup, exposures: ReadonlyArray<Exposure>, dustField: DustField) {
	return exposures.reduce((sum, exposure) => {
		const average = group.averages[exposure];
		return average === null || isExposureUnavailable(exposure)
			? sum
			: sum + average / getGroupThreshold(exposure, dustField).danger;
	}, 0);
}
