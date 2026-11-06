import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { getRouter } from "./router";
import { supabase } from "./utils/supabase";

const router = getRouter();
const { queryClient } = router.options.context;

// При смене пользователя (вход, выход, другой аккаунт) сбрасываем кэш,
// чтобы данные одного пользователя не показались другому, и перезапускаем guards.
let currentUserId: string | null | undefined;
supabase.auth.onAuthStateChange((event, session) => {
	const userId = session?.user.id ?? null;
	if (event === "INITIAL_SESSION") {
		currentUserId = userId;
		return;
	}
	if (userId === currentUserId) return;
	currentUserId = userId;
	queryClient.clear();
	router.invalidate();
});

const rootElement = document.getElementById("app");

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
