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
};

/** Tabs for choosing which dust fraction to show. The caller owns the selected fraction, for example in the URL. */
export function DustFieldTabs({ value, onValueChange, ariaLabel, isCompact = false }: DustFieldTabsProps) {
	const { t } = useTranslation();

	return (
		<Tabs
			value={value}
			onValueChange={(selected) => {
				const selectedField = dustFields.find((field) => field === selected);
				if (selectedField) onValueChange(selectedField);
			}}
		>
			<TabsList
				aria-label={ariaLabel}
				className={cn(isCompact && "group-data-[orientation=horizontal]/tabs:h-8")}
			>
				{dustFields.map((field) => (
					<TabsTrigger
						key={field}
						value={field}
						// The selected fraction in the same light blue as the app's other toggles (Day/Week/Month, exposure
						// filter), so it stands out from the grey headers it often sits in
						className={cn(
							"data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",
							"dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground",
							isCompact && "px-2.5 text-xs",
						)}
					>
						{t(($) => $.exposures.dustFields[field])}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
