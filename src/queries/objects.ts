import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/lib/supabase-query";
import { supabase } from "#/utils/supabase";
import { queryKeys } from "./keys";

export const objectsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.objects.all,
		queryFn: async () => {
			// tasks(count) считается с учётом RLS: исполнитель видит число только своих задач
			const rows = unwrap(
				await supabase
					.from("objects")
					.select("id, name, address, created_at, tasks(count)")
					.order("created_at", { ascending: false }),
			);
			return rows.map(({ tasks, ...object }) => ({
				...object,
				taskCount: tasks[0]?.count ?? 0,
			}));
		},
	});

export const objectQueryOptions = (id: number) =>
	queryOptions({
		queryKey: queryKeys.objects.detail(id),
		queryFn: async () =>
			unwrap(
				await supabase
					.from("objects")
					.select("id, name, address")
					.eq("id", id)
					.maybeSingle(),
			),
	});
