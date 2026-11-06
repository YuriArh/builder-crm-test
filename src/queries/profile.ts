import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/lib/supabase-query";
import { supabase } from "#/utils/supabase";
import type { Tables } from "../../database.types";
import { queryKeys } from "./keys";

export const meQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: queryKeys.me(userId),
		queryFn: async () =>
			unwrap(
				await supabase
					.from("profiles")
					.select("id, full_name, role")
					.eq("id", userId)
					.maybeSingle(),
			),
	});

export type Profile = Pick<Tables<"profiles">, "id" | "full_name" | "role">;
