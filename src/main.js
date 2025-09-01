/* OpenAstro API 代理端點 (必須走 Netlify Function) */
const OA_ENDPOINT = "/.netlify/functions/proxy";

const $ = (id) => document.getElementById(id);

const btn = $("go");
const tbl = $("tbl");
const tbody = $("tbody");
const errBox = $("error");
const statusBox = $("status");

btn.addEventListener("click", async () => {
  errBox.innerText = "";
  statusBox.innerText = "呼叫 OpenAstro API 中...";

  const lat = $("lat").value;
  const lng = $("lng").value;
  const date = $("date").value;
  const time = $("time").value;
  const tz = $("tz").value;

  const body = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    date: date,
    time: time,
    tz: tz,
  };

  try {
    const resp = await fetch(OA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error("API 回應錯誤: " + resp.status);

    const data = await resp.json();

    tbody.innerHTML = "";
    data.planets.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.degree.toFixed(2)}</td>
        <td>${p.sign}</td>
        <td>${p.house}</td>
      `;
      tbody.appendChild(tr);
    });

    statusBox.innerText = "完成 ✅";
  } catch (err) {
    console.error(err);
    errBox.innerText = "錯誤: " + err.message;
    statusBox.innerText = "初始化失敗";
  }
});
