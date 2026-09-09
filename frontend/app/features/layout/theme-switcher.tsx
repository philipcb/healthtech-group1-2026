import { Button } from "@/components/ui/button.tsx";
import { useTheme } from "@/features/dark-mode/use-theme.ts";
import { cn } from "@/lib/utils.ts";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThemeSwitcher() {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex items-center gap-4 pl-2 text-sm">
			<div className="flex gap-2">
				<Palette className="size-4 text-muted-foreground" />
				<span>{t(($) => $.layout.theme)}</span>
			</div>

			<div className="inline-flex rounded-full p-1">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setTheme("light")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors",
						theme === "light" && "bg-accent",
					)}
				>
					<Sun className="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setTheme("dark")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors",
						theme === "dark" && "bg-accent",
					)}
				>
					<Moon className="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setTheme("system")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors",
						theme === "system" && "bg-accent",
					)}
				>
					<Monitor className="size-4" />
				</Button>
			</div>
		</div>
	);
}
