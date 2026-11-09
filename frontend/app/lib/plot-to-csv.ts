import { format } from "date-fns";
import type { ExportColumn, ExportValue } from "./plot-export.ts";

export type CsvValue = string | number | null | undefined;

export type CsvColumn<Row> = {
	header: string;
	value: (row: Row) => CsvValue;
	/** Rounds the column's numbers to at most this many decimals */
	fractionDigits?: number;
};

// The standard CSV format, which VS Code, Google Sheets and pandas split into columns. Excel only does when Windows' list
// separator is ",".
const SEPARATOR = ",";
const LINE_BREAK = "\r\n";

// Without it Excel reads the file as ANSI and garbles "µg/m³" and "æøå"
const BYTE_ORDER_MARK = "\uFEFF";
// Excel runs a cell that starts with one of these as a formula, so a text like "=HYPERLINK(...)" is escaped
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function toCell(value: ExportValue, fractionDigits?: number): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (value instanceof Date) {
		return format(value, "yyyy-MM-dd");
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			return "";
		}
		return (fractionDigits === undefined ? value : Number(value.toFixed(fractionDigits))).toString();
	}

	const text = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
	const needsQuotes = text.includes(SEPARATOR) || /["\r\n]/.test(text);

	return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv<Row>(columns: ReadonlyArray<ExportColumn<Row>>, rows: ReadonlyArray<Row>): string {
	const header = columns.map((column) => toCell(column.header));
	const lines = rows.map((row) => columns.map((column) => toCell(column.value(row), column.fractionDigits)));

	return [header, ...lines].map((cells) => cells.join(SEPARATOR)).join(LINE_BREAK);
}

export function downloadCsv<Row>(
	filename: string,
	columns: ReadonlyArray<ExportColumn<Row>>,
	rows: ReadonlyArray<Row>,
) {
	const blob = new Blob([BYTE_ORDER_MARK, toCsv(columns, rows)], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");

	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	// timeout to make sure the download does not cancel
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
