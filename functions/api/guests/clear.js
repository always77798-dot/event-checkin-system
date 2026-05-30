import { clearGuests, error, getState, requireAdmin } from "../../_lib/data.js";

export async function onRequestPost({ env, request }) {
  try {
    const url = new URL(request.url);
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    await clearGuests(env.DB);
    return Response.json(await getState(env.DB, "admin"));
  } catch (err) {
    return error(err.message || "清空名單失敗", err.message?.includes("無權限") ? 403 : 400);
  }
}
