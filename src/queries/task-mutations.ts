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

export function statusChangeErrorMessage(error: unknown): string {
	const pgError = error as Partial<PostgrestError> | null;
	// 42501 из change_task_status — переход недоступен из текущего статуса
	if (pgError?.code === "42501") {
		return "Статус задачи уже изменился, данные обновлены";
	}
	return pgError?.message ?? "Не удалось изменить статус";
}
