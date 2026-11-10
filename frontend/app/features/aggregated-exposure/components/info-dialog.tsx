import { Button } from "@/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";
import { InfoIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

export function InfoDialog({
	triggerLabel,
	title,
	description,
	children,
}: {
	triggerLabel: string;
	title: string;
	description?: string;
	children: ReactNode;
}) {
	const descriptionId = useId();

	return (
		<Dialog>
			<DialogTrigger asChild={true}>
				{/* Only the icon on phones, so the page's title keeps the width */}
				<Button variant="outline" size="sm" className="shrink-0 max-sm:size-9 max-sm:px-0">
					<InfoIcon aria-hidden="true" />
					<span className="max-sm:sr-only">{triggerLabel}</span>
				</Button>
			</DialogTrigger>

			<DialogContent
				className="max-h-[90dvh] overflow-y-auto"
				aria-describedby={description === undefined ? undefined : descriptionId}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description !== undefined && (
						<DialogDescription id={descriptionId}>{description}</DialogDescription>
					)}
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}

export function InfoSection({
	title,
	className,
	children,
}: {
	title: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section className={cn("flex flex-col gap-1.5 text-sm", className)}>
			<h3 className="font-medium">{title}</h3>
			{children}
		</section>
	);
}
