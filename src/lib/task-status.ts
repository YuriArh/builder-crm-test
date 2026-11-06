import type { Database } from "../../database.types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const TASK_STATUSES = [
	"new",
	"in_progress",
	"review",
	"rework",
	"accepted",
] as const satisfies readonly TaskStatus[];

export const STATUS_LABEL: Record<TaskStatus, string> = {
	new: "Новая",
	in_progress: "В работе",
	review: "На проверке",
	rework: "На доработке",
	accepted: "Принята",
};

export const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
	new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
	in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
	review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
	rework: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
	accepted:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
};

/** Порядок в «Моих задачах»: сначала то, что ждёт действия исполнителя. */
export const MY_TASKS_PRIORITY: Record<TaskStatus, number> = {
	rework: 0,
	new: 1,
	in_progress: 2,
	review: 3,
	accepted: 4,
};

export const ROLE_LABEL: Record<AppRole, string> = {
	manager: "Постановщик",
	executor: "Исполнитель",
};
