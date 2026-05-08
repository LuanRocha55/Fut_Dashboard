import {
  squad,
  formations,
  activePlayerId,
  ALL_POSITIONS,
  initSystem,
  performSwap,
  updatePlayerData,
  downloadJSON,
  resetData,
  setActivePlayerId,
  resetFormationAlignment,
  calculateOVR,
  syncRealData,
  addNewPlayer,
  removePlayer,
  saveToLocal,
  matchInfo,
} from "./core.js";

import {
  getEfootballPosition,
  checkPositionFit,
  swapTitulares,
  handlePlayerMove,
  autoFillTeam,
} from "./tactics.js";

let isEditMode = false;
let isTableView = false;
let tableSortCol = "rating";
let tableSortDesc = true;

// Utilitário para polimento de busca (Ignora acentos)
const normalizeStr = (str) => {
  return str
    ? str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";
};

// =========================================================
// Modal Customizado (Substitui confirm, alert e prompt feios)
// =========================================================
function showCustomModal(
  message,
  type = "confirm",
  confirmClass = "btn-primary",
) {
  return new Promise((resolve) => {
    const modal = document.getElementById("customModal");
    const msgEl = document.getElementById("customModalMessage");
    const inputEl = document.getElementById("customModalInput");
    const btnOk = document.getElementById("customModalOk");
    const btnCancel = document.getElementById("customModalCancel");

    msgEl.innerText = message;
    btnOk.className = confirmClass;
    inputEl.value = "";

    if (type === "prompt") {
      inputEl.style.display = "block";
      btnCancel.style.display = "block";
      setTimeout(() => inputEl.focus(), 100);
    } else if (type === "alert") {
      inputEl.style.display = "none";
      btnCancel.style.display = "none";
    } else {
      // confirm padrão
      inputEl.style.display = "none";
      btnCancel.style.display = "block";
    }

    const cleanup = () => {
      modal.classList.remove("show");
      setTimeout(() => {
        btnOk.onclick = null;
        btnCancel.onclick = null;
      }, 300);
    };

    btnOk.onclick = () => {
      cleanup();
      resolve(type === "prompt" ? inputEl.value : true);
    };
    btnCancel.onclick = () => {
      cleanup();
      resolve(type === "prompt" ? null : false);
    };

    modal.classList.add("show");
  });
}

const PLAYSTYLES = {
  GL: ["Goleiro Defensivo", "Goleiro Ofensivo"],
  ZE: [
    "Defensor Criativo",
    "Zagueiro Destruidor",
    "Zagueiro Rebatedor",
    "Atacante Extra",
  ],
  ZD: [
    "Defensor Criativo",
    "Zagueiro Destruidor",
    "Zagueiro Rebatedor",
    "Atacante Extra",
  ],
  LE: [
    "Lateral Ofensivo",
    "Lateral Defensivo",
    "Especialista Cruzamento",
    "Lateral Invertido",
  ],
  LD: [
    "Lateral Ofensivo",
    "Lateral Defensivo",
    "Especialista Cruzamento",
    "Lateral Invertido",
  ],
  VOL: ["Primeiro Volante", "Cão de Guarda", "Orquestrador", "Motorzinho"],
  MC: ["Orquestrador", "Infiltrador", "Meia Versátil", "Motorzinho"],
  ME: ["Ala Veloz", "Especialista Cruzamento", "Meia de Ligação", "Falso Ala"],
  MD: ["Ala Veloz", "Especialista Cruzamento", "Meia de Ligação", "Falso Ala"],
  MEI: [
    "Armador Criativo",
    "Clássico Nº 10",
    "Infiltrador",
    "Jogador de Buraco",
  ],
  PE: [
    "Ponta Prolífico",
    "Ala Veloz",
    "Atacante de Infiltração",
    "Armador Criativo",
  ],
  PD: [
    "Ponta Prolífico",
    "Ala Veloz",
    "Atacante de Infiltração",
    "Armador Criativo",
  ],
  SA: ["Atacante de Infiltração", "Falso 9", "Armador Criativo", "Engodo"],
  CA: ["Artilheiro", "Homem de Referência", "Caçador de Gols", "Falso 9"],
};

function updatePlaystyleOptions(primaryPos, currentPlaystyle) {
  const select = document.getElementById("editPlaystyleInput");
  if (!select) return;
  select.innerHTML = "";
  const options = PLAYSTYLES[primaryPos] || ["Sem Estilo"];

  // Impede que o jogador perca um estilo antigo se não estiver na lista padrão
  if (currentPlaystyle && !options.includes(currentPlaystyle)) {
    options.unshift(currentPlaystyle);
  }

  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = opt;
    optionEl.innerText = opt;
    select.appendChild(optionEl);
  });
  select.value = currentPlaystyle || options[0];
}

function getRatingColor(rating) {
  if (rating >= 8.5) return "var(--rating-top)";
  if (rating >= 7.5) return "var(--rating-high)";
  if (rating >= 6.0) return "var(--rating-mid)";
  if (rating >= 5.0) return "var(--rating-low)";
  return "var(--rating-bad)";
}

function getStarsHTML(rating) {
  if (rating >= 8.5) return "★★★★★";
  if (rating >= 8.0) return "★★★★☆";
  if (rating >= 7.3) return "★★★☆☆";
  if (rating >= 6.5) return "★★☆☆☆";
  return "★☆☆☆☆";
}

function getFlag(nation) {
  if (!nation || nation === "--") return "";
  if (nation === "INT") return "🌍 ";
  const lowerCode = nation.toLowerCase();
  return `<img src="https://flagcdn.com/${lowerCode}.svg" width="16" height="12" style="vertical-align: middle; margin-right: 4px; border-radius: 2px; object-fit: cover;" alt="${nation}">`;
}

function getFormArrowConfig(form) {
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
function getFormHTML(form) {
  const conf = getFormArrowConfig(form);
  return `<span class="form-arrow ${conf.class}">${conf.char}</span>`;
}

function getMatchStatusHTML(status) {
  if (status === "yellow")
    return `<div class="match-status-icon status-yellow" title="Amarelado"></div>`;
  if (status === "red")
    return `<div class="match-status-icon status-red" title="Suspenso"></div>`;
  if (status === "injury")
    return `<div class="match-status-icon status-injury" title="Lesionado">✚</div>`;
  return "";
}
function getMatchStatusLabel(status) {
  const labels = {
    normal: "Apto para Jogo",
    yellow: "Amarelado (Risco)",
    red: "Suspenso",
    injury: "Lesionado",
  };
  return labels[status] || "Apto para Jogo";
}

function highlightZones(player) {
  const pitch = document.getElementById("pitch");
  pitch.classList.add("active-selection");
  document.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.classList.remove("highlight", "primary", "secondary");
    cell.style.boxShadow = "";
  });
  if (player.aptitude) {
    player.aptitude.forEach((pos, index) => {
      const cell = document.querySelector(`[data-pos="${pos}"]`);
      if (cell) {
        cell.classList.add("highlight");
        if (index === 0) cell.style.boxShadow = "inset 0 0 20px var(--accent)";
      }
    });
  }
}

function clearZones() {
  const pitch = document.getElementById("pitch");
  if (pitch) {
    pitch.classList.remove("active-selection");
    pitch.classList.remove("drag-over");
  }
}

function drawRadar(canvasId, stats1, stats2 = null, isGK = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2,
    centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 25;

  // 6 Atributos Dinâmicos (Linha vs Goleiro)
  const labels = isGK
    ? ["SAL", "MAN", "REP", "REF", "VEL", "POS"]
    : ["VEL", "FIN", "PAS", "DRI", "DEF", "FÍS"];
  const SIDES = 6; // Mudança para Hexágono

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

  // Função segura de captura de status compatível com os dados do antigo data.json
  const getVals = (s) =>
    isGK
      ? [
          s.sal || s.div || s.def || 75, // Salto
          s.man || s.han || s.def || 75, // Manejo
          s.rep || s.kic || s.pas || 60, // Reposição
          s.ref || s.def || 75, // Reflexo
          s.vel || s.spd || s.pac || 40, // Velocidade
          s.pos || s.def || 75, // Posicionamento
        ].map((v) => v / 100)
      : [
          s.vel || s.pac || s.spd || 50,
          s.fin || s.sho || s.atk || 50,
          s.pas || 50,
          s.dri || s.atk || 50,
          s.def || 50,
          s.fis || s.phy || s.str || 50,
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

function renderStatsNumbers(stats1, stats2 = null, isGK = false) {
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
      ]
    : [
        { key: "vel", fallback: "pac", name: "VEL" },
        { key: "fin", fallback: "sho", name: "FIN" },
        { key: "pas", fallback: "pas", name: "PAS" },
        { key: "dri", fallback: "dri", name: "DRI" },
        { key: "def", fallback: "def", name: "DEF" },
        { key: "fis", fallback: "phy", name: "FÍS" },
      ];

  const s1 = stats1 || {};

  labels.forEach((l) => {
    const v1 = s1[l.key] || s1[l.fallback] || 50;
    let p2Html = "";
    let vsHtml = "";
    let classV1 = "";

    if (stats2) {
      const v2 = stats2[l.key] || stats2[l.fallback] || 50;
      let classV2 = "";

      // Lógica de Destaque
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
    container.innerHTML += `
      <div class="stat-row">
        <div class="stat-name">${l.name}</div>
        <div class="stat-bar-container">
          <div class="stat-val p1 ${classV1}">${v1}</div>
          ${vsHtml}
          ${p2Html}
        </div>
      </div>`;
  });
}

function setEditMode(enable) {
  isEditMode = enable;
  const playerView = document.getElementById("playerView");
  const toggleBtn = document.getElementById("toggleEditBtn");

  playerView.className = enable ? "edit-mode" : "view-mode";
  toggleBtn.className = enable
    ? "badge-btn badge-btn-danger"
    : "badge-btn badge-btn-dark";
  toggleBtn.innerText = enable ? "CANCELAR EDIÇÃO" : "EDITAR";
  document.getElementById("editPositions").style.pointerEvents = enable
    ? "auto"
    : "none";
  document.getElementById("editPositions").style.opacity = enable ? "1" : "0.5";
}

async function openMenu(id) {
  // Proteção contra perda de dados ao trocar de jogador durante a edição
  if (isEditMode && id !== activePlayerId) {
    const proceed = await showCustomModal(
      "Você tem edições em andamento. Deseja descartar e abrir outro jogador?",
      "confirm",
      "btn-primary",
    );
    if (!proceed) return;
  }

  setActivePlayerId(id);
  const p = squad.find((x) => x.id === id);
  if (!p) return;

  highlightZones(p);
  document.getElementById("teamView").style.display = "none";
  document.getElementById("playerView").style.display = "flex";
  document.getElementById("editNameInput").value = p.name;
  document.getElementById("editRatingInput").value = p.rating;
  document.getElementById("editAgeInput").value = p.age || 25;
  document.getElementById("editFootInput").value = p.foot || "Destro";
  document.getElementById("editCaptainInput").checked = !!p.captain;
  document.getElementById("editNationInput").value = p.nationality || "BR";

  // Spans do Modo Leitura
  document.getElementById("viewName").innerText = p.name;
  document.getElementById("viewRating").innerText = p.rating.toFixed(1);
  document.getElementById("viewRating").style.color = getRatingColor(p.rating);
  document.getElementById("viewAge").innerText = p.age || 25;
  document.getElementById("viewFoot").innerText = p.foot || "Destro";
  const nat = p.nationality || "BR";
  document.getElementById("viewNation").innerHTML = `${getFlag(nat)}${nat}`;
  document.getElementById("viewNation").style.display = "flex";
  document.getElementById("viewNation").style.alignItems = "center";
  document.getElementById("viewPlaystyle").innerText = p.playstyle || "--";
  document.getElementById("viewCaptain").innerText = p.captain
    ? "⭐ CAPITÃO DA EQUIPE"
    : "";

  // Injeta os estilos de jogo baseados na Posição Primária dele
  const mainPos = p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "CA";
  updatePlaystyleOptions(mainPos, p.playstyle);

  // Live Events
  const mStatus = p.matchStatus || "normal";
  document.getElementById("viewMatchStatus").innerHTML =
    `${getMatchStatusHTML(mStatus)} ${getMatchStatusLabel(mStatus)}`;
  document.getElementById("editMatchStatusInput").value = mStatus;

  // Condição e Sliders de Atributos
  document.getElementById("viewForm").innerHTML =
    getFormHTML(p.form) +
    " <span style='font-size:0.8rem; color:#888;'>" +
    getFormArrowConfig(p.form).text +
    "</span>";
  document.getElementById("editFormInput").value =
    p.form !== undefined ? p.form : "0";

  const isGK = p.aptitude && p.aptitude[0] === "GL";
  const pStats = p.stats || {
    vel: 50,
    fin: 50,
    pas: 50,
    dri: 50,
    def: 50,
    fis: 50,
  };

  const sliderContainer = document.getElementById("editSlidersContainer");
  if (sliderContainer) {
    sliderContainer.innerHTML = "";
    const statKeys = isGK
      ? [
          { key: "sal", label: "SAL" },
          { key: "man", label: "MAN" },
          { key: "rep", label: "REP" },
          { key: "ref", label: "REF" },
          { key: "vel", label: "VEL" },
          { key: "pos", label: "POS" },
        ]
      : [
          { key: "vel", label: "VEL" },
          { key: "fin", label: "FIN" },
          { key: "pas", label: "PAS" },
          { key: "dri", label: "DRI" },
          { key: "def", label: "DEF" },
          { key: "fis", label: "FÍS" },
        ];

    const getFallback = (key) => {
      if (pStats[key] !== undefined) return pStats[key];
      if (isGK) {
        const fb = {
          sal: pStats.div || pStats.def || 75,
          man: pStats.han || pStats.def || 75,
          rep: pStats.kic || pStats.pas || 60,
          ref: pStats.ref || pStats.def || 75,
          vel: pStats.spd || pStats.pac || 40,
          pos: pStats.pos || pStats.def || 75,
        };
        return fb[key] !== undefined ? fb[key] : 75;
      }
      const fb = {
        vel: pStats.pac || pStats.spd || 50,
        fin: pStats.sho || pStats.atk || 50,
        pas: pStats.pas || 50,
        dri: pStats.dri || pStats.atk || 50,
        def: pStats.def || 50,
        fis: pStats.phy || pStats.str || 50,
      };
      return fb[key] !== undefined ? fb[key] : 50;
    };

    statKeys.forEach((s) => {
      const val = getFallback(s.key);
      sliderContainer.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.7rem; font-weight: bold; width: 30px; color: #888;">${s.label}</span>
                <input type="range" id="slider_${s.key}" min="1" max="99" value="${val}" style="flex: 1;">
                <span id="val_${s.key}" style="font-size: 0.8rem; font-weight: bold; width: 25px; text-align: center; color: var(--accent);">${val}</span>
            </div>`;
    });

    // Animação Live dos Sliders e Condição
    const updateLiveOVR = () => {
      const newStats = {};
      statKeys.forEach(
        (s) =>
          (newStats[s.key] = parseInt(
            document.getElementById(`slider_${s.key}`).value,
            10,
          )),
      );

      const compId = document.getElementById("compareSelect").value;
      const p2 = compId
        ? squad.find((x) => x.id === parseInt(compId, 10))
        : null;
      const s2 = p2 ? p2.stats || {} : null;

      drawRadar("radarChart", newStats, s2, isGK);
      renderStatsNumbers(newStats, s2, isGK);

      const formVal = parseInt(
        document.getElementById("editFormInput").value,
        10,
      );
      const newOvr = calculateOVR(newStats, formVal, isGK);
      document.getElementById("viewRating").innerText = newOvr.toFixed(1);
      document.getElementById("viewRating").style.color =
        getRatingColor(newOvr);
      document.getElementById("editRatingInput").value = newOvr.toFixed(1);
    };

    statKeys.forEach((s) => {
      document.getElementById(`slider_${s.key}`).oninput = (e) => {
        document.getElementById(`val_${s.key}`).innerText = e.target.value;
        updateLiveOVR();
      };
    });

    // Adiciona o gatilho para atualizar a nota quando mudar a "Condição"
    document.getElementById("editFormInput").onchange = updateLiveOVR;
  }

  setEditMode(false);

  const compareSelect = document.getElementById("compareSelect");
  compareSelect.innerHTML =
    '<option value="">-- Nenhum (Apenas Visualizar) --</option>';
  squad
    .filter((x) => x.id !== id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((pObj) => {
      const opt = document.createElement("option");
      opt.value = pObj.id;
      opt.innerText = pObj.name;
      compareSelect.appendChild(opt);
    });
  compareSelect.value = "";

  drawRadar("radarChart", pStats, null, isGK);
  renderStatsNumbers(pStats, null, isGK);

  const posContainer = document.getElementById("editPositions");
  posContainer.innerHTML = "";
  ALL_POSITIONS.forEach((pos) => {
    const chip = document.createElement("div");
    chip.className = "pos-chip";
    chip.innerText = pos;
    if (p.aptitude && p.aptitude.includes(pos)) chip.classList.add("primary");
    chip.onclick = () => {
      if (!isEditMode) return;
      if (!p.aptitude) p.aptitude = [];
      const existingIdx = p.aptitude.indexOf(pos);
      if (existingIdx > -1) {
        p.aptitude.splice(existingIdx, 1);
        chip.classList.remove("primary");
      } else {
        p.aptitude.push(pos);
        chip.classList.add("primary");
      }

      // Se ele alterar a posição do jogador, atualiza as opções do Select em tempo real
      const newMainPos =
        p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "CA";
      const currentSelectedStyle =
        document.getElementById("editPlaystyleInput").value;
      updatePlaystyleOptions(newMainPos, currentSelectedStyle);
    };
    posContainer.appendChild(chip);
  });
}

async function closeMenu() {
  // Proteção contra clique no botão de fechar durante a edição
  if (isEditMode) {
    const proceed = await showCustomModal(
      "Você tem edições em andamento. Deseja sair sem salvar?",
      "confirm",
      "btn-primary",
    );
    if (!proceed) return;
  }
  document.getElementById("playerView").style.display = "none";
  document.getElementById("teamView").style.display = "flex";
  clearZones();
  setActivePlayerId(null);
}

function renderHighlights() {
  const container = document.getElementById("squadHighlights");
  if (!container) return;
  container.innerHTML = "";

  const statsConfig = [
    { key: "vel", fallback: "pac", label: "Mais Rápido (VEL)" },
    { key: "fin", fallback: "sho", label: "Artilheiro (FIN)" },
    { key: "pas", fallback: "pas", label: "Garçom (PAS)" },
    { key: "dri", fallback: "dri", label: "Liso (DRI)" },
    { key: "def", fallback: "def", label: "Xerife (DEF)" },
    { key: "fis", fallback: "phy", label: "Trator (FÍS)" },
  ];

  statsConfig.forEach((stat) => {
    let topPlayer = null;
    let maxVal = -1;

    squad.forEach((p) => {
      const val = p.stats
        ? p.stats[stat.key] || p.stats[stat.fallback] || 50
        : 50;
      if (val > maxVal) {
        maxVal = val;
        topPlayer = p;
      }
    });

    if (topPlayer) {
      const card = document.createElement("div");
      card.className = "highlight-card";
      card.innerHTML = `
        <span class="highlight-card-title">${stat.label}</span>
        <strong class="highlight-card-name">${topPlayer.name}</strong>
        <span class="highlight-card-val">${maxVal}</span>
      `;
      card.onclick = () => {
        document.getElementById("toggleViewBtn").click();
        openMenu(topPlayer.id);
      };
      container.appendChild(card);
    }
  });
}

function renderTable() {
  const tbody = document.getElementById("rosterTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  renderHighlights();

  // Atualiza os ícones do cabeçalho da tabela
  document.querySelectorAll(".sortable").forEach((th) => {
    th.classList.remove("asc", "desc");
    if (th.dataset.sort === tableSortCol) {
      th.classList.add(tableSortDesc ? "desc" : "asc");
    }
  });

  // Filtros
  const searchTerm = normalizeStr(
    document.getElementById("tableSearchInput")?.value,
  );
  const posFilter = document.getElementById("tablePosFilter")?.value || "";

  let filteredPlayers = squad.filter((p) => {
    const matchName = normalizeStr(p.name).includes(searchTerm);
    const matchPos = posFilter
      ? p.aptitude && p.aptitude.includes(posFilter)
      : true;
    return matchName && matchPos;
  });

  // Ordenação
  filteredPlayers.sort((a, b) => {
    let valA, valB;
    switch (tableSortCol) {
      case "name":
        valA = a.name;
        valB = b.name;
        break;
      case "rating":
        valA = a.rating;
        valB = b.rating;
        break;
      case "age":
        valA = a.age || 0;
        valB = b.age || 0;
        break;
      case "foot":
        valA = a.foot || "";
        valB = b.foot || "";
        break;
      case "nationality":
        valA = a.nationality || "";
        valB = b.nationality || "";
        break;
      case "playstyle":
        valA = a.playstyle || "";
        valB = b.playstyle || "";
        break;
      case "form":
        valA = a.form || 0;
        valB = b.form || 0;
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      case "pos":
        valA = ALL_POSITIONS.indexOf(a.aptitude?.[0]);
        if (valA === -1) valA = 99; // Se não tiver posição, vai pro final
        valB = ALL_POSITIONS.indexOf(b.aptitude?.[0]);
        if (valB === -1) valB = 99; // Se não tiver posição, vai pro final
        break;
      default:
        valA = a.rating;
        valB = b.rating;
        break;
    }

    if (typeof valA === "string") {
      return tableSortDesc
        ? valB.localeCompare(valA)
        : valA.localeCompare(valB);
    } else {
      return tableSortDesc ? valB - valA : valA - valB;
    }
  });

  filteredPlayers.forEach((p) => {
    const tr = document.createElement("tr");
    const mainPos = p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "--";
    const isGK = p.aptitude && p.aptitude[0] === "GL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK);
    const ratingColor = getRatingColor(pRating);
    const nat = p.nationality || "--";
    const flagHtml = getFlag(nat);
    const mStatusHtml = getMatchStatusHTML(p.matchStatus);

    tr.innerHTML = `
      <td><span class="pos-badge-table">${mainPos}</span></td>
      <td><div style="position:relative; display:inline-block; margin-right: 15px;">${mStatusHtml}</div><strong style="font-size: 0.95rem; color: #fff;">${p.name}</strong> ${p.captain ? '<span style="color: var(--warning); font-size: 0.7rem; font-weight: bold; margin-left: 5px;">(C)</span>' : ""}</td>
      <td style="text-align: center;">${getFormHTML(p.form)}</td>
      <td><span style="background: ${ratingColor}; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: 900;">${pRating.toFixed(1)}</span></td>
      <td>${p.age || "--"}</td>
      <td>${p.foot || "--"}</td>
      <td><span style="font-size: 0.7rem; border: 1px solid #444; padding: 2px 4px; border-radius: 4px; display: inline-flex; align-items: center;">${flagHtml}${nat}</span></td>
      <td style="color: var(--accent); font-size: 0.75rem; font-weight: bold;">${p.playstyle || "--"}</td>
      <td>
        <span style="font-size: 0.65rem; padding: 4px 8px; border-radius: 4px; font-weight: 800; border: 1px solid ${p.status === "titular" ? "var(--accent)" : "#555"}; color: ${p.status === "titular" ? "var(--accent)" : "#888"};">
          ${p.status.toUpperCase()}
        </span>
      </td>
    `;

    tr.onclick = () => openMenu(p.id);
    tbody.appendChild(tr);
  });
}

function render() {
  const pitch = document.getElementById("pitch");
  const bench = document.getElementById("benchList");
  pitch.querySelectorAll(".player").forEach((el) => el.remove());
  bench.innerHTML = "";

  const format = formations[document.getElementById("formationSelect").value];
  const titulares = squad.filter((p) => p.status === "titular");
  let reservas = squad.filter((p) => p.status === "reserva");

  const svg = document.getElementById("chemistryLines");
  if (svg) svg.innerHTML = "";

  let totalRating = 0,
    totalAge = 0,
    fitCount = 0,
    destrosCount = 0,
    canhotosCount = 0,
    ambiCount = 0,
    estrangeirosCount = 0;
  let totalVel = 0,
    totalFin = 0,
    totalPas = 0,
    totalDri = 0,
    totalDef = 0,
    totalFis = 0;
  let outfieldCount = 0;
  let playstylesCount = {};

  titulares.forEach((p, i) => {
    if (!format || !format[i]) return;
    const { t: topPos, l: leftPos } = format[i];
    const currentZone = getEfootballPosition(topPos, leftPos);
    const fitClass = checkPositionFit(p, currentZone);
    const isGK = p.aptitude && p.aptitude[0] === "GL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK);
    let displayRating = pRating;
    if (fitClass === "fit-warning")
      displayRating =
        (p.aptitude && p.aptitude.includes("GL")) || currentZone === "GL"
          ? 1.0
          : Math.max(1.0, pRating - 2.5);

    let liveStatusClass = "";
    if (p.matchStatus === "red") liveStatusClass = "is-suspended";
    if (p.matchStatus === "injury") liveStatusClass = "is-injured";

    totalRating += displayRating;
    totalAge += p.age || 25;
    if (fitClass === "fit-perfect") fitCount++;
    if (p.foot === "Canhoto") canhotosCount++;
    else if (p.foot === "Ambidestro") ambiCount++;
    else destrosCount++;

    if (!isGK) {
      const s = p.stats || {};
      totalVel += s.vel || s.pac || s.spd || 50;
      totalFin += s.fin || s.sho || s.atk || 50;
      totalPas += s.pas || 50;
      totalDri += s.dri || s.atk || 50;
      totalDef += s.def || 50;
      totalFis += s.fis || s.phy || s.str || 50;
      outfieldCount++;
    }

    if (p.nationality && p.nationality !== "BR") estrangeirosCount++;
    if (p.playstyle)
      playstylesCount[p.playstyle] = (playstylesCount[p.playstyle] || 0) + 1;

    const el = document.createElement("div");
    el.className = `player ${fitClass} ${liveStatusClass}`;
    el.dataset.id = p.id;
    el.style.cssText = `top: ${topPos}%; left: ${leftPos}%;`;
    el.innerHTML = `<div class="p-icon" style="border-color: ${getRatingColor(pRating)}">${getMatchStatusHTML(p.matchStatus)}${p.captain ? '<div class="captain-armband">C</div>' : ""}<div class="p-pos-badge">${currentZone}</div><div class="p-form">${getFormHTML(p.form)}</div>${p.number}<span class="p-badge" style="background: ${getRatingColor(displayRating)}">${displayRating.toFixed(1)}</span></div><div class="p-name">${p.name}</div>`;
    el.draggable = true;
    el.ondragstart = (e) => {
      e.dataTransfer.setData("playerId", p.id);
      highlightZones(p);
    };
    el.ondragend = clearZones;
    el.ondragover = (e) => {
      e.preventDefault();
      el.classList.add("drag-over-player");
    };
    el.ondragleave = () => el.classList.remove("drag-over-player");
    el.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("drag-over-player");
      clearZones(); // Força a limpeza do campo antes de redesenhar
      const draggedId = e.dataTransfer.getData("playerId");
      if (draggedId && draggedId !== p.id.toString()) {
        swapTitulares(parseInt(draggedId, 10), p.id);
        render();
      } else {
        const reserveId = e.dataTransfer.getData("reserveId");
        if (reserveId) {
          performSwap(p.id, parseInt(reserveId, 10));
          render();
        }
      }
    };
    // UX Melhorada: Duplo clique ou clique simples (com verificação para não conflitar com drag)
    el.onclick = () => {
      if (!el.classList.contains("dragging")) openMenu(p.id);
    };
    pitch.appendChild(el);
  });

  if (titulares.length > 0) {
    const divBy = outfieldCount > 0 ? outfieldCount : 1;
    const avgStats = {
      vel: Math.round(totalVel / divBy),
      fin: Math.round(totalFin / divBy),
      pas: Math.round(totalPas / divBy),
      dri: Math.round(totalDri / divBy),
      def: Math.round(totalDef / divBy),
      fis: Math.round(totalFis / divBy),
    };
    drawRadar("teamRadarChart", avgStats);

    const avgRating = totalRating / titulares.length;
    document.getElementById("teamStars").innerText = getStarsHTML(avgRating);
    document.getElementById("teamAge").innerText = (
      totalAge / titulares.length
    ).toFixed(1);
    document.getElementById("teamOverall").innerText = avgRating.toFixed(1);
    document.getElementById("teamOverall").style.color =
      getRatingColor(avgRating);
    document.getElementById("teamFitness").innerText =
      `${fitCount}/${titulares.length}`;
    document.getElementById("teamFitness").style.color =
      fitCount === titulares.length
        ? "var(--rating-top)"
        : fitCount >= 8
          ? "var(--rating-high)"
          : "var(--warning)";
    document.getElementById("teamFoot").innerText =
      `${destrosCount}D | ${canhotosCount}C${ambiCount > 0 ? ` | ${ambiCount}A` : ""}`;

    document.getElementById("teamAtk").innerText = avgStats.fin;
    document.getElementById("teamAtk").style.color = getRatingColor(
      avgStats.fin / 10,
    );
    document.getElementById("teamDef").innerText = avgStats.def;
    document.getElementById("teamDef").style.color = getRatingColor(
      avgStats.def / 10,
    );
    document.getElementById("teamForeigners").innerText = estrangeirosCount;
    let topStyle = "--",
      maxCount = 0;
    for (const [style, count] of Object.entries(playstylesCount)) {
      if (count > maxCount) {
        maxCount = count;
        topStyle = style;
      }
    }
    document.getElementById("teamPlaystyle").innerText = topStyle;
    document.getElementById("teamPlaystyle").title = topStyle;

    // Chemistry Lines: Ligações por Linhas Táticas
    const formatName = document.getElementById("formationSelect").value;
    const linesCounts = formatName.split("-").map(Number); // ex: "4-2-3-1" -> [4, 2, 3, 1]

    const outfieldPlayers = [];

    titulares.forEach((p, i) => {
      if (!format[i]) return;
      const posData = { player: p, index: i, t: format[i].t, l: format[i].l };
      if (format[i].l > 14) outfieldPlayers.push(posData); // Ignora o Goleiro e adiciona apenas jogadores de linha
    });

    // Ordena jogadores da defesa para o ataque (Eixo L) e divide nas linhas da formação
    outfieldPlayers.sort((a, b) => a.l - b.l);
    const lines = [];
    let currentIndex = 0;
    linesCounts.forEach((count) => {
      const currentLine = outfieldPlayers.slice(
        currentIndex,
        currentIndex + count,
      );
      if (currentLine.length > 0) lines.push(currentLine);
      currentIndex += count;
    });

    const drawChemLine = (p1, p2) => {
      const fit1 = checkPositionFit(
        p1.player,
        getEfootballPosition(p1.t, p1.l),
      );
      const fit2 = checkPositionFit(
        p2.player,
        getEfootballPosition(p2.t, p2.l),
      );
      let stroke = "var(--rating-bad)",
        width = "1",
        dash = "4,4",
        op = "0.3";
      if (fit1 === "fit-perfect" && fit2 === "fit-perfect") {
        stroke = "var(--rating-high)";
        width = "3";
        dash = "none";
        op = "0.6";
      } else if (fit1 === "fit-perfect" || fit2 === "fit-perfect") {
        stroke = "var(--rating-mid)";
        width = "2";
        dash = "6,4";
        op = "0.5";
      }
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", p1.l + "%");
      line.setAttribute("y1", p1.t + "%");
      line.setAttribute("x2", p2.l + "%");
      line.setAttribute("y2", p2.t + "%");
      line.setAttribute("stroke", stroke);
      line.setAttribute("stroke-width", width);
      line.setAttribute("stroke-dasharray", dash);
      line.style.opacity = op;
      if (svg) svg.appendChild(line);
    };

    // Desenha as conexões entre jogadores da mesma linha
    lines.forEach((lineGroup) => {
      lineGroup.sort((a, b) => a.t - b.t); // Ordena do topo para a base (LE para LD, por ex.)
      for (let k = 0; k < lineGroup.length - 1; k++) {
        drawChemLine(lineGroup[k], lineGroup[k + 1]);
      }
    });
  }

  reservas.sort((a, b) =>
    document.getElementById("benchSortSelect").value === "rating"
      ? (b.rating ?? 0) - (a.rating ?? 0)
      : (ALL_POSITIONS.indexOf(a.aptitude?.[0]) ?? 99) -
        (ALL_POSITIONS.indexOf(b.aptitude?.[0]) ?? 99),
  );
  reservas.forEach((p) => {
    const res = document.createElement("div");
    const isGK = p.aptitude && p.aptitude[0] === "GL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK);
    const mStatusHtml = getMatchStatusHTML(p.matchStatus);
    res.className = "reserve-item";
    res.dataset.id = p.id;
    res.innerHTML = `<div style="display: flex; justify-content: space-between; width: 100%; align-items: center; position: relative;">${mStatusHtml}<span style="font-size: 0.65rem; background: #222; padding: 2px 4px; border-radius: 4px; border: 1px solid #444; font-weight: 800; margin-left: ${mStatusHtml ? "12px" : "0"};">${p.aptitude?.[0] || "??"}</span><div style="display: flex; align-items: center; gap: 4px;">${getFormHTML(p.form)} <span style="background: ${getRatingColor(pRating)}; color: #000; font-size: 0.7rem; font-weight: 900; padding: 2px 4px; border-radius: 4px;">${pRating.toFixed(1)}</span></div></div><svg class="player-silhouette" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><div style="margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; width: 100%;"><strong>${p.name}</strong></div><div style="font-size: 0.6rem; color: #888; margin-top: 2px;">Nº ${p.number} | ${p.age || "--"}A | ${p.foot ? p.foot.charAt(0).toUpperCase() : "D"}</div>`;
    res.onclick = () => openMenu(p.id);
    bench.appendChild(res);
  });
  initDragAndDrop();

  if (isTableView) renderTable();
}

function handleSubstitution(reserveId, dropX, dropY) {
  let closestTitularId = null,
    minDistance = Infinity;
  document.querySelectorAll(".player").forEach((playerEl) => {
    const rect = playerEl.getBoundingClientRect();
    const distance = Math.hypot(
      rect.left + rect.width / 2 - dropX,
      rect.top + rect.height / 2 - dropY,
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestTitularId = parseInt(playerEl.dataset.id, 10);
    }
  });
  if (closestTitularId && minDistance < 75) {
    performSwap(closestTitularId, reserveId);
    render();
  }
}

function initDragAndDrop() {
  document.querySelectorAll(".reserve-item").forEach((res) => {
    res.draggable = true;
    res.ondragstart = (e) => {
      e.dataTransfer.setData("reserveId", res.dataset.id);
      const p = squad.find((x) => x.id === parseInt(res.dataset.id, 10));
      if (p) highlightZones(p);
    };
    res.ondragend = clearZones;
    res.ondragover = (e) => {
      e.preventDefault();
      res.style.borderColor = "var(--accent)";
    };
    res.ondragleave = () => (res.style.borderColor = "");
    res.ondrop = (e) => {
      e.preventDefault();
      res.style.borderColor = "";
      clearZones(); // Limpa as zonas do campo ao dropar no banco
      const pId = e.dataTransfer.getData("playerId");
      if (pId) {
        performSwap(parseInt(pId, 10), parseInt(res.dataset.id, 10));
        render();
      }
    };
  });
  const pitch = document.getElementById("pitch");
  pitch.ondragover = (e) => {
    e.preventDefault();
    pitch.classList.add("drag-over");
  };
  pitch.ondragleave = () => pitch.classList.remove("drag-over");
  pitch.ondrop = (e) => {
    e.preventDefault();
    clearZones();
    const reserveId = e.dataTransfer.getData("reserveId");
    if (reserveId)
      return handleSubstitution(parseInt(reserveId, 10), e.clientX, e.clientY);
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId) {
      handlePlayerMove(parseInt(playerId, 10), e.clientX, e.clientY);
      render();
    }
  };
}

// =========================================================
// ENGINE DE SIMULAÇÃO DE PARTIDA (Live Commentary)
// =========================================================
let simInterval = null;

async function loadOpponentData(selectedValue) {
  if (selectedValue === "generic") {
    return {
      name: matchInfo.away || "Adversário Genérico",
      atk: 65,
      def: 65,
      squad: [],
    };
  }
  try {
    // O timestamp previne que o navegador grave o arquivo JSON velho no cache
    const res = await fetch(
      "data/" + selectedValue + "?t=" + new Date().getTime(),
    );
    if (res.ok) {
      const oppData = await res.json();
      const oppTitulares = (oppData.squad || []).filter(
        (p) => p.status === "titular",
      );
      const len = oppTitulares.length > 0 ? oppTitulares.length : 11;
      return {
        name: oppData.matchInfo?.away || "Adversário Desconhecido",
        atk:
          oppTitulares.reduce(
            (sum, p) =>
              sum +
              ((p.stats?.fin || p.stats?.sho || 65) +
                (p.stats?.vel || p.stats?.pac || 65)) /
                2,
            0,
          ) / len,
        def:
          oppTitulares.reduce(
            (sum, p) =>
              sum +
              ((p.stats?.def || 65) + (p.stats?.fis || p.stats?.phy || 65)) / 2,
            0,
          ) / len,
        squad: oppTitulares,
      };
    }
  } catch (e) {
    console.error("Erro ao carregar o arquivo:", e);
  }
  return { name: "Adversário (Erro de Leitura)", atk: 65, def: 65, squad: [] };
}

async function openMatchSimulation() {
  const titulares = squad.filter((p) => p.status === "titular");
  if (titulares.length < 11) {
    showCustomModal(
      "Atenção: Você precisa de exatos 11 jogadores titulares na prancheta para iniciar uma partida!",
      "alert",
      "btn-danger",
    );
    return;
  }

  const modal = document.getElementById("simulationModal");
  const logContainer = document.getElementById("simLog");
  const timeEl = document.getElementById("simTime");
  const scoreEl = document.getElementById("simScore");
  const startBtn = document.getElementById("startSimBtn");
  const opponentSelect = document.getElementById("simOpponentSelect");

  modal.classList.add("show");

  // Reset da UI para aguardar carregamento
  logContainer.innerHTML =
    "<div class='log-entry log-neutral'>Carregando informações da partida...</div>";
  timeEl.innerText = "00'";
  scoreEl.innerText = "0 x 0";
  startBtn.style.display = "none";
  if (opponentSelect) opponentSelect.disabled = false;

  // Carrega os dados baseados no arquivo selecionado
  let currentOpponent = await loadOpponentData(
    opponentSelect ? opponentSelect.value : "generic",
  );

  const updateUI = () => {
    document.getElementById("simHomeTeam").innerText =
      matchInfo.home || "Seu Time";
    document.getElementById("simAwayTeam").innerText = currentOpponent.name;
    document.getElementById("simMatchTitle").innerText =
      matchInfo.tournament || "Amistoso Internacional";
  };
  updateUI();

  if (opponentSelect) {
    opponentSelect.onchange = async (e) => {
      startBtn.style.display = "none";
      logContainer.innerHTML =
        "<div class='log-entry log-neutral'>Escaneando dados do arquivo JSON...</div>";
      currentOpponent = await loadOpponentData(e.target.value);
      updateUI();
      logContainer.innerHTML =
        "<div class='log-entry log-neutral'>Arquivos do adversário carregados! Aguardando o apito inicial...</div>";
      startBtn.style.display = "block";
    };
  }

  logContainer.innerHTML =
    "<div class='log-entry log-neutral'>Equipes perfiladas. Aguardando o apito do árbitro...</div>";
  startBtn.innerText = "Apito Inicial";
  startBtn.style.display = "block";

  let minute = 0;
  let homeScore = 0;
  let awayScore = 0;

  // Cálcula a Força do seu time (Ataque e Defesa baseada nos titulares)
  const homeAtk =
    titulares.reduce(
      (sum, p) =>
        sum +
        ((p.stats?.fin || p.stats?.sho || 50) +
          (p.stats?.vel || p.stats?.pac || 50)) /
          2,
      0,
    ) / 11;
  const homeDef =
    titulares.reduce(
      (sum, p) =>
        sum + ((p.stats?.def || 50) + (p.stats?.fis || p.stats?.phy || 50)) / 2,
      0,
    ) / 11;

  const addLog = (text, type = "log-neutral") => {
    const el = document.createElement("div");
    el.className = `log-entry ${type}`;
    el.innerHTML = `<strong style="font-size:0.9rem;">${minute}'</strong> &nbsp; ${text}`;
    logContainer.appendChild(el);
    logContainer.scrollTop = logContainer.scrollHeight;
  };

  const runMinute = () => {
    minute += Math.floor(Math.random() * 3) + 2; // Pula entre 2 a 4 minutos por rodada
    if (minute >= 90) {
      timeEl.innerText = "90'";
      clearInterval(simInterval);
      addLog("Fim de Papo! O árbitro encerra a partida.", "log-neutral");
      startBtn.innerText = "Fechar Tela";
      startBtn.style.display = "block";
      if (opponentSelect) opponentSelect.disabled = false;
      startBtn.onclick = () => modal.classList.remove("show");
      return;
    }

    timeEl.innerText = minute + "'";
    const rand = Math.random() * 100;

    // LÓGICA 1: O Seu Time Ataca
    if (rand < (homeAtk / (homeAtk + currentOpponent.def)) * 15) {
      // Encontra um atacante ou meia do seu time para participar da jogada
      const atacantes = titulares.filter((p) =>
        ["CA", "SA", "PE", "PD", "MEI"].includes(p.aptitude?.[0]),
      );
      let jogador = titulares[Math.floor(Math.random() * 11)];
      if (atacantes.length > 0)
        jogador = atacantes[Math.floor(Math.random() * atacantes.length)];

      if (
        Math.random() * 100 <
        (jogador.stats?.fin || jogador.stats?.sho || 50) + 10
      ) {
        // Bônus base
        homeScore++;
        scoreEl.innerText = `${homeScore} x ${awayScore}`;
        addLog(
          `GOOOOOOOOL! Que finalização perfeita de ${jogador.name}! Bateu sem chances pro goleiro.`,
          "log-goal",
        );
      } else {
        addLog(
          `Uuuuuh! ${jogador.name} recebe em boa condição mas a bola passa raspando a trave.`,
          "log-chance",
        );
      }
    }
    // LÓGICA 2: O Adversário Ataca
    else if (
      rand >
      100 - (currentOpponent.atk / (currentOpponent.atk + homeDef)) * 12
    ) {
      // O seu goleiro é testado
      const goleiros = titulares.filter((p) => p.aptitude?.[0] === "GL");
      const goleiro = goleiros.length > 0 ? goleiros[0] : titulares[0];

      // Tenta descobrir o nome de um atacante do time adversário lido do JSON
      let oppAttackerName = "O atacante adversário";
      if (currentOpponent.squad.length > 0) {
        const oppAttackers = currentOpponent.squad.filter((p) =>
          ["CA", "SA", "PE", "PD", "MEI"].includes(p.aptitude?.[0]),
        );
        if (oppAttackers.length > 0) {
          oppAttackerName =
            oppAttackers[Math.floor(Math.random() * oppAttackers.length)].name;
        } else {
          oppAttackerName =
            currentOpponent.squad[
              Math.floor(Math.random() * currentOpponent.squad.length)
            ].name;
        }
      }

      if (Math.random() * 100 < 35 - (goleiro.stats?.ref || 50) / 4) {
        // Falha da defesa / Goleiro não pegou
        awayScore++;
        scoreEl.innerText = `${homeScore} x ${awayScore}`;
        addLog(
          `Gol... ${oppAttackerName} se aproveita da bobeira da zaga e manda a bola pro fundo da rede.`,
          "log-foul",
        );
      } else {
        addLog(
          `DEFESAÇA! ${oppAttackerName} chegou com muito perigo, mas ${goleiro.name} operou um milagre!`,
          "log-chance",
        );
      }
    }
  };

  startBtn.onclick = () => {
    if (opponentSelect) opponentSelect.disabled = true; // Trava o seletor durante a partida
    startBtn.style.display = "none";
    addLog("Bola rolando!", "log-neutral");
    simInterval = setInterval(runMinute, 1200); // 1.2 segundos da vida real = X minutos do jogo
  };

  document.getElementById("closeSimBtn").onclick = () => {
    clearInterval(simInterval);
    modal.classList.remove("show");
  };
}

function setupEventListeners() {
  // Contratar / Dispensar Jogadores
  document
    .getElementById("addPlayerBtn")
    .addEventListener("click", async () => {
      if (isEditMode) {
        const proceed = await showCustomModal(
          "Você tem edições em andamento. Deseja descartar e criar um novo jogador?",
          "confirm",
          "btn-primary",
        );
        if (!proceed) return;
        isEditMode = false;
      }
      const newId = addNewPlayer();
      document.getElementById("toggleViewBtn").click(); // Volta pro modo prancheta se estiver na tabela
      render();
      openMenu(newId);
      setEditMode(true);
    });

  document
    .getElementById("deletePlayerBtn")
    .addEventListener("click", async () => {
      const proceed = await showCustomModal(
        "Tem certeza que deseja dispensar este jogador permanentemente do clube?",
        "confirm",
        "btn-danger",
      );
      if (proceed) {
        removePlayer(activePlayerId);
        isEditMode = false; // Desativa a proteção para o menu poder fechar livremente
        closeMenu();
        render();
      }
    });

  document
    .getElementById("simulateMatchBtn")
    .addEventListener("click", openMatchSimulation);

  document
    .getElementById("saveTacticBtn")
    .addEventListener("click", async () => {
      const select = document.getElementById("formationSelect");
      const currentFormat = select.value;
      const newName = await showCustomModal(
        "Digite um nome para sua nova Formação (ex: 4-1-3-2 Atacante):",
        "prompt",
        "btn-primary",
      );

      if (newName && newName.trim() !== "") {
        const name = newName.trim();
        if (formations[name]) {
          await showCustomModal(
            "Já existe uma formação com esse nome! Escolha um nome diferente.",
            "alert",
            "btn-danger",
          );
          return;
        }
        formations[name] = JSON.parse(
          JSON.stringify(formations[currentFormat]),
        );
        saveToLocal();

        const opt = document.createElement("option");
        opt.value = opt.innerText = name;
        select.appendChild(opt);
        select.value = name;
      }
    });

  document.getElementById("formationSelect").addEventListener("change", (e) => {
    resetFormationAlignment(e.target.value);
    render();
  });
  document.getElementById("benchSortSelect").onchange = render;
  document.getElementById("autoFillBtn").onclick = () => {
    autoFillTeam();
    render();
  };
  document.getElementById("exportJsonBtn").onclick = downloadJSON;
  document.getElementById("exportImageBtn").onclick = () =>
    html2canvas(document.getElementById("pitch"), {
      backgroundColor: "#112610",
      scale: 2,
    }).then((c) => {
      const l = document.createElement("a");
      l.download = `Tatica_${document.getElementById("formationSelect").value}.png`;
      l.href = c.toDataURL();
      l.click();
    });
  document.getElementById("benchSearchInput").addEventListener("input", (e) => {
    const term = normalizeStr(e.target.value);
    document.querySelectorAll(".reserve-item").forEach((i) => {
      i.style.display = normalizeStr(i.innerText).includes(term)
        ? "flex"
        : "none";
    });
  });
  document.getElementById("closeMenuBtn").onclick = closeMenu;
  document.getElementById("toggleEditBtn").onclick = async () => {
    if (isEditMode) {
      const proceed = await showCustomModal(
        "Cancelar a edição? As alterações não salvas serão perdidas.",
        "confirm",
        "btn-danger",
      );
      if (proceed) {
        openMenu(activePlayerId); // Cancela a edição, recarregando os valores originais
      }
    } else {
      setEditMode(true);
    }
  };
  document.getElementById("saveBtn").onclick = () => {
    const p = squad.find((x) => x.id === activePlayerId);
    if (p) {
      // ANTI-CRASH: Detecta se é GK para mapear os sliders corretos
      const isGK = p.aptitude && p.aptitude[0] === "GL";
      const statKeys = isGK
        ? ["sal", "man", "rep", "ref", "vel", "pos"]
        : ["vel", "fin", "pas", "dri", "def", "fis"];

      const newStats = {};
      statKeys.forEach((k) => {
        const el = document.getElementById(`slider_${k}`);
        newStats[k] = el ? parseInt(el.value, 10) : 50;
      });

      const formVal = parseInt(
        document.getElementById("editFormInput").value,
        10,
      );

      // Atualiza os dados no core.js e persiste no LocalStorage
      updatePlayerData(activePlayerId, {
        name: document.getElementById("editNameInput").value,
        stats: newStats,
        rating: calculateOVR(newStats, formVal, isGK), // Passa isGK para o cálculo correto
        form: formVal,
        matchStatus: document.getElementById("editMatchStatusInput").value,
        age: parseInt(document.getElementById("editAgeInput").value, 10) || 25,
        foot: document.getElementById("editFootInput").value,
        nationality: document.getElementById("editNationInput").value,
        playstyle: document.getElementById("editPlaystyleInput").value,
        captain: document.getElementById("editCaptainInput").checked,
        aptitude: [...p.aptitude], // Mantém as aptidões selecionadas nos chips
      });

      isEditMode = false; // Desativa a proteção para o menu poder fechar após salvar
      closeMenu();
      render();
    }
  };
  document.getElementById("compareSelect").onchange = (e) => {
    const p1 = squad.find((x) => x.id === activePlayerId);
    if (!p1) return;

    const isGK = p1.aptitude && p1.aptitude[0] === "GL";
    const statKeys = isGK
      ? ["sal", "man", "rep", "ref", "vel", "pos"]
      : ["vel", "fin", "pas", "dri", "def", "fis"];

    let s1;
    if (document.getElementById(`slider_${statKeys[0]}`)) {
      s1 = {};
      statKeys.forEach(
        (k) =>
          (s1[k] = parseInt(document.getElementById(`slider_${k}`).value, 10)),
      );
    } else {
      s1 = p1.stats || {};
    }

    const p2 = squad.find((x) => x.id === parseInt(e.target.value, 10));
    const s2 = p2 ? p2.stats || {} : null;
    drawRadar("radarChart", s1, s2, isGK);
    renderStatsNumbers(s1, s2, isGK);
  };
  document.addEventListener("click", (e) => {
    if (
      document.getElementById("playerView").style.display === "flex" &&
      !document.getElementById("sidebar").contains(e.target) &&
      !e.target.closest(".player") &&
      !e.target.closest(".reserve-item")
    )
      if (!isEditMode) closeMenu(); // Não fecha se estiver no meio de uma edição
  });
  document.getElementById("benchList").addEventListener("wheel", function (e) {
    if (e.deltaY !== 0) {
      e.preventDefault();
      this.scrollLeft += e.deltaY;
    }
  });

  // Eventos da Tabela (Filtros e Ordenação)
  document
    .getElementById("tableSearchInput")
    ?.addEventListener("input", renderTable);
  document
    .getElementById("tablePosFilter")
    ?.addEventListener("change", renderTable);
  document.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (tableSortCol === col) {
        tableSortDesc = !tableSortDesc;
      } else {
        tableSortCol = col;
        tableSortDesc = col === "rating" || col === "age"; // Notas e Idades maiores primeiro por padrão
      }
      renderTable();
    });
  });

  // Alternar Visão (Campo / Tabela)
  document.getElementById("toggleViewBtn").onclick = () => {
    isTableView = !isTableView;
    document.getElementById("pitch").style.display = isTableView
      ? "none"
      : "block";
    document.getElementById("tableView").style.display = isTableView
      ? "block"
      : "none";
    document.querySelector(".bottom-bench").style.display = isTableView
      ? "none"
      : "flex";
    document.getElementById("toggleViewBtn").innerText = isTableView
      ? "Ver Prancheta"
      : "Ver Lista";
    document.getElementById("toggleViewBtn").className = isTableView
      ? "btn-primary"
      : "btn-secondary";
    if (isTableView) renderTable();
  };
}

async function main() {
  // 1. Garante que o botão de Resetar funcione SEMPRE, mesmo se a tela quebrar ao carregar!
  document.getElementById("resetBtn").onclick = async () => {
    const proceed = await showCustomModal(
      "ATENÇÃO: Isso apagará todas as suas edições, contratações e táticas salvas. Deseja realmente resetar o aplicativo para os padrões de fábrica?",
      "confirm",
      "btn-danger",
    );
    if (proceed) {
      resetData();
    }
  };

  // 2. [EMERGÊNCIA] Descomente a linha abaixo (remova as duas barras //), salve,
  // atualize a página 1 vez e depois comente a linha de novo para não apagar tudo sempre.
  // localStorage.clear();

  if (await initSystem()) {
    const select = document.getElementById("formationSelect");
    const currentVal = select.value;

    // Salva os nomes traduzidos definidos no HTML antes de recriar a lista
    const optionLabels = {};
    Array.from(select.options).forEach(
      (opt) => (optionLabels[opt.value] = opt.innerText),
    );

    select.innerHTML = "";

    // Organiza a lista de táticas em ordem alfabética/numérica (ex: 3-4-3 vem antes de 4-3-3)
    const sortedFormations = Object.keys(formations).sort((a, b) =>
      a.localeCompare(b),
    );

    sortedFormations.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f;
      opt.innerText = optionLabels[f] || f;
      select.appendChild(opt);
    });

    // Força uma seleção tática válida, não permitindo valores fantasmas
    if (sortedFormations.includes(currentVal)) {
      select.value = currentVal;
    } else if (sortedFormations.length > 0) {
      select.value = sortedFormations[0];
    }

    render();
    setupEventListeners();
  } else {
    // Alerta de Erro Crítico de JSON
    await showCustomModal(
      "Erro crítico: O painel não conseguiu ler o arquivo JSON. Certifique-se de estar usando o 'Live Server' no VS Code e verifique se o arquivo data/vasco.json não contém erros.",
      "alert",
      "btn-danger",
    );
  }
}

main();
