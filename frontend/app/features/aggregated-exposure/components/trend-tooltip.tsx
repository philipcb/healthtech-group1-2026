import { cn } from "@/lib/utils.ts";
import type { ReactNode } from "react";

export function TrendTooltip({
	title,
	className,
	children,
}: {
	title: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn("rounded-md border bg-background p-3 text-sm shadow", className)}>
			<div className="mb-1 font-medium">{title}</div>
			{children}
		</div>
	);
}
