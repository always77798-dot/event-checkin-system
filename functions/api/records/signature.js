import { error, getSingleSignature, requireHost } from "../../_lib/data.js";

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";

    if (!id) return error("缺少紀錄 ID", 400);

    // 驗證主持人或管理員權限
    await requireHost(env.DB, token);

    const signature = await getSingleSignature(env.DB, id);
    return Response.json({ id, signature });
  } catch (err) {
    return error(err.message || "取得簽名檔失敗", err.message?.includes("無權限") ? 403 : 500);
  }
}
