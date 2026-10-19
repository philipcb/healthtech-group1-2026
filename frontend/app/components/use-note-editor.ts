import { TIMEZONE } from "@/i18n/locale.ts";
import { useCreateNote, useDeleteNote, useGetNotes, useUpdateNote } from "@/lib/api/generated/note-data.ts";
import { invalidateNotes } from "@/lib/api/invalidation.ts";
import { getStartEnd } from "@/lib/exposure-query-utils.ts";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";
import { useQueryClient } from "@tanstack/react-query";
import { isSameDay } from "date-fns";
import { useEffect, useState } from "react";

export function useNoteEditor(view: View, date: TZDate, userId: string) {
	const queryClient = useQueryClient();

	const { data, isLoading, isError, refetch } = useGetNotes(userId, getStartEnd(view, date));

	const onSettled = () => {
		invalidateNotes(queryClient, userId);
		refetch();
	};

	const { mutate: mutateCreateNote } = useCreateNote({ mutation: { onSettled } });
	const { mutate: mutateUpdateNote } = useUpdateNote({ mutation: { onSettled } });
	const { mutate: mutateDeleteNote } = useDeleteNote({ mutation: { onSettled } });

	const noteForSelectedDate = data?.find((note) => isSameDay(note.time, date, { in: TIMEZONE })) ?? null;
	const [noteValue, setNoteValue] = useState(noteForSelectedDate?.note ?? "");

	const handleBlur = () => {
		const trimmedNoteValue = noteValue.trim();

		if (trimmedNoteValue === "") {
			setNoteValue("");

			if (noteForSelectedDate !== null) {
				mutateDeleteNote({
					// Orval types a date-time request body that isn't an object as a string
					data: noteForSelectedDate.time.toISOString(),
					userId,
				});
			}

			return;
		}

		if (noteForSelectedDate === null) {
			mutateCreateNote({
				data: {
					time: date,
					note: trimmedNoteValue,
				},
				userId,
			});
		} else if (trimmedNoteValue !== noteForSelectedDate.note) {
			mutateUpdateNote({
				data: {
					time: noteForSelectedDate.time,
					note: trimmedNoteValue,
				},
				userId,
			});
		}
	};

	useEffect(() => {
		if (data) {
			const foundNote = data.find((note) => isSameDay(note.time, date, { in: TIMEZONE })) ?? null;
			setNoteValue(foundNote?.note ?? "");
		}
	}, [data, date]);

	return { data, isLoading, isError, noteValue, setNoteValue, handleBlur };
}
