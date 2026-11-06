import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { cn } from "@/lib/utils.ts";
import { type ReactNode, useId } from "react";

export type ToggleOption<T extends string> = { value: T; label: string; icon?: ReactNode };

type OptionToggleProps<T extends string> = {
	options: ReadonlyArray<ToggleOption<T>>;
	value: T;
	onValueChange: (value: T) => void;
	label?: string;
	hidesLabel?: boolean;
	labelledBy?: string;
	fillsWidth?: boolean;
	wraps?: boolean;
};

export function OptionToggle<T extends string>({
	options,
	value,
	onValueChange,
	label,
	hidesLabel = false,
	labelledBy,
	fillsWidth = true,
	wraps = false,
}: OptionToggleProps<T>) {
	const labelId = useId();
	const toggle = (
		<ToggleGroup
			aria-labelledby={labelledBy ?? labelId}
			type="single"
			value={value}
			variant="outline"
			spacing={wraps ? 1 : 0}
			className={cn(fillsWidth && "w-full sm:w-fit", wraps && "flex-wrap")}
			onValueChange={(selected: string) => {
				// An empty value is the selected option being clicked again, which keeps it selected
				const option = options.find((candidate) => candidate.value === selected);
				if (option) onValueChange(option.value);
			}}
		>
			{options.map((option) => (
				<ToggleGroupItem
					key={option.value}
					value={option.value}
					className={cn("px-2 lg:px-3", fillsWidth && "grow sm:grow-0")}
				>
					{option.icon}
					<span className="text-xs lg:text-sm">{option.label}</span>
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);

	if (labelledBy !== undefined) {
		return toggle;
	}

	return (
		<div className="flex flex-col gap-1.5">
			<p id={labelId} className={hidesLabel ? "sr-only" : "font-medium text-sm"}>
				{label}
			</p>
			{toggle}
		</div>
	);
}
