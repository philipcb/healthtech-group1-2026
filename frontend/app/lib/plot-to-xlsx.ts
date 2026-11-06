import type { Cell } from "write-excel-file/browser";
import type { ExportColumn, ExportValue } from "./plot-export.ts";

const INVALID_SHEET_NAME_CHARACTERS = /[[\]/\\:*?]/g;
const MAX_SHEET_NAME_LENGTH = 31;
// numbers in amount of characters
const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 60;
const COLUMN_PADDING = 2;
const DATE_LENGTH = "yyyy-mm-dd".length;
const HEADER_STYLE = {
	fontWeight: "bold",
	backgroundColor: "#F2F2F2",
	bottomBorderStyle: "thin",
	bottomBorderColor: "#BFBFBF",
} as const;

export type XlsxOptions = {
	sheetName: string;
	dateFormat: string;
};

function toCell(value: ExportValue, fractionDigits?: number): Cell {
	if (value === null || value === undefined) {
		return null;
	}
	if (value instanceof Date) {
		// The library counts the days from the `Date`'s UTC time, so the calendar day the app shows is moved to UTC midnight
		return { value: new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())), type: Date };
	}
	if (typeof value === "number") {
		// The cell keeps every decimal, so calculations in Excel are exact. The format only rounds what's shown.
		return Number.isFinite(value) ? { value, type: Number, format: toNumberFormat(fractionDigits) } : null;
	}
	return { value, type: String };
}

function toNumberFormat(fractionDigits: number | undefined) {
	if (fractionDigits === undefined) {
		return undefined;
	}
	return fractionDigits === 0 ? "0" : `0.${"0".repeat(fractionDigits)}`;
}

function getTextLength(value: ExportValue, fractionDigits?: number) {
	if (value === null || value === undefined) {
		return 0;
	}
	if (value instanceof Date) {
		return DATE_LENGTH;
	}
	if (typeof value === "number") {
		return value.toFixed(fractionDigits ?? 2).length;
	}

	return value.length;
}

function toSheetName(name: string) {
	const cleaned = name.replace(INVALID_SHEET_NAME_CHARACTERS, "").replace(/\s+/g, " ").trim();
	return cleaned.slice(0, MAX_SHEET_NAME_LENGTH).trim() || "Data";
}

/** The sheet with a bold header row stay at the top when scrolling, and columns are as wide as their content */
export function toXlsxSheet<Row>(
	columns: ReadonlyArray<ExportColumn<Row>>,
	rows: ReadonlyArray<Row>,
	{ sheetName, dateFormat }: XlsxOptions,
) {
	const values = rows.map((row) => columns.map((column) => column.value(row)));
	const header: Array<Cell> = columns.map((column) => ({ value: column.header, type: String, ...HEADER_STYLE }));
	const body = values.map((rowValues) =>
		rowValues.map((value, index) => toCell(value, columns[index].fractionDigits)),
	);
	const widths = columns.map((column, index) => {
		const longest = Math.max(
			column.header.length,
			...values.map((rowValues) => getTextLength(rowValues[index], column.fractionDigits)),
		);
		return { width: Math.min(Math.max(longest + COLUMN_PADDING, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH) };
	});

	return {
		data: [header, ...body],
		options: { sheet: toSheetName(sheetName), columns: widths, stickyRowsCount: 1, dateFormat },
	};
}

export async function downloadXlsx<Row>(
	filename: string,
	columns: ReadonlyArray<ExportColumn<Row>>,
	rows: ReadonlyArray<Row>,
	options: XlsxOptions,
) {
	const { default: writeExcelFile } = await import("write-excel-file/browser");
	const { data, options: sheetOptions } = toXlsxSheet(columns, rows, options);

	await writeExcelFile(data, sheetOptions).toFile(`${filename}.xlsx`);
}
