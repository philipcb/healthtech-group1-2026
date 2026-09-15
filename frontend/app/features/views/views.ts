import type { View } from "@/lib/views.ts";
import { CalendarIcon, ColumnsIcon, Grid3X3Icon } from "lucide-react";

export const DayViewIcon = CalendarIcon;
export const WeekViewIcon = ColumnsIcon;
export const MonthViewIcon = Grid3X3Icon;

export const getViewIcon = (view: View) => {
	switch (view) {
		case "day": {
			return DayViewIcon;
		}
		case "week": {
			return WeekViewIcon;
		}
		case "month": {
			return MonthViewIcon;
		}
	}
};
