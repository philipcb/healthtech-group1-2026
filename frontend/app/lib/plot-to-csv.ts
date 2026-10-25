import { createElement } from "react";

export type CsvValue = string | number | null | undefined;

export type CsvColumn<Row> = {
	header: string;
	value: (row: Row) => CsvValue;
};

const SEPERATOR = ";";
const DECIMAL_MARK = ",";
const LINE_BREAK = "\r\n";

const BYTE_ORDER_MARK = "\uFEFF";
const FORMULA_PREFIXES = ["=", "++", "-", "@", "\t", "\r"];
const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\p{Cc}]/gu;

function toCell(value: CsvValue): string {
	if (value == null || value === undefined) {
		return "";
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? value.toString().replace(".", DECIMAL_MARK) : "";
	}

	const text = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
	const needsQuotes = text.includes(SEPERATOR) || /["\r\n]/.test(text);

	return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv<Row>(columns: ReadonlyArray<CsvColumn<Row>>, rows: ReadonlyArray<Row>): string {
	const header = columns.map((column) => toCell(column.header));
	const lines = rows.map((row) => columns.map((column) => toCell(column.value(row))));

	return [header, ...lines].map((cells) => cells.join(SEPERATOR)).join(LINE_BREAK);
}

export function toCsvFilename(parts: ReadonlyArray<string | number | null | undefined>): string {
	const name = parts
		.flatMap((part) => (part === null || part === undefined ? [] : [part.toString()]))
		.map((part) => part.replace(INVALID_FILENAME_CHARACTERS, "").trim().replace(/\s+/g, "-"))
		.filter((part) => part !== "")
		.join("_");
	return `${name || "data"}.csv`;
}

export function downloadCsv(filename: string, csv: string) {
	const blob = new Blob([BYTE_ORDER_MARK, csv], { type: "text/csv;charset=utf-8" });
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
