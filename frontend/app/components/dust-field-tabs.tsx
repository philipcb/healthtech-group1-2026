import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { type DustField, dustFields } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

type DustFieldTabsProps = {
	value: DustField;
	onValueChange: (field: DustField) => void;
	/** Names the tab list for screen readers. Left out where the surrounding page already makes it clear */
	ariaLabel?: string;
};

/** Tabs for choosing which dust fraction to show. The caller owns the selected fraction, for example in the URL. */
export function DustFieldTabs({ value, onValueChange, ariaLabel }: DustFieldTabsProps) {
	const { t } = useTranslation();

	return (
		<Tabs
			value={value}
			onValueChange={(selected) => {
				const selectedField = dustFields.find((field) => field === selected);
				if (selectedField) onValueChange(selectedField);
			}}
		>
			<TabsList aria-label={ariaLabel}>
				{dustFields.map((field) => (
					<TabsTrigger key={field} value={field}>
						{t(($) => $.exposures.dustFields[field])}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
