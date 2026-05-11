import {
  squad,
  formations,
  ALL_POSITIONS,
  initSystem,
  performSwap,
  downloadJSON,
  resetData,
  resetFormationAlignment,
  resetSystem,
  calculateOVR,
  saveToLocal,
  healSquad,
  matchHistory,
  matchInfo,
  ensureCaptain,
} from "./core.js";

import {
  getEfootballPosition,
  checkPositionFit,
  swapTitulares,
  handlePlayerMove,
  autoFillTeam,
} from "./tactics.js";

import { openMatchSimulation } from "./simulation.js";

import {
  getRatingColor,
  getStarsHTML,
  getFormHTML,
  getMatchStatusHTML,
  drawRadar,
} from "./graphics.js";

import { showCustomModal } from "./modal.js";
import { normalizeStr } from "./utils.js";
import { initEditorEvents, openMenu } from "./playerEditor.js";
import {
  initTableEvents,
  isTableView,
  renderTable,
  setTableView,
} from "./tableView.js";

import { initLeagueEvents } from "./league.js";
import { renderLeagueData } from "./leagueRenderer.js";
import { Storage } from "./storage.js";

let showOnlyFitPlayers = false;

// ── DIAGNÓSTICO VISUAL ──────────────────────────────────────────────────────
let _dbgContainer = null;
function dbgToast(msg, bg = "#222", duration = 4000) {
  if (!_dbgContainer) {
    _dbgContainer = document.createElement("div");
    _dbgContainer.style.cssText = "position:fixed;top:10px;right:10px;z-index:999999;display:flex;flex-direction:column;gap:6px;max-width:420px;pointer-events:none;";
    document.body.appendChild(_dbgContainer);
  }
  const el = document.createElement("div");
  el.style.cssText = `background:${bg};color:#fff;padding:8px 12px;border-radius:6px;font-size:0.75rem;font-family:monospace;border-left:3px solid rgba(255,255,255,0.3);opacity:1;transition:opacity 0.5s;`;
  el.textContent = msg;
  _dbgContainer.appendChild(el);
  console.log("[DBG]", msg);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 500); }, duration);
}
// ───────────────────────────────────────────────────────────────────────────

export function highlightZones(player) {
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

export function clearZones() {
  const pitch = document.getElementById("pitch");
  if (pitch) {
    pitch.classList.remove("active-selection");
    pitch.classList.remove("drag-over");
  }
}

export function switchMainView(viewName) {
  setTableView(viewName === "table");

  const pitch = document.getElementById("pitch");
  const table = document.getElementById("tableView");
  const sim = document.getElementById("simulationView");
  const dashboard = document.getElementById("dashboardView");
  const league = document.getElementById("leagueView");
  const teamStats = document.getElementById("teamStatsView");
  const bench = document.querySelector(".bottom-bench");
  const sidebar = document.getElementById("sidebar");

  if (pitch) pitch.style.display = "none";
  if (table) table.style.display = "none";
  if (sim) sim.style.display = "none";
  if (dashboard) dashboard.style.display = "none";
  if (league) league.style.display = "none";
  if (teamStats) teamStats.style.display = "none";

  const navDash = document.getElementById("navDashboardBtn");
  const navPitch = document.getElementById("navPitchBtn");
  const navTable = document.getElementById("navTableBtn");

  if (navPitch) navPitch.className = "btn-secondary";
  if (navTable) navTable.className = "btn-secondary";

  if (viewName === "simulation") {
    if (sidebar) sidebar.style.display = "none";
    if (sim) sim.style.display = "block";
    if (bench) bench.style.display = "none";
  } else if (viewName === "table") {
    if (sidebar) sidebar.style.display = "flex";
    if (table) table.style.display = "block";
    if (bench) bench.style.display = "none";
    if (navTable) navTable.className = "btn-primary";
    renderApp();
  } else if (viewName === "pitch") {
    if (sidebar) sidebar.style.display = "flex";
    if (pitch) pitch.style.display = "block";
    if (bench) bench.style.display = "flex";
    if (navPitch) navPitch.className = "btn-primary";
    renderApp();
  } else if (viewName === "league") {
    if (sidebar) sidebar.style.display = "none";
    if (league) league.style.display = "block";
    if (bench) bench.style.display = "none";
    renderApp();
  } else if (viewName === "teamStats") {
    if (sidebar) sidebar.style.display = "none";
    if (teamStats) teamStats.style.display = "block";
    if (bench) bench.style.display = "none";
    renderTeamStats();
  } else {
    // dashboard
    if (sidebar) sidebar.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    if (bench) bench.style.display = "none";
    renderApp();
  }
  if (window.lucide) window.lucide.createIcons();
}

export function renderApp() {
  render();
}

export async function render() {
  const data = await Storage.getLeagueData();
  if (!squad || squad.length === 0) return;

  ensureCaptain();

  const formatName = document.getElementById("formationSelect")?.value || "4-3-3";
  const format = formations[formatName] || formations["4-3-3"] || Object.values(formations)[0];

  const titulares = [];
  for (let i = 0; i < 11; i++) {
    titulares.push(squad[i] || null);
  }

  const reservas = squad.slice(11).filter(p => p !== null);
  const benchSortValue = document.getElementById("benchSortSelect").value;

  // 1. Limpa o campo e reconstroi com grid-cells (necessário para highlightZones)
  const pitch = document.getElementById("pitch");
  if (pitch) {
    const GRID_POSITIONS = [
      ["GOL", "LE", "LE", "ME", "ME", "PE", "PE"],
      ["GOL", "ZE", "VOL", "MC", "MEI", "SA", "CA"],
      ["GOL", "ZD", "VOL", "MC", "MEI", "SA", "CA"],
      ["GOL", "LD", "LD", "MD", "MD", "PD", "PD"],
    ];

    // Lógica para unir blocos da mesma posição (Grid Spanning)
    const cells = [];
    const visited = Array.from({ length: 4 }, () => Array(7).fill(false));

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        if (visited[r][c]) continue;
        const pos = GRID_POSITIONS[r][c];

        // 1. Calcula a largura (span horizontal)
        let w = 0;
        while (c + w < 7 && GRID_POSITIONS[r][c + w] === pos && !visited[r][c + w]) w++;

        // 2. Calcula a altura (span vertical) para essa largura
        let h = 0;
        while (r + h < 4) {
          let rowMatch = true;
          for (let i = 0; i < w; i++) {
            if (GRID_POSITIONS[r + h][c + i] !== pos || visited[r + h][c + i]) {
              rowMatch = false;
              break;
            }
          }
          if (!rowMatch) break;
          h++;
        }

        // Marcar como visitado
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            visited[r + i][c + j] = true;
          }
        }

        cells.push({ pos, r: r + 1, c: c + 1, h, w });
      }
    }

    const gridCellsHTML = cells.map(cell =>
      `<div class="grid-cell" data-pos="${cell.pos}" style="grid-row: ${cell.r} / span ${cell.h}; grid-column: ${cell.c} / span ${cell.w};">${cell.pos}</div>`
    ).join("");

    pitch.innerHTML = `
      <div class="pitch-grid">${gridCellsHTML}</div>
      <div class="pitch-lines">
        <div class="half-way-line"></div>
        <div class="center-circle"></div>
        <div class="center-spot"></div>
        <div class="penalty-box left"><div class="goal-box"></div></div>
        <div class="penalty-box right"><div class="goal-box"></div></div>
      </div>
      <svg id="chemistryLines" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"></svg>
    `;
  }

  // 2. Renderiza Titulares
  const teamStats = renderPitchPlayers(titulares, format, squad);

  // 3. Atualiza UI de Estatísticas e Radar
  updateTeamStatsUI(teamStats, titulares.length);

  // 4. Renderiza Química
  renderTeamChemistry(titulares, format, formatName);

  // 5. Renderiza Histórico e Banco
  renderMatchHistory(data);
  renderBench(reservas, benchSortValue);

  // 6. Finalização
  initDragAndDrop();
  if (isTableView) renderTable();
  if (window.lucide) window.lucide.createIcons();
}

function renderBench(reservas, benchSortValue) {
  const bench = document.getElementById("benchList");
  bench.innerHTML = "";

  let reservasDisplay = reservas;
  if (showOnlyFitPlayers) {
    reservasDisplay = reservas.filter(
      (p) => p.matchStatus !== "red" && p.matchStatus !== "injury",
    );
  }

  reservasDisplay.sort((a, b) => {
    if (benchSortValue === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    if (benchSortValue === "aptos") {
      const aFit = a.matchStatus !== "red" && a.matchStatus !== "injury";
      const bFit = b.matchStatus !== "red" && b.matchStatus !== "injury";
      if (aFit !== bFit) {
        return bFit - aFit;
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (
      (ALL_POSITIONS.indexOf(a.aptitude?.[0]) ?? 99) -
      (ALL_POSITIONS.indexOf(b.aptitude?.[0]) ?? 99)
    );
  });

  const benchFragment = document.createDocumentFragment();
  reservasDisplay.forEach((p) => {
    const res = document.createElement("div");
    const isGK = p.aptitude && p.aptitude[0] === "GOL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK, p.aptitude?.[0]);
    const mStatusHtml = getMatchStatusHTML(p.matchStatus);
    const fitLevel = p.fitness !== undefined ? p.fitness : 100;
    const fitColor =
      fitLevel > 70
        ? "var(--accent)"
        : fitLevel > 40
          ? "var(--warning)"
          : "var(--danger)";
    res.className = "reserve-item";
    res.dataset.id = p.id;
    res.innerHTML = `<div style="display: flex; justify-content: space-between; width: 100%; align-items: center; position: relative;">${mStatusHtml}<span style="font-size: 0.65rem; background: #222; padding: 2px 4px; border-radius: 4px; border: 1px solid #444; font-weight: 800; margin-left: ${mStatusHtml ? "12px" : "0"};">${p.aptitude?.[0] || "??"}</span><div style="display: flex; align-items: center; gap: 4px;">${getFormHTML(p.form)} <span style="background: ${getRatingColor(pRating)}; color: #000; font-size: 0.7rem; font-weight: 900; padding: 2px 4px; border-radius: 4px;">${pRating.toFixed(1)}</span></div></div><svg class="player-silhouette" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><div style="margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; width: 100%;"><strong>${p.name}</strong></div><div style="width: 90%; height: 5px; background: rgba(0,0,0,0.6); border: 1px solid rgba(0,0,0,0.8); border-radius: 2px; overflow: hidden; margin: 6px auto;"><div style="height: 100%; width: ${fitLevel}%; background: ${fitColor}; transition: width 0.3s ease;"></div></div><div style="font-size: 0.6rem; color: #888; margin-top: 2px;">Nº ${p.number} | ${p.age || "--"}A | ${p.foot ? p.foot.charAt(0).toUpperCase() : "D"}</div>`;
    res.onclick = () => openMenu(p.id);
    benchFragment.appendChild(res);
  });
  bench.appendChild(benchFragment);
}

function renderMatchHistory(data) {
  const history = (data && data.matchHistory) ? data.matchHistory : (window.matchHistory || []);
  const histContainer = document.getElementById("matchHistoryList");
  if (!histContainer) return;

  histContainer.innerHTML = "";
  if (history.length === 0) {
    histContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px; font-size: 0.8rem;">Nenhuma partida disputada ainda.</div>`;
    return;
  }

  [...history].reverse().slice(0, 10).forEach((m) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const isWin = m.userScore > m.oppScore;
    const isDraw = m.userScore === m.oppScore;
    const statusClass = isWin ? "win" : isDraw ? "draw" : "loss";
    const statusLabel = isWin ? "V" : isDraw ? "E" : "D";

    item.innerHTML = `
            <div class="history-status ${statusClass}">${statusLabel}</div>
            <div class="history-info">
                <div class="history-teams">${m.userTeam || "Time"} <span>${m.userScore} - ${m.oppScore}</span> ${m.oppTeam || "Opo."}</div>
                <div class="history-meta">${m.competition || "Amistoso"} | ${m.date || ""}</div>
            </div>
        `;
    histContainer.appendChild(item);
  });
}

export function renderTeamStats() {
  const goalsBody = document.getElementById("teamStatsGoalsBody");
  const assistsBody = document.getElementById("teamStatsAssistsBody");
  const matchesBody = document.getElementById("teamStatsMatchesBody");
  const ratingBody = document.getElementById("teamStatsRatingBody");
  const cardsBody = document.getElementById("teamStatsCardsBody");
  const tacklesBody = document.getElementById("teamStatsTacklesBody");

  if (!goalsBody) return;

  const playersWithStats = squad.filter(
    (p) =>
      p.matchesPlayed > 0 ||
      p.goals > 0 ||
      p.assists > 0 ||
      p.yellowCards > 0 ||
      p.tackles > 0,
  );

  const renderList = (
    container,
    list,
    valueKey,
    valueLabel,
    valueColor,
    formatValue = null,
    isRating = false,
  ) => {
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.slice(0, 15).forEach((p, i) => {
      const val = formatValue ? formatValue(p[valueKey]) : p[valueKey];
      if (val == 0 || val == "0.0") return;

      let displayColor = valueColor;
      if (isRating && p[valueKey]) {
        displayColor = getRatingColor(p[valueKey]);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td style="font-weight: bold; color: ${i < 3 ? "var(--warning)" : "#aaa"}; width: 40px;">${i + 1}º</td>
                <td style="text-align: left; font-weight: bold; color: #fff;">
                    ${p.name}
                    <span style="font-size: 0.65rem; color: #888; margin-left: 5px; font-weight: normal;">${p.aptitude?.[0] || "?"}</span>
                </td>
                <td style="font-weight: 900; color: ${displayColor}; font-size: 1.1rem; width: 60px;">${val}</td>
            `;
      frag.appendChild(tr);
    });
    if (frag.childNodes.length === 0) {
      container.innerHTML = `<tr><td colspan="3" style="padding: 20px; color: #888; text-align: center;">Nenhum registro.</td></tr>`;
    } else {
      container.appendChild(frag);
    }
  };

  const topScorers = [...playersWithStats].sort(
    (a, b) => (b.goals || 0) - (a.goals || 0),
  );
  renderList(goalsBody, topScorers, "goals", "Gols", "var(--accent)");
  const topAssists = [...playersWithStats].sort(
    (a, b) => (b.assists || 0) - (a.assists || 0),
  );
  renderList(assistsBody, topAssists, "assists", "Assis.", "#00aaff");
  const topMatches = [...playersWithStats].sort(
    (a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0),
  );
  renderList(matchesBody, topMatches, "matchesPlayed", "Jogos", "#4caf50");
  const topRating = [...playersWithStats]
    .filter((p) => p.matchesPlayed > 0)
    .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  renderList(
    ratingBody,
    topRating,
    "avgRating",
    "Nota",
    "var(--warning)",
    (val) => val.toFixed(1),
    true,
  );
  const topCards = [...playersWithStats].sort(
    (a, b) => (b.yellowCards || 0) - (a.yellowCards || 0),
  );
  renderList(cardsBody, topCards, "yellowCards", "CA", "var(--danger)");

  if (tacklesBody) {
    const topTackles = [...playersWithStats].sort(
      (a, b) => (b.tackles || 0) - (a.tackles || 0),
    );
    renderList(tacklesBody, topTackles, "tackles", "Desar.", "#9c27b0");
  }
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
  } else {
    // Drop em área vazia: Tenta encontrar o primeiro slot null nos titulares (0-10)
    let firstEmptySlot = -1;
    for (let i = 0; i < 11; i++) {
      if (squad[i] === null) {
        firstEmptySlot = i;
        break;
      }
    }

    if (firstEmptySlot !== -1) {
      const resIndex = squad.findIndex(x => x && x.id === reserveId);
      if (resIndex !== -1) {
        const p = squad[resIndex];
        p.status = "titular";
        squad[firstEmptySlot] = p;
        if (resIndex >= 11) {
          squad.splice(resIndex, 1);
        } else {
          squad[resIndex] = null;
        }
        saveToLocal();
        render();
      }
    } else if (closestTitularId) {
      // Se estiver cheio, troca com o mais próximo independente da distância (melhor UX)
      performSwap(closestTitularId, reserveId);
      render();
    }
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
        const resPlayer = squad.find(
          (x) => x.id === parseInt(res.dataset.id, 10),
        );
        if (
          resPlayer &&
          (resPlayer.matchStatus === "red" ||
            resPlayer.matchStatus === "injury")
        ) {
          showCustomModal(
            "Jogadores suspensos ou machucados não podem ser escalados.",
            "alert",
            "btn-danger",
          );
          return;
        }
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
    if (reserveId) {
      const resPlayer = squad.find((x) => x.id === parseInt(reserveId, 10));
      if (
        resPlayer &&
        (resPlayer.matchStatus === "red" || resPlayer.matchStatus === "injury")
      ) {
        showCustomModal(
          "Jogadores suspensos ou machucados não podem ser escalados.",
          "alert",
          "btn-danger",
        );
        return;
      }
      return handleSubstitution(parseInt(reserveId, 10), e.clientX, e.clientY);
    }
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId) {
      handlePlayerMove(parseInt(playerId, 10), e.clientX, e.clientY);
      render();
    }
  };

  const benchList = document.getElementById("benchList");
  if (benchList) {
    benchList.ondragover = (e) => e.preventDefault();
    benchList.ondrop = (e) => {
      e.preventDefault();
      const pId = e.dataTransfer.getData("playerId");
      if (pId) {
        const pIdx = squad.findIndex(x => x && x.id === parseInt(pId, 10));
        if (pIdx !== -1 && pIdx < 11) {
          const p = squad[pIdx];
          p.status = "reserva";
          squad[pIdx] = null; // Libera o slot no campo
          squad.push(p);      // Adiciona ao final do banco
          saveToLocal();
          render();
        }
      }
    };
  }
}

async function setupEventListeners() {
  initEditorEvents();
  initTableEvents();

  window.addEventListener("viewChanged", (e) => {
    switchMainView(e.detail);
  });

  // Religando os botões do Menu de Navegação Lateral
  document
    .getElementById("navDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));
  document
    .getElementById("navPitchBtn")
    ?.addEventListener("click", () => switchMainView("pitch"));
  document
    .getElementById("navTableBtn")
    ?.addEventListener("click", () => switchMainView("table"));

  document
    .getElementById("dashToPitchBtn")
    ?.addEventListener("click", () => switchMainView("pitch"));
  document
    .getElementById("dashToTableBtn")
    ?.addEventListener("click", () => switchMainView("table"));

  document.getElementById("dashToLeagueBtn")?.addEventListener("click", () => {
    switchMainView("league");
    renderLeagueData();
  });

  document
    .getElementById("dashToTeamStatsBtn")
    ?.addEventListener("click", () => switchMainView("teamStats"));
  document
    .getElementById("navTeamStatsDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));

  document
    .getElementById("navLeagueDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));

  document.getElementById("resetSystemBtn")?.addEventListener("click", async () => {
    const proceed = await showCustomModal(
      "Isso apagará todo o seu progresso salvo para este time (escalação, táticas personalizadas e edições) e recarregará os dados originais do arquivo JSON. Deseja continuar?",
      "confirm",
      "btn-danger"
    );
    if (proceed) {
      await resetSystem();
    }
  });

  const teamSelect = document.getElementById("teamSelect");
  if (teamSelect) {
    teamSelect.addEventListener("change", async (e) => {
      const proceed = await showCustomModal(
        "Mudar de time descartará as alterações e edições não salvas do time atual (lembre-se de clicar em 'Salvar JSON' antes se fez mudanças). Deseja carregar este novo elenco?",
        "confirm",
        "btn-danger",
      );
      if (proceed) {
        await Storage.setCurrentTeamFile(e.target.value);
        await Storage.removeSquad(); // Limpa progresso pendente
        await Storage.removeTactics(); // Limpa progresso pendente
        location.reload(); // Recarrega a página engatando no novo time
      } else {
        e.target.value = (await Storage.getCurrentTeamFile()) || "vasco.json";
      }
    });
  }

  document
    .getElementById("healSquadBtn")
    ?.addEventListener("click", async () => {
      const proceed = await showCustomModal(
        "Deseja curar todos os jogadores lesionados e limpar as suspensões da equipe?",
        "confirm",
        "btn-primary",
      );
      if (proceed) {
        const healed = healSquad();
        if (healed) {
          renderApp();
          showCustomModal(
            "O Departamento Médico foi esvaziado com sucesso!",
            "alert",
            "btn-primary",
          );
        } else {
          showCustomModal(
            "Nenhum jogador precisava de cuidados médicos.",
            "alert",
            "btn-secondary",
          );
        }
      }
    });

  document
    .getElementById("simulateMatchBtn")
    .addEventListener("click", openMatchSimulation);

  document
    .getElementById("sidebarSimulateMatchBtn")
    ?.addEventListener("click", openMatchSimulation);

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
        await Storage.setCurrentFormation(name);
      }
    });

  const formationSelect = document.getElementById("formationSelect");
  if (formationSelect) {
    const savedFormation = await Storage.getCurrentFormation();
    if (savedFormation) {
      formationSelect.value = savedFormation;
    } else {
      formationSelect.value = "4-3-3";
      await Storage.setCurrentFormation("4-3-3");
    }

    formationSelect.addEventListener("change", async (e) => {
      await Storage.setCurrentFormation(e.target.value);
      resetFormationAlignment(e.target.value);
      render();
    });
  }

  initLeagueEvents();

  const fitFilterBtn = document.getElementById("toggleFitFilterBtn");
  if (fitFilterBtn) {
    fitFilterBtn.addEventListener("click", () => {
      showOnlyFitPlayers = !showOnlyFitPlayers;
      if (showOnlyFitPlayers) {
        fitFilterBtn.style.background = "var(--accent)";
        fitFilterBtn.style.color = "#000";
      } else {
        fitFilterBtn.style.background = "transparent";
        fitFilterBtn.style.color = "var(--text)";
      }
      render();
    });
  }
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
  document.getElementById("benchList").addEventListener("wheel", function (e) {
    if (e.deltaY !== 0) {
      e.preventDefault();
      this.scrollLeft += e.deltaY;
    }
  });
}

async function loadTeams() {
  try {
    const response = await fetch("data/teamsList.json");
    if (!response.ok) throw new Error("Falha ao carregar lista de times.");
    const teams = await response.json();

    const teamSelect = document.getElementById("teamSelect");
    const simOpponentSelect = document.getElementById("simOpponentSelect");

    if (teamSelect) {
      teamSelect.innerHTML = "";
      teams.sort((a, b) => a.name.localeCompare(b.name)).forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.file;
        opt.innerText = t.name;
        teamSelect.appendChild(opt);
      });
      teamSelect.value = (await Storage.getCurrentTeamFile()) || "vasco.json";
    }

    if (simOpponentSelect) {
      simOpponentSelect.innerHTML = '<option value="generic">Adversário Genérico (OVR 65)</option>';
      const sortedTeams = teams.sort((a, b) => a.name.localeCompare(b.name));
      sortedTeams.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.file;
        opt.innerText = `${t.name} (${t.league || "Extra"})`;
        simOpponentSelect.appendChild(opt);
      });

      const setupTeamSelect = document.getElementById("setupTeamSelect");
      if (setupTeamSelect) {
        setupTeamSelect.innerHTML = '<option value="">-- Selecione um Clube --</option>';

        // Agrupar times por liga
        const leagues = {};
        sortedTeams.forEach(t => {
          const leagueName = t.league || "Outros";
          if (!leagues[leagueName]) leagues[leagueName] = [];
          leagues[leagueName].push(t);
        });

        // Criar optgroups
        Object.keys(leagues).sort().forEach(league => {
          const group = document.createElement("optgroup");
          group.label = league.toUpperCase();
          leagues[league].forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.file;
            opt.innerText = t.name;
            group.appendChild(opt);
          });
          setupTeamSelect.appendChild(group);
        });
      }
    }
    return teams;
  } catch (error) {
    console.error("Erro ao carregar lista de times:", error);
    return [];
  }
}

let _mainCalled = false;
async function main() {
  if (_mainCalled) { console.warn("main() chamado mais de uma vez — ignorado."); return; }
  _mainCalled = true;
  dbgToast("⚙️ Iniciando sistema...", "#333");
  try {
    // 1. Carrega os times
    let teams = [];
    try {
      dbgToast("📋 Carregando lista de times...", "#333");
      teams = await loadTeams();
      dbgToast(`✅ ${teams.length} times carregados`, "#1a5c2a");
    } catch (e) {
      dbgToast("⚠️ Erro ao carregar times: " + e.message, "#8b4000");
    }

    // 2. Inicializa os eventos do menu
    initCareerEvents(teams);

    // 3. Botão de Reset
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.onclick = async () => {
        const proceed = await showCustomModal(
          "ATENÇÃO: Isso apagará todas as suas edições e táticas. Deseja realmente resetar?",
          "confirm",
          "btn-danger",
        );
        if (proceed) await resetData();
      };
    }

    // 4. Inicializa Sistema de Dados
    dbgToast("💾 Conectando ao banco de dados...", "#333");
    const initResult = await initSystem();
    dbgToast("🔍 initSystem retornou: " + JSON.stringify(initResult), initResult === true ? "#1a5c2a" : "#8b0000");

    if (initResult === true) {
      const coachInfo = await Storage.getCoachInfo();
      dbgToast("👤 Coach info: " + (coachInfo ? coachInfo.name : "NENHUM"), "#333");

      if (coachInfo) {
        dbgToast("📂 Carregando carreira de " + coachInfo.name, "#1a3a5c");
        showScreen("mainApp");
        switchMainView("dashboard");
        updateDashboardCoach(coachInfo);
        await setupEventListeners();
        render();
        dbgToast("✅ Dashboard carregado!", "#1a5c2a");
      } else {
        dbgToast("🆕 Nenhuma carreira. Menu pronto!", "#1a5c2a");
      }
    } else {
      dbgToast("❌ Falha no initSystem: " + initResult, "#8b0000");
    }
  } catch (error) {
    dbgToast("❌ ERRO CRÍTICO: " + error.message, "#8b0000", 30000);
    console.error("❌ Erro crítico no Main:", error);
  }
}

function updateDashboardCoach(info) {
  const nameEl = document.getElementById("dashCoachName");
  const styleEl = document.getElementById("dashCoachStyle");
  if (nameEl) nameEl.innerText = `Treinador: ${info.name}`;
  if (styleEl) styleEl.innerText = `DNA: ${info.playstyle}`;
}

// --- CONTROLE DE FLUXO DE CARREIRA (NOVO) ---
function showScreen(screenId) {
  const screens = ["mainMenuScreen", "coachCreationScreen", "teamSelectionScreen", "mainApp"];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      // mainApp e teamSelectionScreen precisam de flex para o layout funcionar
      el.style.display = (id === "mainApp" || id === "teamSelectionScreen") ? "flex" : "flex";
    } else {
      el.style.display = "none";
    }
  });
  if (window.lucide) window.lucide.createIcons();
}

function initCareerEvents(teams) {
  // Menu Principal
  const newGameBtn = document.getElementById("menuNewGameBtn");
  if (newGameBtn) newGameBtn.onclick = () => {
    dbgToast("🆕 Indo para criação do treinador...", "#1a3a5c");
    showScreen("coachCreationScreen");
  };

  const loadGameBtn = document.getElementById("menuLoadGameBtn");
  if (loadGameBtn) loadGameBtn.onclick = async () => {
    dbgToast("📂 Buscando carreira salva...", "#333");
    try {
      const coachInfo = await Storage.getCoachInfo();
      if (coachInfo) {
        dbgToast("✅ Carreira encontrada: " + coachInfo.name, "#1a5c2a");
        showScreen("mainApp");
        switchMainView("dashboard");
        updateDashboardCoach(coachInfo);
        setupEventListeners();
        render();
      } else {
        dbgToast("⚠️ Nenhuma carreira encontrada!", "#8b4000");
        alert("Nenhuma carreira encontrada! Inicie um Novo Jogo.");
      }
    } catch (e) {
      dbgToast("❌ Erro ao carregar jogo: " + e.message, "#8b0000");
    }
  };

  const exitBtn = document.getElementById("menuExitBtn");
  if (exitBtn) exitBtn.onclick = () => {
    if (confirm("Deseja realmente sair?")) window.close();
  };
  const nextBtn = document.getElementById("goToTeamSelectBtn");
  if (nextBtn) nextBtn.onclick = () => {
    const name = document.getElementById("setupCoachName").value;
    if (!name) return alert("Por favor, digite o nome do treinador.");
    dbgToast("⚽ Indo para seleção de time...", "#1a3a5c");
    renderVisualTeams(teams);
    showScreen("teamSelectionScreen");
  };

  const backBtn = document.getElementById("backToCoachBtn");
  if (backBtn) backBtn.onclick = () => showScreen("coachCreationScreen");
}

// Mapa de cores por liga para identidade visual
const LEAGUE_COLORS = {
  "Serie A": "#00d4aa", "Serie B": "#00aaff", "Premier League": "#3d195b",
  "La Liga": "#ee8707", "LALIGA EA SPORTS": "#ee8707", "Bundesliga": "#d20515",
  "Ligue 1": "#091c3e", "Serie A TIM": "#0066cc", "Eredivisie": "#ff6600",
  "Brasileirao Assaí": "#009c3b", "Brasileirao Betano": "#009c3b",
  "Champions League": "#001d60", "Europa League": "#f77f00",
  "MLS": "#002040", "Liga MX": "#006847",
};
const LEAGUE_EMOJIS = {
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "La Liga": "🇪🇸", "LALIGA EA SPORTS": "🇪🇸",
  "Bundesliga": "🇩🇪", "Ligue 1": "🇫🇷", "Serie A": "🇮🇹",
  "Eredivisie": "🇳🇱", "MLS": "🇺🇸", "Liga MX": "🇲🇽",
  "Brasileirao Assaí": "🇧🇷", "Brasileirao Betano": "🇧🇷",
  "Champions League": "⭐", "Europa League": "🟠",
};

function renderVisualTeams(teams) {
  const container = document.getElementById("teamSelectionScreen");
  if (!container) return;

  // Agrupar por liga
  const leagues = {};
  teams.forEach(t => {
    const l = t.league || "Outros";
    if (!leagues[l]) leagues[l] = [];
    leagues[l].push(t);
  });
  const leagueNames = Object.keys(leagues).sort();

  // ── TELA 1: Seleção de Campeonato ─────────────────────────────────────
  function showLeagueGrid() {
    container.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#050505;">
                <div style="padding:30px 40px 20px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h1 style="color:#fff;margin:0;font-size:2.2rem;font-weight:900;">ESCOLHA O <span style="color:var(--accent);">CAMPEONATO</span></h1>
                        <p style="color:#555;margin-top:5px;font-size:0.85rem;">${leagueNames.length} campeonatos disponíveis • ${teams.length} times no total</p>
                    </div>
                    <button id="backToCoachBtnInner" style="background:transparent;border:1px solid #333;color:#666;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:0.85rem;">← VOLTAR</button>
                </div>

                <input type="text" id="leagueSearchInput" placeholder="🔍 Buscar campeonato..."
                    style="margin:0 40px 15px;padding:10px 16px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;font-size:0.9rem;outline:none;flex-shrink:0;width:calc(100% - 80px);">

                <div id="leagueGrid" style="flex:1;overflow-y:auto;padding:0 30px 30px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;align-content:start;">
                </div>
            </div>
        `;

    document.getElementById("backToCoachBtnInner").onclick = () => showScreen("coachCreationScreen");

    const leagueGrid = document.getElementById("leagueGrid");
    const leagueSearch = document.getElementById("leagueSearchInput");

    function renderLeagueCards(filter = "") {
      leagueGrid.innerHTML = "";
      leagueNames
        .filter(l => l.toLowerCase().includes(filter.toLowerCase()))
        .forEach(l => {
          const count = leagues[l].length;
          const avgOvr = Math.round(leagues[l].reduce((s, t) => s + (t.ovr || 75), 0) / count);
          const color = LEAGUE_COLORS[l] || "#00ff88";
          const initials = l.split(" ").map(w => w[0]).filter(Boolean).join("").substring(0, 3).toUpperCase();

          const card = document.createElement("div");
          // Layout fixo: 3 zonas (logo | nome | stats) — sem overflow
          card.style.cssText = `
            padding: 18px 14px 16px; cursor: pointer; border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.07); background: #0f0f0f;
            transition: all 0.22s; position: relative; overflow: hidden;
            display: flex; flex-direction: column; align-items: center;
            text-align: center; min-height: 160px;
          `;
          card.innerHTML = `
            <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${color},${color}66);"></div>
            <!-- Logo: imagem real ou fallback circular -->
            <div style="width:56px;height:56px;flex-shrink:0;margin-bottom:10px;display:flex;align-items:center;justify-content:center;">
              <img class="league-logo-img" data-league="${l}"
                style="max-width:56px;max-height:56px;object-fit:contain;display:none;"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                onload="this.style.display='block';this.nextElementSibling.style.display='none';">
              <div class="league-logo-fallback" style="width:52px;height:52px;border-radius:50%;background:${color}22;border:2px solid ${color}55;display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:900;color:${color};">${initials}</div>
            </div>
            <!-- Nome com quebra de linha segura -->
            <div style="font-weight:900;color:#fff;font-size:0.88rem;line-height:1.3;word-break:break-word;overflow-wrap:break-word;width:100%;margin-bottom:auto;">${l}</div>
            <!-- Stats no rodapé -->
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:10px;">
              <span style="font-size:0.65rem;color:#555;background:#1a1a1a;padding:2px 7px;border-radius:5px;">${count} times</span>
              <span style="font-size:0.65rem;color:${color};background:${color}18;padding:2px 7px;border-radius:5px;border:1px solid ${color}33;">OVR ${avgOvr}</span>
            </div>
          `;
          card.addEventListener("mouseenter", () => {
            card.style.borderColor = color;
            card.style.background = `${color}0a`;
            card.style.transform = "translateY(-3px)";
            card.style.boxShadow = `0 8px 25px ${color}18`;
          });
          card.addEventListener("mouseleave", () => {
            card.style.borderColor = "rgba(255,255,255,0.07)";
            card.style.background = "#0f0f0f";
            card.style.transform = "";
            card.style.boxShadow = "";
          });
          card.onclick = () => showTeamsOfLeague(l, leagues[l]);
          leagueGrid.appendChild(card);
        });

      // Carrega logos de ligas de forma lazy
      loadLeagueLogosLazy();
    }

    renderLeagueCards();
    leagueSearch.addEventListener("input", () => renderLeagueCards(leagueSearch.value));
  }

  // ── TELA 2: Times do Campeonato ────────────────────────────────────────
  function showTeamsOfLeague(leagueName, teamsList) {
    const color = LEAGUE_COLORS[leagueName] || "#00ff88";
    const palette = ["#00ff88", "#00aaff", "#ff6b35", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#f43f5e", "#84cc16", "#6366f1"];
    const getColor = name => palette[name.charCodeAt(0) % palette.length];
    const ovrColor = o => o >= 85 ? "#00f2ff" : o >= 80 ? "#00ff88" : o >= 74 ? "#a3e635" : o >= 68 ? "#ffcc00" : o >= 62 ? "#ff8800" : "#ff4444";

    container.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#050505;">
                <div style="padding:20px 40px 15px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #111;">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <button id="backToLeaguesBtn" style="background:transparent;border:1px solid #333;color:#666;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;white-space:nowrap;">← Campeonatos</button>
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:6px;height:24px;background:${color};border-radius:3px;"></div>
                                <h2 style="color:#fff;margin:0;font-size:1.5rem;font-weight:900;">${leagueName}</h2>
                            </div>
                            <p style="color:#555;margin:3px 0 0 16px;font-size:0.8rem;">${teamsList.length} times • clique para selecionar</p>
                        </div>
                    </div>
                    <input type="text" id="teamSearchInput" placeholder="🔍 Buscar time..."
                        style="width:200px;padding:9px 14px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;font-size:0.85rem;outline:none;">
                </div>
                <div id="teamCardsGrid" style="flex:1;overflow-y:auto;padding:20px 30px 30px;display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;align-content:start;">
                </div>
            </div>
        `;

    document.getElementById("backToLeaguesBtn").onclick = () => showLeagueGrid();

    const grid = document.getElementById("teamCardsGrid");
    const searchEl = document.getElementById("teamSearchInput");

    function renderCards(filter = "") {
      const filtered = teamsList
        .filter(t => t.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
      grid.innerHTML = "";
      filtered.forEach(team => {
        const tc = getColor(team.name);
        const ovr = team.ovr || 75;
        const initials = team.name.split(" ").map(w => w[0]).filter(Boolean).join("").substring(0, 3).toUpperCase();

        const card = document.createElement("div");
        card.style.cssText = `padding:16px 12px;text-align:center;cursor:pointer;border-radius:12px;border:1px solid rgba(255,255,255,0.07);background:#0f0f0f;transition:all 0.2s;position:relative;overflow:hidden;`;
        card.innerHTML = `
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color};opacity:0.7;"></div>
          <div class="team-badge-wrap" style="width:60px;height:60px;margin:0 auto 10px;position:relative;display:flex;align-items:center;justify-content:center;">
            <img class="team-badge-img"
              data-name="${team.name}"
              src=""
              style="width:60px;height:60px;object-fit:contain;display:none;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
              onload="this.style.display='block';this.nextElementSibling.style.display='none';">
            <div class="team-badge-fallback" style="width:60px;height:60px;background:${tc}22;border:2px solid ${tc}55;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.95rem;font-weight:900;color:${tc};">${initials}</div>
          </div>
          <div style="font-weight:800;color:#fff;font-size:0.82rem;line-height:1.3;margin-bottom:7px;word-break:break-word;">${team.name}</div>
          <div style="display:inline-block;padding:3px 9px;border-radius:10px;background:${ovrColor(ovr)}18;border:1px solid ${ovrColor(ovr)}44;font-size:0.68rem;font-weight:900;color:${ovrColor(ovr)};">OVR ${ovr}</div>
        `;
        card.addEventListener("mouseenter", () => { card.style.borderColor = color; card.style.transform = "translateY(-3px)"; card.style.boxShadow = `0 6px 20px ${color}18`; });
        card.addEventListener("mouseleave", () => { card.style.borderColor = "rgba(255,255,255,0.07)"; card.style.transform = ""; card.style.boxShadow = ""; });
        card.onclick = () => finalizeCareerSetup(team);
        grid.appendChild(card);
      });

      // Carrega os escudos de forma lazy (IntersectionObserver)
      loadBadgesLazy();
    }

    renderCards();
    searchEl.addEventListener("input", () => renderCards(searchEl.value.trim()));
  }

  // ── Início: mostra a grade de campeonatos ──────────────────────────────
  showLeagueGrid();
}

// ── SISTEMA DE BADGES (TIMES E LIGAS) ──────────────────────────────────────

// Cache e throttle para não spammar a API
const _badgeCache = {};
const _leagueBadgeCache = {};
let _leagueBadgeMap = null;
let _pendingLeagueFetch = null;

// Busca escudo de um time via thesportsdb
async function fetchTeamBadge(teamName) {
  try {
    let cleanName = teamName.replace(/\s*\(Fem\)$/i, "").trim();
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
    if (!r.ok) return null;
    const data = await r.json();
    
    let badge = data?.teams?.[0]?.strTeamBadge;
    
    // Se não achou com (Fem), tenta com o nome limpo
    if (!badge && cleanName !== teamName) {
      const r2 = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(cleanName)}`);
      const data2 = await r2.json();
      badge = data2?.teams?.[0]?.strTeamBadge;
    }
    
    return badge || null;
  } catch { return null; }
}

// Carrega TODOS os campeonatos de futebol de uma vez (1 chamada)
async function getLeagueBadgeMap() {
  if (_leagueBadgeMap) return _leagueBadgeMap;
  if (_pendingLeagueFetch) return _pendingLeagueFetch;
  _pendingLeagueFetch = (async () => {
    try {
      const r = await fetch("https://www.thesportsdb.com/api/v1/json/3/all_leagues.php");
      if (!r.ok) return {};
      const data = await r.json();
      const map = {};
      const aliases = {
        "laliga ea sports": "Spanish La Liga",
        "premier league": "English Premier League",
        "bundesliga": "German Bundesliga",
        "ligue 1 mcdonald's": "French Ligue 1",
        "serie a enilive": "Italian Serie A",
        "liga f": "Spanish Liga F",
        "barclays wsl": "English WSL",
        "nwsl": "USA NWSL",
        "gpfbl": "German Frauen Bundesliga",
        "brasileirão série a": "Brazilian Serie A",
        "brasileirao serie a": "Brazilian Serie A",
        "brasileirão série b": "Brazilian Serie B",
        "libertadores": "Copa Libertadores",
        "sudamericana": "Copa Sudamericana",
        "champions league": "UEFA Champions League",
        "europa league": "UEFA Europa League"
      };

      (data?.leagues || []).forEach(l => {
        if (l.strBadge) {
          map[l.strLeague] = l.strBadge;
          map[l.strLeague.toLowerCase()] = l.strBadge;
        }
      });

      // Aplica aliases se a liga destino existir no mapa
      Object.entries(aliases).forEach(([alias, target]) => {
        if (map[target.toLowerCase()]) {
          map[alias] = map[target.toLowerCase()];
        }
      });
      _leagueBadgeMap = map;
      return map;
    } catch { _leagueBadgeMap = {}; return {}; }
  })();
  return _pendingLeagueFetch;
}

// Lazy loading para escudos de TIMES (com delay para evitar rate limit)
function loadBadgesLazy() {
  const imgs = document.querySelectorAll(".team-badge-img[data-name]");
  let delay = 0;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const name = img.dataset.name;
      if (img.dataset.loaded) return;
      img.dataset.loaded = "1";
      observer.unobserve(img);
      // Escalonamento para evitar 429 (rate limit)
      setTimeout(async () => {
        if (!_badgeCache[name]) {
          _badgeCache[name] = await fetchTeamBadge(name);
        }
        if (_badgeCache[name] && img.isConnected) {
          img.src = _badgeCache[name];
        }
      }, delay);
      delay = Math.min(delay + 120, 3000); // max 3s de espera
    });
  }, { rootMargin: "150px" });
  imgs.forEach(img => observer.observe(img));
}

// Lazy loading para LOGOS DE LIGAS
function loadLeagueLogosLazy() {
  const imgs = document.querySelectorAll(".league-logo-img[data-league]");
  getLeagueBadgeMap().then(map => {
    imgs.forEach(img => {
      if (img.dataset.loaded) return;
      img.dataset.loaded = "1";
      const name = img.dataset.league;
      // Tenta nome exato, depois lowercase
      const url = map[name] || map[name.toLowerCase()] || null;
      if (url && img.isConnected) {
        img.src = url;
      }
    });
  });
}
// ───────────────────────────────────────────────────────────────────────────

async function finalizeCareerSetup(selectedTeam) {
  dbgToast("💾 Salvando carreira...", "#1a3a5c");
  try {
    const coachName = document.getElementById("setupCoachName").value;
    const formation = document.getElementById("setupFormationSelect").value;
    const checkedStyle = document.querySelector('input[name="setupPlaystyle"]:checked');
    const playstyle = checkedStyle ? checkedStyle.value : "possession";

    dbgToast(`📝 Coach: ${coachName} | Time: ${selectedTeam.name} | File: ${selectedTeam.file}`, "#1a3a5c");

    const coachData = {
      name: coachName,
      teamFile: selectedTeam.file,
      teamName: selectedTeam.name,
      specialty: formation,
      playstyle: playstyle,
      startDate: new Date().toLocaleDateString('pt-BR')
    };

    await Storage.saveCoachInfo(coachData);
    dbgToast("✅ CoachInfo salvo!", "#1a5c2a");

    await Storage.setCurrentTeamFile(selectedTeam.file);
    dbgToast("✅ TeamFile salvo: " + selectedTeam.file, "#1a5c2a");

    await Storage.setCurrentFormation(formation);
    dbgToast("✅ Formação salva: " + formation, "#1a5c2a");

    dbgToast("🔄 Recarregando jogo...", "#333");
    document.body.style.opacity = "0";
    setTimeout(() => window.location.reload(), 800);
  } catch (e) {
    dbgToast("❌ Erro ao salvar carreira: " + e.message, "#8b0000", 20000);
    console.error("Erro no finalizeCareerSetup:", e);
  }
}

// Inicialização
main();
function renderPitchPlayers(titulares, format, squad) {
  const pitch = document.getElementById("pitch");
  const pitchFragment = document.createDocumentFragment();

  let stats = {
    totalRating: 0,
    totalAge: 0,
    fitCount: 0,
    destrosCount: 0,
    canhotosCount: 0,
    ambiCount: 0,
    estrangeirosCount: 0,
    totalVel: 0,
    totalFin: 0,
    totalPas: 0,
    totalDri: 0,
    totalDef: 0,
    totalFis: 0,
    totalSta: 0,
    outfieldCount: 0,
    playstylesCount: {},
  };

  titulares.forEach((p, i) => {
    if (!p || !format || !format[i]) return;
    const { t: topPos = 50, l: leftPos = 50 } = format[i];
    const currentZone = getEfootballPosition(topPos, leftPos);
    const fitClass = checkPositionFit(p, currentZone);
    const isGK = p.aptitude && p.aptitude[0] === "GOL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK, currentZone);
    let displayRating = pRating;

    if (fitClass === "fit-warning") {
      displayRating = (p.aptitude && p.aptitude.includes("GOL")) || currentZone === "GOL" ? 1.0 : Math.max(1.0, pRating - 2.5);
    }

    const fitLevel = p.fitness !== undefined ? p.fitness : 100;
    const fitColorBar = fitLevel > 70 ? "var(--accent)" : fitLevel > 40 ? "var(--warning)" : "var(--danger)";
    const fitBarHtml = `<div style="position:absolute; top: calc(100% + 32px); left: 50%; transform: translateX(-50%); width: 34px; height: 4px; background: rgba(0,0,0,0.6); border: 1px solid rgba(0,0,0,0.8); border-radius: 2px; overflow: hidden; z-index: 15;"><div style="height: 100%; width: ${fitLevel}%; background: ${fitColorBar}; transition: width 0.3s ease;"></div></div>`;

    let liveStatusClass = "";
    if (p.matchStatus === "red") liveStatusClass = "is-suspended";
    if (p.matchStatus === "injury") liveStatusClass = "is-injured";

    stats.totalRating += displayRating;
    stats.totalAge += p.age || 25;
    if (fitClass === "fit-perfect") stats.fitCount++;
    if (p.foot === "Canhoto") stats.canhotosCount++;
    else if (p.foot === "Ambidestro") stats.ambiCount++;
    else stats.destrosCount++;

    if (!isGK) {
      const s = p.stats || {};
      stats.totalVel += s.vel || s.pac || s.spd || 50;
      stats.totalFin += s.fin || s.sho || s.atk || 50;
      stats.totalPas += s.pas || 50;
      stats.totalDri += s.dri || s.atk || 50;
      stats.totalDef += s.def || 50;
      stats.totalFis += s.fis || s.phy || s.str || 50;
      stats.totalSta += s.sta || s.stm || 50;
      stats.outfieldCount++;
    }

    if (p.nationality && p.nationality !== "BR") stats.estrangeirosCount++;
    if (p.playstyle) stats.playstylesCount[p.playstyle] = (stats.playstylesCount[p.playstyle] || 0) + 1;

    const el = document.createElement("div");
    el.className = `player ${fitClass} ${liveStatusClass}`;
    el.dataset.id = p.id;
    el.style.cssText = `top: ${topPos}%; left: ${leftPos}%;`;
    el.innerHTML = `<div class="p-icon" style="border-color: ${getRatingColor(pRating)}">${getMatchStatusHTML(p.matchStatus)}${p.captain ? '<div class="captain-armband">C</div>' : ""}<div class="p-pos-badge">${currentZone}</div><div class="p-form">${getFormHTML(p.form)}</div>${p.number}<span class="p-badge" style="background: ${getRatingColor(displayRating)}">${displayRating.toFixed(1)}</span></div><div class="p-name">${p.name}</div>${fitBarHtml}`;
    el.draggable = true;
    el.ondragstart = (e) => {
      e.dataTransfer.setData("playerId", p.id);
      highlightZones(p);
    };
    el.ondragend = clearZones;
    el.onclick = () => { if (!el.classList.contains("dragging")) openMenu(p.id); };

    // Drop zone logic for swapping
    el.ondragover = (e) => { e.preventDefault(); el.classList.add("drag-over-player"); };
    el.ondragleave = () => el.classList.remove("drag-over-player");
    el.ondrop = (e) => {
      e.preventDefault();
      el.classList.remove("drag-over-player");
      clearZones();
      const draggedId = e.dataTransfer.getData("playerId");
      if (draggedId && draggedId !== p.id.toString()) {
        swapTitulares(parseInt(draggedId, 10), p.id);
        render();
      } else {
        const reserveId = e.dataTransfer.getData("reserveId");
        if (reserveId) {
          const resPlayer = squad.find(x => x.id === parseInt(reserveId, 10));
          if (resPlayer && (resPlayer.matchStatus === "red" || resPlayer.matchStatus === "injury")) {
            showCustomModal("Jogadores suspensos ou machucados não podem ser escalados.", "alert", "btn-danger");
            return;
          }
          performSwap(p.id, parseInt(reserveId, 10));
          render();
        }
      }
    };

    pitchFragment.appendChild(el);
  });
  if (pitch) pitch.appendChild(pitchFragment);
  return stats;
}

function updateTeamStatsUI(stats, titularesCount) {
  if (titularesCount === 0) return;

  const divBy = stats.outfieldCount > 0 ? stats.outfieldCount : 1;
  const avgStats = {
    vel: Math.round(stats.totalVel / divBy),
    fin: Math.round(stats.totalFin / divBy),
    pas: Math.round(stats.totalPas / divBy),
    dri: Math.round(stats.totalDri / divBy),
    def: Math.round(stats.totalDef / divBy),
    fis: Math.round(stats.totalFis / divBy),
    sta: Math.round(stats.totalSta / divBy),
  };

  drawRadar("teamRadarChart", avgStats);

  const avgRating = stats.totalRating / titularesCount;
  const starsEl = document.getElementById("teamStars");
  if (starsEl) starsEl.innerText = getStarsHTML(avgRating);

  const ageEl = document.getElementById("teamAge");
  if (ageEl) ageEl.innerText = (stats.totalAge / titularesCount).toFixed(1);

  const ovrEl = document.getElementById("teamOverall");
  if (ovrEl) {
    ovrEl.innerText = avgRating.toFixed(1);
    ovrEl.style.color = getRatingColor(avgRating);
  }

  const fitEl = document.getElementById("teamFitness");
  if (fitEl) {
    fitEl.innerText = `${stats.fitCount}/${titularesCount}`;
    fitEl.style.color = stats.fitCount === titularesCount ? "var(--rating-top)" : stats.fitCount >= 8 ? "var(--rating-high)" : "var(--warning)";
  }

  const footEl = document.getElementById("teamFoot");
  if (footEl) footEl.innerText = `${stats.destrosCount}D | ${stats.canhotosCount}C${stats.ambiCount > 0 ? ` | ${stats.ambiCount}A` : ""}`;

  const atkEl = document.getElementById("teamAtk");
  if (atkEl) {
    atkEl.innerText = avgStats.fin;
    atkEl.style.color = getRatingColor(avgStats.fin / 10);
  }

  const defEl = document.getElementById("teamDef");
  if (defEl) {
    defEl.innerText = avgStats.def;
    defEl.style.color = getRatingColor(avgStats.def / 10);
  }

  const forEl = document.getElementById("teamForeigners");
  if (forEl) forEl.innerText = stats.estrangeirosCount;

  let topStyle = "--", maxCount = 0;
  for (const [style, count] of Object.entries(stats.playstylesCount)) {
    if (count > maxCount) { maxCount = count; topStyle = style; }
  }
  const psEl = document.getElementById("teamPlaystyle");
  if (psEl) {
    psEl.innerText = topStyle;
    psEl.title = topStyle;
  }
}

function renderTeamChemistry(titulares, format, formatName) {
  const svg = document.getElementById("chemistryLines");
  if (!svg || titulares.length === 0) return;

  const linesCounts = formatName.split("-").map(Number);
  const outfieldPlayers = [];

  titulares.forEach((p, i) => {
    if (!format[i]) return;
    if (format[i].l > 14) outfieldPlayers.push({ player: p, index: i, t: format[i].t, l: format[i].l });
  });

  outfieldPlayers.sort((a, b) => a.l - b.l);
  const lines = [];
  let currentIndex = 0;
  linesCounts.forEach((count) => {
    const currentLine = outfieldPlayers.slice(currentIndex, currentIndex + count);
    if (currentLine.length > 0) lines.push(currentLine);
    currentIndex += count;
  });

  const drawChemLine = (p1, p2) => {
    const fit1 = checkPositionFit(p1.player, getEfootballPosition(p1.t, p1.l));
    const fit2 = checkPositionFit(p2.player, getEfootballPosition(p2.t, p2.l));
    let stroke = "var(--rating-bad)", width = "1", dash = "4,4", op = "0.3";

    if (fit1 === "fit-perfect" && fit2 === "fit-perfect") {
      stroke = "var(--rating-high)"; width = "3"; dash = "none"; op = "0.6";
    } else if (fit1 === "fit-perfect" || fit2 === "fit-perfect") {
      stroke = "var(--rating-mid)"; width = "2"; dash = "6,4"; op = "0.5";
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.l + "%");
    line.setAttribute("y1", p1.t + "%");
    line.setAttribute("x2", p2.l + "%");
    line.setAttribute("y2", p2.t + "%");
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", width);
    line.setAttribute("stroke-dasharray", dash);
    line.style.opacity = op;
    svg.appendChild(line);
  };

  lines.forEach((lineGroup) => {
    lineGroup.sort((a, b) => a.t - b.t);
    for (let k = 0; k < lineGroup.length - 1; k++) {
      drawChemLine(lineGroup[k], lineGroup[k + 1]);
    }
  });
}

// Inicialização Final
main();
