import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { useQueryStates } from "nuqs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { type Period, periods, yardFilterParsers } from "./yard-filter-parsers.ts";

const ENTIRE_YARD = "all";
const ALL_OCCUPATIONS = "all";

export function YardFilters({ halls, occupations }: { halls: Array<string>; occupations: Array<string> }) {
	const { t } = useTranslation();

	const [filters, setFilters] = useQueryStates(yardFilterParsers, { history: "push" });

	const hall = halls.find((h) => h === filters.hall) ?? ENTIRE_YARD;
	const occupation = occupations.find((o) => o === filters.occupation) ?? ALL_OCCUPATIONS;

	return (
		<div className="flex flex-wrap items-end gap-3">
			<FilterField label={t(($) => $.medicalTeamDashboard.yardOverview.filters.hall)}>
				<Select
					value={hall}
					onValueChange={(value) => setFilters({ hall: value === ENTIRE_YARD ? null : value })}
				>
					<SelectTrigger
						className="w-52"
						aria-label={t(($) => $.medicalTeamDashboard.yardOverview.filters.hall)}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ENTIRE_YARD}>
							{t(($) => $.medicalTeamDashboard.yardOverview.filters.entireYard)}
						</SelectItem>
						{halls.map((h) => (
							<SelectItem key={h} value={h}>
								{h}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FilterField>

			<FilterField label={t(($) => $.medicalTeamDashboard.yardOverview.filters.occupation)}>
				<Select
					value={occupation}
					onValueChange={(value) => setFilters({ occupation: value === ALL_OCCUPATIONS ? null : value })}
				>
					<SelectTrigger
						className="w-52"
						aria-label={t(($) => $.medicalTeamDashboard.yardOverview.filters.occupation)}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_OCCUPATIONS}>
							{t(($) => $.medicalTeamDashboard.yardOverview.filters.allOccupations)}
						</SelectItem>
						{occupations.map((o) => (
							<SelectItem key={o} value={o}>
								{o}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FilterField>

			<FilterField label={t(($) => $.medicalTeamDashboard.yardOverview.filters.period)}>
				<ToggleGroup
					type="single"
					variant="outline"
					value={filters.period}
					onValueChange={(value: Period | "") => {
						if (value) {
							setFilters({ period: value });
						}
					}}
				>
					{periods.map((period) => (
						<ToggleGroupItem key={period} value={period} className="px-3 text-sm">
							{t(($) => $.medicalTeamDashboard.yardOverview.filters[period])}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</FilterField>
		</div>
	);
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-muted-foreground text-xs">{label}</span>
			{children}
		</div>
	);
}
