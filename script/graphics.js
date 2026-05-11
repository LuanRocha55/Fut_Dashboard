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
    ? ["alc", "seg", "esp", "REF", "VEL", "POS", "FÔL"]
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
        { key: "alc", fallback: "div", name: "alc" },
        { key: "seg", fallback: "han", name: "seg" },
        { key: "esp", fallback: "kic", name: "esp" },
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

export function getTeamLogoHTML(teamName) {
  if (!teamName) return "";
  const normalized = teamName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const teamColors = {
    cruzeiro: { c: "#003aa6", b: "#005ce6" },
    internacional: { c: "#cc0000", b: "#ff3333" },
    gremio: { c: "#0d80bf", b: "#1a9cf0" },
    "atletico mineiro": { c: "#111111", b: "#444444" },
    flamengo: { c: "#c62828", b: "#ff5252" },
    fluminense: { c: "#8a1538", b: "#b81c4a" },
    botafogo: { c: "#111111", b: "#444444" },
    "athletico-pr": { c: "#c8102e", b: "#f01438" },
    fortaleza: { c: "#002868", b: "#003c9c" },
    bahia: { c: "#004c97", b: "#0066cc" },
    vitoria: { c: "#cc0000", b: "#ff3333" },
    coritiba: { c: "#005f31", b: "#008c48" },
    goias: { c: "#006e33", b: "#009947" },
    criciuma: { c: "#d1ab00", b: "#ffdb29" },
    "sport recife": { c: "#cc0000", b: "#ff3333" },
    ceara: { c: "#111111", b: "#444444" },
    juventude: { c: "#006437", b: "#009954" },
    bragantino: { c: "#111111", b: "#444444" },
    santos: { c: "#111111", b: "#444444" },
    "ponte preta": { c: "#111111", b: "#444444" },
    "vasco da gama": { c: "#111111", b: "#444444" },
    palmeiras: { c: "#006437", b: "#009954" },
    "sao paulo": { c: "#c62828", b: "#ff5252" },
    corinthians: { c: "#111111", b: "#444444" },
    "real madrid": { c: "#00529f", b: "#0073e0" },
    barcelona: { c: "#004d98", b: "#a50044" },
    "manchester city": { c: "#6cabdd", b: "#98cbf5" },
    "bayern de munique": { c: "#dc052d", b: "#ff1c47" },
    psg: { c: "#004170", b: "#005a9c" },
    arsenal: { c: "#ef0107", b: "#ff3338" },
    liverpool: { c: "#c8102e", b: "#f01438" },
    chelsea: { c: "#034694", b: "#0563d1" },
    tottenham: { c: "#132257", b: "#1d3485" },
    juventus: { c: "#111111", b: "#444444" },
    "inter milan": { c: "#00519e", b: "#0072de" },
    "ac milan": { c: "#c8102e", b: "#f01438" },
    "bayer leverkusen": { c: "#e32221", b: "#ff4746" },
    "borussia dortmund": { c: "#e6c600", b: "#ffe233" },
    "rb leipzig": { c: "#dd013f", b: "#ff1c5d" },
    "aston villa": { c: "#670e36", b: "#94144e" },
    newcastle: { c: "#111111", b: "#444444" },
    "west ham": { c: "#7a263a", b: "#a83550" },
    brighton: { c: "#0057b8", b: "#007bff" },
    napoli: { c: "#00a9e0", b: "#33c4ff" },
    roma: { c: "#8e1f2f", b: "#bc293e" },
    atalanta: { c: "#2651a8", b: "#3b73e6" },
    lazio: { c: "#87ceeb", b: "#b5e5ff" },
    fiorentina: { c: "#482e92", b: "#6a45cf" },
  };

  let color, borderCol;
  if (teamColors[normalized]) {
    color = teamColors[normalized].c;
    borderCol = teamColors[normalized].b;
  } else {
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
      hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    color = `hsl(${hue}, 60%, 40%)`;
    borderCol = `hsl(${hue}, 70%, 60%)`;
  }

  const words = teamName.trim().split(/\s+/);
  const initials = (
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : teamName.substring(0, 2)
  ).toUpperCase();

  return `<div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, ${color}, #111); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 900; border: 1px solid ${borderCol}; box-shadow: 0 2px 4px rgba(0,0,0,0.5); flex-shrink: 0;" title="${teamName}">${initials}</div>`;
}
