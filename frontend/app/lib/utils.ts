import type { TranslateFn } from "@/i18n/config.ts";
import { type ClassValue, clsx } from "clsx";
import { CircleDashedIcon, FrownIcon, MehIcon, SmileIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { DangerLevel } from "./danger-levels.ts";
import type { ExposureDto } from "./dto/exposure.ts";
import type { User } from "./dto/user.ts";
import type { Exposure, ExposureUnit } from "./exposures.ts";

const UG_TO_MG = 0.001;

export function cn(...inputs: Array<ClassValue>) {
	return twMerge(clsx(inputs));
}

export const userRoleToString = (role: User["role"], t: TranslateFn) => {
	switch (role) {
		case "operator":
			return t(($) => $.user.role.operator);
		case "foreman":
			return t(($) => $.user.role.foreman);
		default:
			return role;
	}
};

export function downsampleDataPoints(data: Array<ExposureDto>, bucketSize: number): Array<ExposureDto> {
	const result: Array<ExposureDto> = [];

	for (let i = 0; i < data.length; i += bucketSize) {
		const bucket = data.slice(i, i + bucketSize);
		if (!bucket.length) continue;

		let min = bucket[0];
		let max = bucket[0];

		//Keep min and max of each bucket
		for (const item of bucket) {
			if (item.value < min.value) min = item;
			if (item.value > max.value) max = item;
		}

		if (min.time < max.time) {
			result.push(min, max);
		} else {
			result.push(max, min);
		}
	}

	return result;
}

export function downsampleExposureData(exposure: Exposure, data: Array<ExposureDto>): Array<ExposureDto> {
	if (exposure === "vibration") {
		return data;
	}

	return downsampleDataPoints(data, 20);
}

export function shorthandName(name: string): string {
	if (!name) {
		return "";
	}

	const names = name.trim().split(/\s+/);

	if (names.length <= 1) {
		return name;
	}

	const firstInitial = names[0][0].toUpperCase();
	const lastname = names[names.length - 1];

	return `${firstInitial}. ${lastname}`;
}

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getEmoji(dangerLevel: DangerLevel | null) {
	switch (dangerLevel) {
		case "danger":
			return FrownIcon;

		case "warning":
			return MehIcon;

		case "safe":
			return SmileIcon;

		case null:
			return CircleDashedIcon;
	}
}

export function formatExposureValue(
	value: number | undefined,
	unit: ExposureUnit,
	numberOfDigits = 2,
	numberOfDigitsPerUnit?: Partial<Record<ExposureUnit, number>>,
) {
	if (value == null) {
		return "N/A";
	}

	const resolvedNumberOfUnits = numberOfDigitsPerUnit?.[unit] ?? numberOfDigits;

	if (unit === "mg") {
		return (value * UG_TO_MG).toFixed(resolvedNumberOfUnits);
	}

	return value.toFixed(resolvedNumberOfUnits);
}

/**
 * Peak data doesn't have a warning danger level, so we treat warning levels as safe
 */
export function normalizeDangerLevelForPeakForLineChart(dangerLevel: DangerLevel, isPeak?: boolean): DangerLevel {
	if (isPeak && dangerLevel === "warning") {
		return "safe";
	}

	return dangerLevel;
}
