export function getRatingColor(rating) {
  if (rating >= 8.5) return "var(--rating-top)";
  if (rating >= 7.5) return "var(--rating-high)";
  if (rating >= 6.0) return "var(--rating-mid)";
  if (rating >= 5.0) return "var(--rating-low)";
  return "var(--rating-bad)";
}

export function getStarsHTML(rating) {
  if (rating >= 8.5) return "★★★★★";
  if (rating >= 8.0) return "★★★★☆";
  if (rating >= 7.3) return "★★★☆☆";
  if (rating >= 6.5) return "★★☆☆☆";
  return "★☆☆☆☆";
}

export function getFlag(nation) {
  if (!nation || nation === "--") return "";
  if (nation === "INT") return `<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--warning)" style="vertical-align: middle; margin-right: 4px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;
  let lowerCode = nation.toLowerCase();
  
  // Mapeamentos Especiais (Reino Unido)
  if (lowerCode === "en") lowerCode = "gb-eng"; // Inglaterra
  if (lowerCode === "wa") lowerCode = "gb-wls"; // País de Gales
  if (lowerCode === "sc") lowerCode = "gb-sct"; // Escócia
  if (lowerCode === "ni") lowerCode = "gb-nir"; // Irlanda do Norte

  return `<img src="https://flagcdn.com/${lowerCode}.svg" width="16" height="12" style="vertical-align: middle; margin-right: 4px; border-radius: 2px; object-fit: cover;" alt="${nation}">`;
}

export function getFormArrowConfig(form) {
  const val = form !== undefined ? parseInt(form, 10) : 0;
  switch (val) {
    case 2:
      return { class: "form-up", char: "➔", text: "Excelente" };
    case 1:
      return { class: "form-good", char: "➔", text: "Boa" };
    case 0:
      return { class: "form-normal", char: "➔", text: "Normal" };
    case -1:
      return { class: "form-poor", char: "➔", text: "Ruim" };
    case -2:
      return { class: "form-down", char: "➔", text: "Péssima" };
    default:
      return { class: "form-normal", char: "➔", text: "Normal" };
  }
}

export function getFormHTML(form) {
  const conf = getFormArrowConfig(form);
  return `<span class="form-arrow ${conf.class}">${conf.char}</span>`;
}

export function getMatchStatusHTML(status) {
  if (status === "yellow")
    return `<div class="match-status-icon status-yellow" title="Amarelado"></div>`;
  if (status === "red")
    return `<div class="match-status-icon status-red" title="Suspenso"></div>`;
  if (status === "injury")
    return `<div class="match-status-icon status-injury" title="Lesionado">✚</div>`;
  return "";
}

export function getMatchStatusLabel(status) {
  const labels = {
    normal: "Apto para Jogo",
    yellow: "Amarelado (Risco)",
    red: "Suspenso",
    injury: "Lesionado",
  };
  return labels[status] || "Apto para Jogo";
}

export function drawRadar(canvasId, stats1, stats2 = null, isGK = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2,
    centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 25;

  const labels = isGK
    ? ["SAL", "MAN", "REP", "REF", "VEL", "POS", "FÔL"]
    : ["VEL", "FIN", "PAS", "DRI", "DEF", "FÍS", "FÔL"];
  const SIDES = labels.length;

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  for (let level = 1; level <= 5; level++) {
    ctx.beginPath();
    for (let i = 0; i < SIDES; i++) {
      const angle = (Math.PI * 2 * i) / SIDES - Math.PI / 2;
      const r = radius * (level / 5);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.fillStyle = "#888";
  ctx.font = "bold 10px Inter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < SIDES; i++) {
    const angle = (Math.PI * 2 * i) / SIDES - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    );
    ctx.stroke();
    ctx.fillText(
      labels[i],
      centerX + Math.cos(angle) * (radius + 15),
      centerY + Math.sin(angle) * (radius + 15),
    );
  }

  const getVals = (s) =>
    isGK
      ? [
          s.sal || s.div || s.def || 75,
          s.man || s.han || s.def || 75,
          s.rep || s.kic || s.pas || 60,
          s.ref || s.def || 75,
          s.vel || s.spd || s.pac || 40,
          s.pos || s.def || 75,
          s.sta || s.stm || 50,
        ].map((v) => v / 100)
      : [
          s.vel || s.pac || s.spd || 50,
          s.fin || s.sho || s.atk || 50,
          s.pas || 50,
          s.dri || s.atk || 50,
          s.def || 50,
          s.fis || s.phy || s.str || 50,
          s.sta || s.stm || 75,
        ].map((v) => v / 100);

  const drawPolygon = (playerStats, fillColor, strokeColor) => {
    const values = getVals(playerStats);
    ctx.beginPath();
    for (let i = 0; i < SIDES; i++) {
      const angle = (Math.PI * 2 * i) / SIDES - Math.PI / 2;
      const r = radius * values[i];
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  if (stats2) drawPolygon(stats2, "rgba(255, 77, 77, 0.4)", "#ff4d4d");
  drawPolygon(stats1, "rgba(0, 255, 136, 0.4)", "#00ff88");
}

export function renderStatsNumbers(stats1, stats2 = null, isGK = false) {
  const container = document.getElementById("statsNumbers");
  if (!container) return;
  container.innerHTML = "";

  const labels = isGK
    ? [
        { key: "sal", fallback: "div", name: "SAL" },
        { key: "man", fallback: "han", name: "MAN" },
        { key: "rep", fallback: "kic", name: "REP" },
        { key: "ref", fallback: "ref", name: "REF" },
        { key: "vel", fallback: "spd", name: "VEL" },
        { key: "pos", fallback: "pos", name: "POS" },
        { key: "sta", fallback: "stm", name: "FÔL" },
      ]
    : [
        { key: "vel", fallback: "pac", name: "VEL" },
        { key: "fin", fallback: "sho", name: "FIN" },
        { key: "pas", fallback: "pas", name: "PAS" },
        { key: "dri", fallback: "dri", name: "DRI" },
        { key: "def", fallback: "def", name: "DEF" },
        { key: "fis", fallback: "phy", name: "FÍS" },
        { key: "sta", fallback: "stm", name: "FÔL" },
      ];

  const s1 = stats1 || {};

  labels.forEach((l) => {
    let defVal = 50;
    if (isGK) {
      if (['sal', 'man', 'ref', 'pos'].includes(l.key)) defVal = 75;
      else if (l.key === 'rep') defVal = 60;
      else if (l.key === 'vel') defVal = 40;
      else if (l.key === 'sta') defVal = 50;
    } else {
      if (l.key === 'sta') defVal = 75;
    }
    const v1 = s1[l.key] || s1[l.fallback] || defVal;
    let p2Html = "",
      vsHtml = "",
      classV1 = "";

    if (stats2) {
      const v2 = stats2[l.key] || stats2[l.fallback] || defVal;
      let classV2 = "";
      if (v1 > v2) {
        classV1 = "winner";
        classV2 = "loser";
      } else if (v2 > v1) {
        classV1 = "loser";
        classV2 = "winner";
      } else {
        classV1 = "tie";
        classV2 = "tie";
      }
      p2Html = `<div class="stat-val p2 ${classV2}">${v2}</div>`;
      vsHtml = `<div class="stat-vs">VS</div>`;
    }
    container.innerHTML += `<div class="stat-row"><div class="stat-name">${l.name}</div><div class="stat-bar-container"><div class="stat-val p1 ${classV1}">${v1}</div>${vsHtml}${p2Html}</div></div>`;
  });
}
