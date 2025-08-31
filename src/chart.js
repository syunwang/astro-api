// src/chart.js
// 繪製星盤輪盤與行星位置

export function drawWheel(canvas, planets, options={}){
  if (!canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const R = Math.min(W,H)/2 - 30;
  const CX = W/2, CY = H/2;

  ctx.clearRect(0,0,W,H);

  // 外圓
  ctx.beginPath();
  ctx.arc(CX,CY,R,0,Math.PI*2);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 繪製十二宮（每 30° 一格）
  ctx.save();
  ctx.translate(CX,CY);
  for (let i=0;i<12;i++){
    const ang = (i*30 - 90) * Math.PI/180;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(R*Math.cos(ang), R*Math.sin(ang));
    ctx.strokeStyle = '#333';
    ctx.stroke();

    // 星座名稱
    ctx.save();
    ctx.rotate(ang + Math.PI/12); // 放在每格中間
    ctx.fillStyle = '#aaa';
    ctx.font = "14px sans-serif";
    const label = ["Ar","Ta","Ge","Cn","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi"][i];
    ctx.fillText(label, R-28, 4);
    ctx.restore();
  }
  ctx.restore();

  // 繪製宮位（如果有傳入 cusps）
  if (options.cusps){
    ctx.save();
    ctx.translate(CX,CY);
    for (let i=1;i<=12;i++){
      const lon = options.cusps[i];
      const ang = (lon-90) * Math.PI/180;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(R*Math.cos(ang), R*Math.sin(ang));
      ctx.strokeStyle = '#555';
      ctx.stroke();

      // 標示宮位號碼
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = '#f5f5f5';
      ctx.font = "12px sans-serif";
      ctx.fillText(i.toString(), R-50, -2);
      ctx.restore();
    }
    ctx.restore();
  }

  // 繪製行星點
  ctx.save();
  ctx.translate(CX,CY);
  planets.forEach(p=>{
    const ang = (p.lon - 90) * Math.PI/180;
    const x = (R-20)*Math.cos(ang);
    const y = (R-20)*Math.sin(ang);
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fillStyle = '#e85dff';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = "12px sans-serif";
    ctx.fillText(p.label, x+6, y-6);
  });
  ctx.restore();
}
