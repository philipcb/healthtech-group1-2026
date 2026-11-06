import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";

const ALL = "all";

/** Narrows the dashboard to one of `options`. This only filters what's shown, the backend decides what exists. */
export function SelectFilter({
	label,
	icon: Icon,
	options,
	value,
	onValueChange,
	allLabel,
	inline = false,
	hidesLabel = false,
}: {
	label: string;
	icon: LucideIcon;
	options: Array<string>;
	/** `null`, or a value that isn't in `options`, is every option */
	value: string | null;
	onValueChange: (value: string | null) => void;
	/** The option for every value at once. Left out when one value has to be picked. */
	allLabel?: string;
	inline?: boolean;
	hidesLabel?: boolean;
}) {
	const id = useId();
	const selected = value !== null && options.includes(value) ? value : ALL;

	return (
		<div className={cn("flex flex-col gap-1.5", inline && "sm:flex-row sm:items-center sm:gap-2")}>
			<label className={cn("flex items-center gap-2 font-medium text-sm", hidesLabel && "sr-only")} htmlFor={id}>
				<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
				{label}
			</label>
			<Select value={selected} onValueChange={(option) => onValueChange(option === ALL ? null : option)}>
				<SelectTrigger id={id} className={cn("w-full bg-background", inline ? "sm:w-48" : "sm:w-60")}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{allLabel !== undefined && <SelectItem value={ALL}>{allLabel}</SelectItem>}
					{options.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
