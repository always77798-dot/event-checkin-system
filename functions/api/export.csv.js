import { error, getRecords, requireHost } from "../_lib/data.js";

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    await requireHost(env.DB, url.searchParams.get("token") || "");
    const rows = await getRecords(env.DB);
    const header = ["時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名", "裝置", "彈性欄位 1", "彈性欄位 2"];
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((record) => [
        record.timestamp,
        record.eventName,
        record.mode,
        record.unit,
        record.title,
        record.name,
        record.signature,
        record.device,
        record.extra1,
        record.extra2
      ].map(csvCell).join(","))
    ];
    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=\"checkin-records.csv\""
      }
    });
  } catch (err) {
    return error(err.message || "匯出失敗", err.message?.includes("無權限") ? 403 : 400);
  }
}
