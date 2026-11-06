import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { DangerLevelBadge, ThresholdBar } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useGroupDetailsLink } from "@/features/aggregated-exposure/hooks/use-group-details-link.ts";
import { type ComparableGroup, getComparableGroupName } from "@/features/aggregated-exposure/model/compare.ts";
import {
	formatGroupValue,
	getGroupThreshold,
	getOccupationLabel,
	getShownExposures,
	isExposureUnavailable,
} from "@/features/aggregated-exposure/model/groups.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import type { MeasurementUnitsDto } from "@/lib/api/generated/models/index.ts";
import { DANGER_LEVEL_SEVERITY, type DangerLevel, getDangerLevel } from "@/lib/danger-levels.ts";
import type { DustField, Exposure, ExposureFilter } from "@/lib/exposures.ts";
import { cn } from "@/lib/utils.ts";
import type { CSSProperties } from "react";
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
		<>
			<GroupList
				groups={sortedGroups}
				units={units}
				exposures={exposures}
				dustField={dustField}
				onDustFieldChange={onDustFieldChange}
				showsYard={showsYard}
				labelledBy={labelledBy}
				className="md:hidden"
			/>
			<div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
				{/* Fixed, so the exposures share the width equally whatever their content. Below the minimum, each exposure
				    still fits the dust column's fraction tabs, and the table scrolls. */}
				<table
					aria-labelledby={labelledBy}
					className="w-full min-w-(--table-min-width) table-fixed border-collapse text-left text-sm"
					style={{ "--table-min-width": `${10 + exposures.length * 12}rem` } as CSSProperties}
				>
					<colgroup>
						<col className="w-40" />
						{exposures.map((exposure) => (
							<col key={exposure} />
						))}
					</colgroup>
					<thead className="bg-secondary">
						<tr>
							<th
								scope="col"
								className="sticky left-0 z-10 bg-secondary px-4 py-2.5 align-top font-medium"
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
								<th
									scope="row"
									className="sticky left-0 z-10 bg-card px-4 py-2.5 align-top font-normal"
								>
									<GroupName group={group} showsYard={showsYard} />
								</th>
								{exposures.map((exposure) => (
									<td
										key={exposure}
										className={cn("h-px p-0 align-top", getLevelTint(group, exposure, dustField))}
									>
										<ExposureLink
											group={group}
											exposure={exposure}
											dustField={dustField}
											unit={units[exposure]}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}

/**
 * The table on phones, where the exposures don't fit side by side: a block per group, in the same order, with a row per
 * shown exposure. The dust fraction is picked above the list, since there's no column header to pick it in.
 */
function GroupList({
	groups,
	units,
	exposures,
	dustField,
	onDustFieldChange,
	showsYard,
	labelledBy,
	className,
}: Omit<GroupTableProps, "filter"> & { exposures: ReadonlyArray<Exposure>; className?: string }) {
	const { t } = useTranslation();
	const dustFieldLabel = t(($) => $.aggregatedExposure.group.dustFieldLabel);

	return (
		<div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
			{exposures.includes("dust") && !isExposureUnavailable("dust") && (
				<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-secondary px-4 py-2">
					{/* The tabs are named by their own label, so this one isn't read twice */}
					<span aria-hidden="true" className="flex items-center gap-1.5 font-medium text-sm">
						<ExposureIcon type="dust" iconOnly={true} iconClassName="size-4" />
						{dustFieldLabel}
					</span>
					<DustFieldTabs
						value={dustField}
						onValueChange={onDustFieldChange}
						ariaLabel={dustFieldLabel}
						isCompact={true}
					/>
				</div>
			)}
			<ul aria-labelledby={labelledBy} className="divide-y text-sm">
				{groups.map((group) => (
					<li key={group.groupId}>
						<div className="px-4 pt-3 pb-1">
							<GroupName group={group} showsYard={showsYard} />
						</div>
						<ul>
							{exposures.map((exposure) => (
								<li key={exposure} className={getLevelTint(group, exposure, dustField)}>
									<ExposureLink
										group={group}
										exposure={exposure}
										dustField={dustField}
										unit={units[exposure]}
										showsName={true}
									/>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</div>
	);
}

function GroupName({ group, showsYard }: { group: ComparableGroup; showsYard: boolean }) {
	const { t } = useTranslation();
	const context = getRowContext(group, showsYard);

	return (
		<>
			<span className="block font-medium">{getRowName(group, t)}</span>
			{context && <span className="block text-muted-foreground text-xs">{context}</span>}
		</>
	);
}

/** The exposure's name only. The metric and thresholds are in "Limits and calculation", the status in each cell. */
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
		// The dust column's fraction tabs sit next to its name, and wrap below it when the column is too narrow. Every name
		// is as tall as the tabs and top-aligned, so the names stay on one line with each other and the group column's.
		<th scope="col" className="px-4 py-1 align-top font-medium">
			<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="flex h-8 items-center gap-1.5">
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

/** On the cell or row around the link, so the link's hover shows on top of it */
function getLevelTint(group: ComparableGroup, exposure: Exposure, dustField: DustField) {
	const level = getLevel(group, exposure, dustField);
	return level ? cellTints[level] : undefined;
}

/** An exposure's value for a group, linking to its details */
function ExposureLink({
	group,
	exposure,
	dustField,
	unit,
	showsName = false,
}: {
	group: ComparableGroup;
	exposure: Exposure;
	dustField: DustField;
	unit: MeasurementUnitsDto[Exposure];
	/** For the list on phones, which has no column header to name the exposure */
	showsName?: boolean;
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
	// Only for screen readers: the badge, the cell's tint and the legend above the table show the status. Without a
	// value there's no level, so a missing value never looks like a safe one.
	const levelLabel = level === "warning" || level === "danger" ? t(($) => $.dangerLevelStatus[level]) : null;

	return (
		<Link
			to={getDetailsLink(group.groupId, exposure)}
			aria-label={t(($) => $.aggregatedExposure.overview.openDetails, {
				exposure: t(($) => $.exposures[exposure]),
				group: getComparableGroupName(group, t),
				value: levelLabel ? `${value}, ${levelLabel.toLowerCase()}` : value,
			})}
			className={cn(
				"flex h-full flex-col gap-2 px-4 py-2.5 transition-colors hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset",
				// A taller row on phones, for a touch target
				showsName && "py-3",
			)}
		>
			<span className="flex items-center gap-2">
				{showsName && (
					<span className="mr-auto flex min-w-0 items-center gap-1.5">
						<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
						<span className="truncate">{t(($) => $.exposures[exposure])}</span>
					</span>
				)}
				{level ? (
					<DangerLevelBadge dangerLevel={level} />
				) : (
					<span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-dashed" />
				)}
				<span
					className={cn(
						"whitespace-nowrap font-medium tabular-nums",
						average === null && "font-normal text-muted-foreground",
					)}
				>
					{value}
				</span>
			</span>
			<ThresholdBar value={average} threshold={threshold} />
		</Link>
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

function getRowContext(group: ComparableGroup, showsYard: boolean) {
	switch (group.level) {
		case "yard":
			return null;
		case "hall":
			return showsYard ? group.site : null;
		case "yardOccupation":
			return group.site;
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
