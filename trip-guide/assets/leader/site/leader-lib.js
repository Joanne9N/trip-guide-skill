/* 領隊結算共用程式：後台網頁（admin.html）與封存腳本（tools/archive.mjs）共用同一套計算，數字才會一致
   ctx = { set: 結算設定, ledger: 帳本, receipts: 收據清單, days: 行程 } */
(function (root) {
  const PAYER = { guide: "🧑‍🦱 當地導遊", leader: "🧑‍✈️ 台灣領隊" };
  const METHOD = { guide_rate: "導遊匯率結台幣", card: "刷卡", cash: "現金" };
  const fmt = (n, dec = 0) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dec });
  const fmtLocal = n => fmt(n, 2);
  const round = n => Math.round(Number(n) + 1e-9);

  // 匯率：資料庫一律存「1 台幣 = ? 當地幣」，畫面依設定的方向顯示
  const rateToShow = (set, r) => set.rate_dir === "twd_per_local" ? +(1 / r).toFixed(4) : +(+r).toFixed(4);
  const rateText = (set, r) => set.rate_dir === "twd_per_local" ? `1 ${set.currency_name} = ${rateToShow(set, r)} 台幣` : `1:${fmt(rateToShow(set, r), 4)}`;
  const dayOf = (ctx, d) => ctx.days.find(x => x.day === Number(d));
  const itemOf = (ctx, d, k) => dayOf(ctx, d)?.items.find(i => i.k === Number(k));

  function settle(ctx) {
    const rows = ctx.ledger.filter(r => r.status === "confirmed");
    const gr = Number(ctx.set.guide_rate);
    const guide = rows.filter(r => r.payer === "guide"), leader = rows.filter(r => r.payer === "leader");
    const guideRateLocal = guide.filter(r => r.method === "guide_rate" && r.currency !== "TWD" && !r.twd_manual);
    const localSub = guideRateLocal.reduce((a, r) => a + r.amount_local, 0);
    const guideOtherTwd = guide.filter(r => !guideRateLocal.includes(r)).reduce((a, r) => a + r.amount_twd, 0);
    const guideTwd = round(localSub / gr + guideOtherTwd);            // 小計才四捨五入，只捨入一次
    const leaderTwd = round(leader.reduce((a, r) => a + r.amount_twd, 0));
    const total = guideTwd + leaderTwd;
    const advance = Number(ctx.set.advance) || 0, petty = Number(ctx.set.petty_cash) || 0;
    const localTotal = rows.filter(r => r.currency !== "TWD").reduce((a, r) => a + r.amount_local, 0);
    return { rows, guide, leader, localSub, guideTwd, leaderTwd, total, advance, petty, available: advance + petty, balance: advance + petty - total, localTotal, gr };
  }

  function balanceText(ctx, b) {
    if (b > 0) return `領隊需退回 ${fmt(b)} 元給${ctx.set.company}`;
    if (b < 0) return `${ctx.set.company}需補給領隊 ${fmt(-b)} 元`;
    return "剛好打平 👌";
  }

  // 結算總表的列：依付款人分段，同一行程用同一個 No.
  function statementRows(ctx) {
    const s = settle(ctx), out = [];
    let no = 0;
    const desc = r => [r.vendor, r.content].filter(Boolean).join("｜");
    function section(rows, isGuide) {
      let lastKey = null;
      rows.forEach(r => {
        const key = r.day + ":" + r.item;
        const showNo = r.item == null || key !== lastKey;
        if (showNo) no++;
        lastKey = key;
        const gRate = isGuide && r.method === "guide_rate" && r.currency !== "TWD" && !r.twd_manual;
        out.push({ type: "item", no: showNo ? no : "", desc: desc(r), day: r.day, local: r.currency !== "TWD" ? r.amount_local : null, cur: r.currency, twd: gRate ? null : round(r.amount_twd), r });
      });
    }
    if (s.guide.length) {
      section(s.guide, true);
      out.push({ type: "sub", desc: `以上導遊代付，台幣匯率 ${rateText(ctx.set, s.gr)}`, local: s.localSub, twd: s.guideTwd });
    }
    if (s.leader.length) {
      section(s.leader, false);
      const ms = [...new Set(s.leader.map(r => METHOD[r.method]))].join("＋");
      out.push({ type: "sub", desc: `以上領隊${ms}`, local: null, twd: s.leaderTwd });
    }
    out.push({ type: "tot", desc: "總計", local: s.localTotal, twd: s.total });
    out.push({ type: "info", desc: `領隊領款（${ctx.set.company}）`, twd: s.advance });
    out.push({ type: "info", desc: "零用金", twd: s.petty });
    out.push({ type: "bal", desc: "結餘", twd: s.balance });
    return out;
  }

  // 明細依天、日期排序後的編號（Excel 支出明細的 No.，收據檔名也用它）
  function confirmedSorted(ctx) {
    return settle(ctx).rows.slice().sort((a, b) => (a.day || 99) - (b.day || 99) || String(a.spent_on).localeCompare(String(b.spent_on)) || a.id - b.id);
  }

  /* 產生 Excel（4 個工作表）。thumb(receipt) 回傳 { base64 或 buffer, extension, width, height } 或 null */
  async function buildWorkbook(ExcelJS, ctx, { thumb, exportedAt } = {}) {
    const s = settle(ctx), set = ctx.set, cur = set.currency;
    const wb = new ExcelJS.Workbook(); wb.creator = "領隊後台";
    const NAVY = "FF3F5A8A", YELLOW = "FFFFFF00", SUB = "FFF2F2F2";
    const head = row => row.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 }; c.alignment = { horizontal: "center", vertical: "middle" }; });
    const NUM = "#,##0", NUM2 = "#,##0.##", NEG = "#,##0;[Red]-#,##0";
    const when = exportedAt || new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });

    /* 工作表 1：結算總表 */
    const w1 = wb.addWorksheet("結算總表", { views: [{ showGridLines: false }] });
    w1.columns = [{ width: 7 }, { width: 46 }, { width: 16 }, { width: 14 }];
    w1.addRow([set.trip_name + "　領隊結算表"]).font = { bold: true, size: 15 };
    w1.addRow([`領隊：${set.leader || "—"}　導遊：${set.guide || "—"}　撥款單位：${set.company}　匯出：${when}`]).font = { size: 10, color: { argb: "FF7A6450" } };
    w1.addRow([]);
    head(w1.addRow(["No.", "Item Description", cur, "TWD"]));
    for (const x of statementRows(ctx)) {
      const row = w1.addRow([x.no || null, x.desc, x.local != null && x.local !== 0 ? x.local : null, x.twd]);
      row.getCell(3).numFmt = NUM2; row.getCell(4).numFmt = NEG;
      row.getCell(1).alignment = { horizontal: "right" };
      if (x.type === "item" && x.cur !== cur && x.local != null) row.getCell(3).numFmt = `#,##0.## "${x.cur}"`;
      if (x.type === "sub") row.eachCell({ includeEmpty: true }, c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUB } }; });
      if (x.type === "tot") row.eachCell({ includeEmpty: true }, c => { c.font = { bold: true, size: 12 }; c.border = { top: { style: "medium" } }; });
      if (x.type === "info" || x.type === "bal") { row.getCell(2).alignment = { horizontal: "right" }; row.getCell(2).font = { bold: true }; row.getCell(4).font = { bold: true }; }
      if (x.type === "bal") { const c = row.getCell(4); c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } }; c.font = { bold: true, size: 13, color: { argb: x.twd < 0 ? "FFE0452B" : "FF1F7A5C" } }; }
      row.eachCell({ includeEmpty: true }, c => { c.border = { ...(c.border || {}), bottom: { style: "hair", color: { argb: "FFDDDDDD" } } }; });
    }
    w1.addRow([]);
    w1.addRow(["", balanceText(ctx, s.balance)]).font = { bold: true, color: { argb: s.balance < 0 ? "FFE0452B" : "FF1F7A5C" } };
    w1.addRow([]); w1.addRow([]);
    w1.addRow(["", "領隊簽名：________________", "會計簽名：", "________"]);

    /* 工作表 2：支出明細 */
    const w2 = wb.addWorksheet("支出明細", { views: [{ state: "frozen", ySplit: 1 }] });
    const rateHd = set.rate_dir === "twd_per_local" ? `匯率（1 ${set.currency_name}＝? 台幣）` : `匯率（1 台幣＝? ${set.currency_name}）`;
    const cols2 = [["No.", 6], ["日期", 11], ["Day", 6], ["行程", 28], ["類別", 10], ["店家", 22], ["地點", 22], ["內容", 30], ["付款人", 11], ["付款方式", 15], ["幣別", 7], ["當地幣金額", 14], [rateHd, 18], ["台幣", 11], ["台幣手改", 9], ["收據張數", 9], ["備註", 24]];
    w2.columns = cols2.map(([h, w]) => ({ header: h, width: w }));
    head(w2.getRow(1));
    const confirmed = confirmedSorted(ctx);
    confirmed.forEach((r, i) => {
      const it = itemOf(ctx, r.day, r.item);
      const row = w2.addRow([i + 1, r.spent_on || "", r.day || "", it ? it.title : "", r.category, r.vendor, r.place, r.content, PAYER[r.payer].split(" ")[1], METHOD[r.method], r.currency, r.amount_local, r.currency === "TWD" ? 1 : rateToShow(set, r.rate), +r.amount_twd.toFixed(2), r.twd_manual ? "是" : "", r.receipts || 0, r.note]);
      row.getCell(12).numFmt = NUM2; row.getCell(14).numFmt = "#,##0.0";
    });
    const t2 = w2.addRow(["", "", "", "", "", "", "", "合計", "", "", "", null, null, s.total]);
    t2.font = { bold: true }; t2.getCell(14).numFmt = NUM;
    w2.autoFilter = { from: "A1", to: "Q1" };

    /* 工作表 3：依行程彙總 */
    const w3 = wb.addWorksheet("依行程彙總");
    w3.columns = [{ header: "Day", width: 7 }, { header: "日期", width: 11 }, { header: "行程", width: 36 }, { header: "筆數", width: 7 }, { header: cur, width: 15 }, { header: "台幣", width: 12 }];
    head(w3.getRow(1));
    const g3 = new Map();
    for (const r of confirmed) {
      const key = (r.day || 0) + ":" + (r.item ?? "");
      if (!g3.has(key)) g3.set(key, { day: r.day, item: r.item, n: 0, local: 0, twd: 0 });
      const g = g3.get(key); g.n++; if (r.currency !== "TWD") g.local += r.amount_local; g.twd += r.amount_twd;
    }
    for (const g of g3.values()) {
      const it = itemOf(ctx, g.day, g.item), d = dayOf(ctx, g.day);
      const row = w3.addRow([g.day || "", d ? d.date : "", it ? it.title : "（未指定行程）", g.n, g.local || null, round(g.twd)]);
      row.getCell(5).numFmt = NUM2; row.getCell(6).numFmt = NUM;
    }
    const t3 = w3.addRow(["", "", "合計（台幣為逐筆換算，與結算總表的導遊匯率捨入可能差 1 元）", confirmed.length, s.localTotal, round(confirmed.reduce((a, r) => a + r.amount_twd, 0))]);
    t3.font = { bold: true }; t3.getCell(5).numFmt = NUM2; t3.getCell(6).numFmt = NUM;

    /* 工作表 4：收據 */
    const w4 = wb.addWorksheet("收據");
    w4.columns = [{ header: "收據 #", width: 8 }, { header: "明細 No.", width: 9 }, { header: "店家", width: 22 }, { header: "金額", width: 16 }, { header: "圖片", width: 36 }];
    head(w4.getRow(1));
    const noOf = new Map(confirmed.map((r, i) => [r.id, i + 1]));
    const recs = ctx.receipts.slice().sort((a, b) => (noOf.get(a.ledger_id) || 999) - (noOf.get(b.ledger_id) || 999));
    const withImg = !!thumb && recs.length <= 80;
    let rIdx = 2;
    for (const rc of recs) {
      const l = ctx.ledger.find(x => x.id === rc.ledger_id);
      const row = w4.addRow([rc.id, noOf.get(rc.ledger_id) || (l ? "草稿" : "未入帳"), l?.vendor || "", l ? `${fmtLocal(l.amount_local)} ${l.currency}` : "", withImg ? "" : "（照片請看收據資料夾）"]);
      row.alignment = { vertical: "top" };
      if (withImg) {
        try {
          const t = await thumb(rc);
          if (t) {
            const img = wb.addImage(t.base64 ? { base64: t.base64, extension: t.extension } : { buffer: t.buffer, extension: t.extension });
            w4.addImage(img, { tl: { col: 4, row: rIdx - 1 }, ext: { width: t.width, height: t.height } });
            row.height = t.height * 0.75 + 6;
          }
        } catch {}
      }
      rIdx++;
    }
    return wb;
  }

  // 收據照片的檔名：明細編號_店家_收據編號.jpg（封存時用）
  function receiptFileName(ctx, rc) {
    const noOf = new Map(confirmedSorted(ctx).map((r, i) => [r.id, i + 1]));
    const l = ctx.ledger.find(x => x.id === rc.ledger_id);
    const no = noOf.get(rc.ledger_id);
    const ext = { "image/png": "png", "image/webp": "webp" }[rc.mime] || "jpg";
    const safe = s => String(s || "").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
    return `${no ? String(no).padStart(3, "0") : l ? "草稿" : "未入帳"}_${safe(l?.vendor) || "未命名"}_#${rc.id}.${ext}`;
  }

  root.LeaderLib = { PAYER, METHOD, fmt, fmtLocal, round, rateToShow, rateText, dayOf, itemOf, settle, balanceText, statementRows, confirmedSorted, buildWorkbook, receiptFileName };
})(typeof window !== "undefined" ? window : globalThis);
