import { Button } from "@/components/ui/button.tsx";
import { DateRangePicker } from "@/components/ui/date-range-picker.tsx";
import { Field } from "@/components/ui/field.tsx";
import { Form } from "@/components/ui/form.tsx";
import type { TZDate } from "@date-fns/tz";
import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import type { DateFormValues } from "./privacy-settings-popup.tsx";

interface DateRangeFormProps {
	form: UseFormReturn<DateFormValues>;
	onSubmit: (data: DateFormValues) => void;
	minDate: TZDate;
	maxDate: TZDate;
	submitLabel: React.ReactNode;
	submitIcon: React.ReactNode;
	destructive?: boolean;
	showConfirmation: boolean;
	confirmationText: (from: TZDate, to: TZDate) => string;
}

export function DateRangeForm({
	form,
	onSubmit,
	minDate,
	maxDate,
	submitLabel,
	submitIcon,
	destructive,
	showConfirmation,
	confirmationText,
}: DateRangeFormProps) {
	const { t } = useTranslation();
	const from = form.watch("fromDate");
	const to = form.watch("toDate");

	const handleRangeChange = (range: { from?: TZDate; to?: TZDate }) => {
		form.setValue("fromDate", range.from);
		form.setValue("toDate", range.to);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
				<div className="flex flex-col gap-2 sm:flex-row">
					<Field className="w-74">
						<DateRangePicker
							value={{ from, to }}
							onChange={handleRangeChange}
							minDate={minDate}
							maxDate={maxDate}
							placeholder={t(($) => $.popup.pickDate)}
						/>
					</Field>

					<Button
						type="submit"
						disabled={!(from && to)}
						variant={destructive ? "destructive" : "default"}
						className="w-fit"
					>
						{submitIcon}
						{submitLabel}
					</Button>
				</div>

				<div className="relative min-h-4">
					{showConfirmation && from && to && (
						<p
							className={`absolute inset-0 text-green-700 text-xs ${
								showConfirmation ? "visible opacity-100" : "invisible opacity-0"
							}`}
						>
							{confirmationText(from, to)}
						</p>
					)}
				</div>
			</form>
		</Form>
	);
}
