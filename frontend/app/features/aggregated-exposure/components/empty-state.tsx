import type { ReactNode } from "react";

export function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center">
			<p className="font-medium">{title}</p>
			{description && <p className="max-w-sm text-muted-foreground text-sm">{description}</p>}
			{action}
		</div>
	);
}
