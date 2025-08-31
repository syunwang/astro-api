/* OpenAstro 直連端點（預設） */
const OA_ENDPOINT = "https://api.openastro.io/chart";

/* 如果某些環境遇到 CORS，可把上面那行註解，改用這個備援（免費公共 CORS 代理）：
   ⚠ 公共代理的可用性不保證，僅供測試
*/
// const OA_ENDPOINT = "https://cors.isomorphic-git.org/https://api.openastro.io/chart";

const $ = (id) => document.getElementById(id);

const btn = $("go");
const tbl = $("tbl");
const tbody = $("tbody");
const errBox = $("error");
const statusBox = $("status");

btn.addEventListener("click", async () => {
  errBox.textContent = "";
  statusBox.textContent = "";
  tbl.style.display = "none";
  tbody.innerHTML = "";

  try {
    btn.disabled = true;
    statusBox.textContent = "呼叫 OpenAstro API 中…";

    const { year, month, day } = parseDate($("date").value.trim());
    const { hour, minute } = parseTime($("time").value.trim());

    const payload = {
      year,
      month,
      day,
      hour,
      minute,
      lat: parseFloat($("lat").value),
      lon: parseFloat($("lon").value),
      tz: parseTz($("tz").value.trim()) // 可輸入 "+08:00" 或 "8"
    };

    ensureNumbers(payload);

    const res = await fetch(OA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`API ${res.status}: ${t || "Unknown error"}`);
    }

    const data = await res.json();

    // 期望結構：data.planets, data.ascendant, data.houses ...
    if (!data || !data.planets) {
      console.debug("OpenAstro 回傳：", data);
      throw new Error("回傳中找不到 planets 欄位");
    }

    const planets = data.planets;

    // 只列幾個常見本體，可依需求擴充
    const order = [
      "Sun", "Moon", "Mercury", "Venus", "Mars",
      "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
      "True Node", "Chiron", "Ascendant", "MC"
    ];

    const rows = [];
    for (const name of order) {
      const p = planets[name] || data[name] || null; // 有些 API 會把 Ascendant/MC 放外層
      if (!p) continue;

      rows.push({
        name,
        lon: toFixedSafe(p.lon, 4),
        lat: toFixedSafe(p.lat ?? 0, 4),
        note: ""
      });
    }

    // 補上 Asc/MC（若上面沒抓到）
    if (!rows.find(r => r.name === "Ascendant") && typeof data.ascendant === "number") {
      rows.push({ name: "Ascendant", lon: toFixedSafe(data.ascendant, 4), lat: "", note: "" });
    }
    if (!rows.find(r => r.name === "MC") && typeof data.mc === "number") {
      rows.push({ name: "MC", lon: toFixedSafe(data.mc, 4), lat: "", note: "" });
    }

    // 若 rows 還是空，回傳全部 planets
    if (!rows.length) {
      for (const [k, v] of Object.entries(planets)) {
        rows.push({ name: k, lon: toFixedSafe(v.lon, 4), lat: toFixedSafe(v.lat ?? 0, 4), note: "" });
      }
    }

    // render
    tbody.innerHTML = rows.map(r => (
      `<tr>
        <td>${esc(r.name)}</td>
        <td>${esc(r.lon)}</td>
        <td>${esc(r.lat)}</td>
        <td class="muted">${esc(r.note)}</td>
      </tr>`
    )).join("");

    tbl.style.display = "";
    statusBox.innerHTML = `<span class="ok">OK · 已取得 ${rows.length} 筆行星/點位</span>`;
  } catch (e) {
    console.error(e);
    errBox.textContent = `初始化失敗：${e.message || e}`;
  } finally {
    btn.disabled = false;
  }
});

/* ---------- 工具 ---------- */

function parseDate(s) {
  // 支援 1958/01/07 或 1958-01-07
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!m) throw new Error("日期格式錯誤，請用 YYYY/MM/DD");
  return { year: +m[1], month: +m[2], day: +m[3] };
}
function parseTime(s) {
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) throw new Error("時間格式錯誤，請用 HH:MM（24小時制）");
  return { hour: +m[1], minute: +m[2] };
}
function parseTz(s) {
  // "+08:00" -> 8, "-05:30" -> -5.5, "8" -> 8
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) return +s;
  const m = s.match(/^([+-])(\d{1,2}):?(\d{2})$/);
  if (!m) throw new Error("UTC 偏移格式錯誤，例：+08:00 或 -05:30 或 8");
  const sign = m[1] === "-" ? -1 : 1;
  const hh = +m[2], mm = +m[3];
  return sign * (hh + mm/60);
}
function ensureNumbers(p) {
  ["lat","lon","year","month","day","hour","minute","tz"].forEach(k=>{
    if (Number.isNaN(p[k])) throw new Error(`${k} 不是有效數字`);
  });
}
function toFixedSafe(v, n){ return (v===null||v===undefined||Number.isNaN(v)) ? "" : (+v).toFixed(n); }
function esc(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
