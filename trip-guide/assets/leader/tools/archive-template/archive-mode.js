/* 紀念版模式：旅程封存後，網頁改讀 archive.json（不再連資料庫），所有新增／修改都會被擋下 */
(function () {
  const data = fetch("/archive.json", { cache: "no-store" }).then(r => r.json());
  const realFetch = window.fetch.bind(window);
  const ok = body => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  window.fetch = async function (input, opt = {}) {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return realFetch(input, opt);
    const method = (opt.method || "GET").toUpperCase();
    if (method !== "GET")
      return new Response(JSON.stringify({ error: "🎉 旅程已經結束，這是紀念版，不能再修改囉" }), { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } });
    const d = await data;
    const name = url.pathname.replace("/api/", "");
    return ok(d[name] ?? []);
  };
  // 頁首加上紀念版標示
  document.addEventListener("DOMContentLoaded", async () => {
    const d = await data.catch(() => ({}));
    const bar = document.createElement("div");
    bar.style.cssText = "background:#2B1B0E;color:#FFF8EC;text-align:center;font-size:14px;font-weight:700;padding:8px 12px;position:relative;z-index:30";
    bar.textContent = `🎉 旅程已結束・紀念版（${d.archived_at || ""} 封存，內容不能再修改）`;
    document.body.prepend(bar);
  });
})();
