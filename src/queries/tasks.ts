import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/lib/supabase-query";
import { supabase } from "#/utils/supabase";
import { queryKeys } from "./keys";

export const objectTasksQueryOptions = (objectId: number) =>
	queryOptions({
		queryKey: queryKeys.tasks.byObject(objectId),
		queryFn: async () =>
			unwrap(
				await supabase
					.from("tasks")
					.select(
						"id, title, status, created_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name)",
					)
					.eq("object_id", objectId)
					.order("created_at", { ascending: false }),
			),
	});

/** Фильтр по assignee_id задаёт смысл экрана «Мои задачи»; доступ ограничивает RLS. */
export const myTasksQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: queryKeys.tasks.mine(userId),
		queryFn: async () =>
			unwrap(
				await supabase
					.from("tasks")
					.select("id, title, status, created_at, object:objects(id, name)")
					.eq("assignee_id", userId)
					.order("created_at", { ascending: false }),
			),
	});

/** null — задачи нет или нет доступа (RLS не отличает одно от другого). */
export const taskQueryOptions = (id: number) =>
	queryOptions({
		queryKey: queryKeys.tasks.detail(id),
		queryFn: async () =>
			unwrap(
				await supabase
					.from("tasks")
					.select(
						`id, title, description, status, created_at,
						object:objects(id, name),
						assignee:profiles!tasks_assignee_id_fkey(id, full_name),
						author:profiles!tasks_author_id_fkey(id, full_name)`,
					)
					.eq("id", id)
					.maybeSingle(),
			),
	});

export const taskHistoryQueryOptions = (taskId: number) =>
	queryOptions({
		queryKey: queryKeys.tasks.history(taskId),
		queryFn: async () =>
			unwrap(
				await supabase
					.from("task_status_history")
					.select(
						"id, from_status, to_status, comment, changed_at, changed_by:profiles(id, full_name)",
					)
					.eq("task_id", taskId)
					.order("changed_at", { ascending: true })
					.order("id", { ascending: true }),
			),
	});

/** Задача и её история для модалки; вызывается из loader, когда в адресе есть ?task. */
export function ensureTaskWithHistory(
	queryClient: QueryClient,
	taskId: number,
) {
	return Promise.all([
		queryClient.query({ ...taskQueryOptions(taskId), staleTime: "static" }),
		queryClient.query({
			...taskHistoryQueryOptions(taskId),
			staleTime: "static",
		}),
	]);
}
