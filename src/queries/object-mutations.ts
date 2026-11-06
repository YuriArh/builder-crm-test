import {
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { unwrap } from "#/lib/supabase-query";
import { supabase } from "#/utils/supabase";
import { queryKeys } from "./keys";

export type ObjectInput = { name: string; address: string };

/** created_by и created_at база подставит сама: на них у клиента нет прав. */
export function useCreateObject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: ObjectInput) =>
			unwrap(
				await supabase.from("objects").insert(input).select("id").single(),
			),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.objects.all }),
	});
}

/**
 * Удаление объекта. Задачи и их история удаляются каскадом в базе.
 * RLS молча отфильтровывает чужие для пользователя строки, поэтому
 * проверяем, что удалена ровно одна строка.
 */
export function useDeleteObject() {
	return useMutation({
		mutationFn: async (id: number) => {
			const deleted = unwrap(
				await supabase.from("objects").delete().eq("id", id).select("id"),
			);
			if (deleted.length === 0) {
				throw new Error("Объект не найден или у вас нет прав на удаление");
			}
		},
	});
}

/**
 * Чистка кэша после удаления. Вызывать после ухода со страницы объекта:
 * иначе открытая карточка перезапросит удалённый объект и мигнёт «не найден».
 */
export async function forgetDeletedObject(
	queryClient: QueryClient,
	id: number,
) {
	queryClient.removeQueries({ queryKey: queryKeys.objects.detail(id) });
	queryClient.removeQueries({ queryKey: queryKeys.tasks.byObject(id) });
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.objects.all }),
		queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
	]);
}
