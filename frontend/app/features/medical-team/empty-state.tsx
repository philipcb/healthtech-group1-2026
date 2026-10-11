export function EmptyState({ title, description }: { title: string; description?: string }) {
	return (
		<div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center">
			<p className="font-medium">{title}</p>
			{description && <p className="max-w-sm text-muted-foreground text-sm">{description}</p>}
		</div>
	);
}
