const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

/** «06.11.2026, 14:30» → «06.11.2026 14:30», в часовом поясе браузера. */
export function formatDateTime(value: string): string {
	return dateTimeFormat.format(new Date(value)).replace(",", "");
}
