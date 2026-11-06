import type { PostgrestError } from "@supabase/supabase-js";

type SupabaseResult = { data: unknown; error: PostgrestError | null };

/**
 * Возвращает data из успешного ответа или бросает ошибку Supabase —
 * так её поймают Query и errorComponent маршрута.
 * Для .maybeSingle() тип сохраняет null («не найдено»).
 */
export function unwrap<R extends SupabaseResult>(
	result: R,
): Extract<R, { error: null }>["data"] {
	if (result.error) throw result.error;
	return result.data;
}
