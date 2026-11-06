import type { PostgrestError } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "#/lib/supabase-query";
import type { TaskStatus } from "#/lib/task-status";
import { supabase } from "#/utils/supabase";
import { queryKeys } from "./keys";

type ChangeStatusVariables = { to: TaskStatus; comment?: string };

/** Смена статуса — только через функцию базы change_task_status. */
export function useChangeTaskStatus(taskId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ to, comment }: ChangeStatusVariables) =>
			unwrap(
				await supabase.rpc("change_task_status", {
					p_task_id: taskId,
					p_new_status: to,
					p_comment: comment,
				}),
			),
		// И после успеха, и после ошибки перечитываем задачу, историю и списки:
		// при ошибке это подтянет статус, который успел поставить кто-то другой.
		// Возвращаем промис — мутация считается завершённой, когда данные уже свежие.
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
	});
}

export type TaskInput = {
	object_id: number;
	title: string;
	description: string | null;
	assignee_id: string;
};

/**
 * Создание задачи. Статус («Новая»), автор и дата создания задаются базой:
 * у клиента нет прав на эти колонки. Стартовую запись истории пишет триггер.
 */
export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: TaskInput) =>
			unwrap(await supabase.from("tasks").insert(input).select("id").single()),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
				// в списке объектов показано число задач
				queryClient.invalidateQueries({ queryKey: queryKeys.objects.all }),
			]),
	});
}

export type TaskEditInput = {
	object_id: number;
	title: string;
	description: string | null;
};

/**
 * Редактирование задачи. База разрешает менять только название, описание и объект
 * и только пока задача не принята. Если RLS не пропустил строку (задачу успели
 * принять или удалить), UPDATE не вернёт ни одной строки — это и есть ошибка.
 */
export function useUpdateTask(taskId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: TaskEditInput) => {
			const rows = unwrap(
				await supabase
					.from("tasks")
					.update(input)
					.eq("id", taskId)
					.select("id, object_id"),
			);
			if (rows.length === 0) {
				throw new Error(
					"Задача уже принята или удалена, изменения не сохранены",
				);
			}
			return rows[0];
		},
		// И после ошибки перечитываем: модалка покажет актуальный статус задачи
		onSettled: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
				// при переносе в другой объект меняется число задач в списке объектов
				queryClient.invalidateQueries({ queryKey: queryKeys.objects.all }),
			]),
	});
}

export function statusChangeErrorMessage(error: unknown): string {
	const pgError = error as Partial<PostgrestError> | null;
	// 42501 из change_task_status — переход недоступен из текущего статуса
	if (pgError?.code === "42501") {
		return "Статус задачи уже изменился, данные обновлены";
	}
	return pgError?.message ?? "Не удалось изменить статус";
}
