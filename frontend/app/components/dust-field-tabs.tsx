import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { type DustField, dustFields } from "@/lib/exposures.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";

type DustFieldTabsProps = {
	value: DustField;
	onValueChange: (field: DustField) => void;
	/** Names the tab list for screen readers. Left out where the surrounding page already makes it clear */
	ariaLabel?: string;
	/** A smaller version that fits in a table header */
	isCompact?: boolean;
	className?: string;
};

/** Tabs for choosing which dust fraction to show. The caller owns the selected fraction, for example in the URL. */
export function DustFieldTabs({ value, onValueChange, ariaLabel, isCompact = false, className }: DustFieldTabsProps) {
	const { t } = useTranslation();

	return (
		<Tabs
			value={value}
			className={cn(!isCompact && "w-full sm:w-fit", className)}
			onValueChange={(selected) => {
				const selectedField = dustFields.find((field) => field === selected);
				if (selectedField) onValueChange(selectedField);
			}}
		>
			<TabsList
				aria-label={ariaLabel}
				className={cn(isCompact ? "group-data-[orientation=horizontal]/tabs:h-8" : "w-full sm:w-fit")}
			>
				{dustFields.map((field) => (
					<TabsTrigger
						key={field}
						value={field}
						className={cn(isCompact ? "px-2.5 text-xs" : "flex-1 sm:flex-none")}
					>
						{t(($) => $.exposures.dustFields[field])}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
