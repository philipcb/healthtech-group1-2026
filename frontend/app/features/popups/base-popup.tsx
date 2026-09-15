import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

type BasePopupProps = {
	title: string;
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
};

export function BasePopup({ title, open, onClose, children }: BasePopupProps) {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="w-full max-w-6xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				{children}
			</DialogContent>
		</Dialog>
	);
}
