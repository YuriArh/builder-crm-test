import { z } from "zod";
import { TASK_STATUSES } from "./task-status";

/**
 * Search-параметры экранов со списком задач:
 * ?task — открытая модалка задачи, ?status — фильтр.
 * Некорректные значения отбрасываются (.catch), а не ломают страницу.
 */
export const taskListSearchSchema = z.object({
	task: z.number().int().positive().optional().catch(undefined),
	status: z.enum(TASK_STATUSES).optional().catch(undefined),
});
