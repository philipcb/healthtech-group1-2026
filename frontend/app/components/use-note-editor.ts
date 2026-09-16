import { TIMEZONE } from "@/i18n/locale.ts";
import { createNote, deleteNote, notesQueryOptions, updateNote } from "@/lib/api.ts";
import { buildNotesQueryKeyPrefix } from "@/lib/query-key-builder.ts";
import type { View } from "@/lib/views.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TZDate } from "@date-fns/tz";
import { isSameDay } from "date-fns";
import { useEffect, useState } from "react";

export function useNoteEditor(view: View, date: TZDate, userId: string) {
	const queryClient = useQueryClient();

	const { data, isLoading, isError, refetch } = useQuery(notesQueryOptions({ view, selectedDay: date, userId }));

	const onSettled = () => {
		queryClient.invalidateQueries({
			queryKey: buildNotesQueryKeyPrefix(userId),
		});
		refetch();
	};

	const { mutate: mutateCreateNote } = useMutation({ mutationFn: createNote, onSettled });
	const { mutate: mutateUpdateNote } = useMutation({ mutationFn: updateNote, onSettled });
	const { mutate: mutateDeleteNote } = useMutation({ mutationFn: deleteNote, onSettled });

	const noteForSelectedDate = data?.find((note) => isSameDay(note.time, date, { in: TIMEZONE })) ?? null;
	const [noteValue, setNoteValue] = useState(noteForSelectedDate?.note ?? "");

	const handleBlur = () => {
		const trimmedNoteValue = noteValue.trim();

		if (trimmedNoteValue === "") {
			setNoteValue("");

			if (noteForSelectedDate !== null) {
				mutateDeleteNote({
					time: noteForSelectedDate.time,
					userId,
				});
			}

			return;
		}

		if (noteForSelectedDate === null) {
			mutateCreateNote({
				note: {
					time: date,
					note: trimmedNoteValue,
				},
				userId,
			});
		} else if (trimmedNoteValue !== noteForSelectedDate.note) {
			mutateUpdateNote({
				note: {
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
