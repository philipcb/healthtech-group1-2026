import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import {
	getMonthLabel,
	getSelectableYears,
	monthKeys,
	occupationalHealthServicePeriods,
	type PeriodSelection,
} from "@/features/occupational-health-service/occupational-health-service-period.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function OccupationalHealthServicePeriodPicker({ selection }: { selection: PeriodSelection }) {
	const { t } = useTranslation();
	const { period, setPeriod, month, setMonth, year, setYear } = selection;
	const years = getSelectableYears();

	return (
		<div className="flex flex-wrap items-center gap-2">
			<ToggleGroup
				aria-label={t(($) => $.occupationalHealthServiceDashboard.period.label)}
				type="single"
				value={period}
				variant="outline"
				onValueChange={(value: string) => {
					const selectedPeriod = occupationalHealthServicePeriods.find((candidate) => candidate === value);
					if (selectedPeriod) setPeriod(selectedPeriod);
				}}
			>
				<ToggleGroupItem value="month">
					{t(($) => $.occupationalHealthServiceDashboard.period.month)}
				</ToggleGroupItem>
				<ToggleGroupItem value="year">
					{t(($) => $.occupationalHealthServiceDashboard.period.year)}
				</ToggleGroupItem>
			</ToggleGroup>
			{/* The selects wrap together, so a narrow screen gets them on one row below the toggle instead of a lone year */}
			<div className="flex grow gap-2">
				{period === "month" && (
					<PeriodSelect
						label={t(($) => $.occupationalHealthServiceDashboard.period.month)}
						value={month}
						options={monthKeys.map((_, index) => ({ value: index, label: getMonthLabel(index, t) }))}
						onValueChange={setMonth}
					/>
				)}
				<PeriodSelect
					label={t(($) => $.occupationalHealthServiceDashboard.period.selectYear)}
					value={year}
					options={years.map((selectableYear) => ({
						value: selectableYear,
						label: selectableYear.toString(),
					}))}
					onValueChange={setYear}
				/>
			</div>
		</div>
	);
}

function PeriodSelect({
	label,
	value,
	options,
	onValueChange,
}: {
	/** Only read by screen readers, the selected value is visible on its own */
	label: string;
	value: number;
	options: Array<{ value: number; label: string }>;
	onValueChange: (value: number) => void;
}) {
	const id = useId();

	return (
		<>
			<label className="sr-only" htmlFor={id}>
				{label}
			</label>
			<Select value={value.toString()} onValueChange={(selected) => onValueChange(Number(selected))}>
				<SelectTrigger id={id} className="grow bg-background">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value.toString()}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</>
	);
}
