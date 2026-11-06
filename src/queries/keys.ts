/** Все ключи запросов в одном месте — для инвалидации на этапе мутаций. */
export const queryKeys = {
	me: (userId: string) => ["me", userId] as const,
	executors: ["executors"] as const,
	objects: {
		all: ["objects"] as const,
		detail: (id: number) => ["objects", id] as const,
	},
	tasks: {
		all: ["tasks"] as const,
		byObject: (objectId: number) => ["tasks", { objectId }] as const,
		mine: (userId: string) => ["tasks", "mine", userId] as const,
		detail: (id: number) => ["tasks", id] as const,
		history: (id: number) => ["tasks", id, "history"] as const,
	},
};
