import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Factory } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

const ALL_HALLS = "all";

/** Narrows the overview to one hall. This only filters what's shown, the backend decides which groups exist. */
export function HallFilter({
	halls,
	value,
	onValueChange,
}: {
	halls: Array<string>;
	/** `null`, or a hall that isn't in `halls`, shows every hall */
	value: string | null;
	onValueChange: (hall: string | null) => void;
}) {
	const { t } = useTranslation();
	const id = useId();
	const selected = value !== null && halls.includes(value) ? value : ALL_HALLS;

	return (
		<div className="flex flex-col gap-1.5">
			<label className="flex items-center gap-2 font-medium text-sm" htmlFor={id}>
				<Factory aria-hidden="true" className="size-4 text-muted-foreground" />
				{t(($) => $.occupationalHealthServiceDashboard.filters.hall)}
			</label>
			<Select value={selected} onValueChange={(hall) => onValueChange(hall === ALL_HALLS ? null : hall)}>
				<SelectTrigger id={id} className="w-full bg-background sm:w-60">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_HALLS}>
						{t(($) => $.occupationalHealthServiceDashboard.filters.allHalls)}
					</SelectItem>
					{halls.map((hall) => (
						<SelectItem key={hall} value={hall}>
							{hall}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
