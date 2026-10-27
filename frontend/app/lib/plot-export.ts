export type ExportValue = string | number | Date | null | undefined;

export type ExportColumn<Row> = {
	header: string;
	value: (row: Row) => ExportValue;
	/** Rounds the column's numbers to at most this many decimals */
	fractionDigits?: number;
};

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\p{Cc}]/gu;

export function toDownloadFilename(parts: ReadonlyArray<string | number | null | undefined>): string {
	const name = parts
		.flatMap((part) => (part === null || part === undefined ? [] : [part.toString()]))
		.map((part) => part.replace(INVALID_FILENAME_CHARACTERS, "").trim().replace(/\s+/g, "-"))
		.filter((part) => part !== "")
		.join("_");
	return name || "data";
}
