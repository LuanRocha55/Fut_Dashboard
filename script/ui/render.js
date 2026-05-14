import { dbgToast } from "./uiUtils.js";
import { highlightZones, clearZones } from "./zones.js";
import { initDragAndDrop } from "./dragDrop.js";
import {
  squad,
  formations,
  ALL_POSITIONS,
  performSwap,
  calculateOVR,
  ensureCaptain,
} from "../core/appCore.js";
import {
  getEfootballPosition,
  checkPositionFit,
  swapTitulares,
} from "../tactics/pitchTactics.js";
import {
  getRatingColor,
  getStarsHTML,
  getFormHTML,
  getMatchStatusHTML,
  drawRadar,
  normalizeTeamName,
} from "./uiGraphics.js";
import { showCustomModal } from "./uiModal.js";
import { openMenu } from "../player/playerEditor.js";
import {
  isTableView,
  renderTable,
} from "./uiTableView.js";
import { Storage } from "../core/appStorage.js";
import { showOnlyFitPlayers } from "./state.js";
import { loadBadgesLazy, loadLeagueLogosLazy } from "./teams.js";
import { formatMoney, formatGameDate, isTransferWindowOpen } from "../core/appUtils.js";

export function renderApp() {
  render();
}

export async function render() {
  const data = await Storage.getLeagueData();
  if (!squad || squad.length === 0) return;

  ensureCaptain();

  const formatName =
    document.getElementById("formationSelect")?.value || "4-3-3";
  const format =
    formations[formatName] ||
    formations["4-3-3"] ||
    Object.values(formations)[0];

  const titulares = [];
  for (let i = 0; i < 11; i++) {
    titulares.push(squad[i] || null);
  }

  const reservas = squad.slice(11).filter((p) => p !== null);
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
        while (
          c + w < 7 &&
          GRID_POSITIONS[r][c + w] === pos &&
          !visited[r][c + w]
        )
          w++;

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

    const gridCellsHTML = cells
      .map(
        (cell) =>
          `<div class="grid-cell" data-pos="${cell.pos}" style="grid-row: ${cell.r} / span ${cell.h}; grid-column: ${cell.c} / span ${cell.w};">${cell.pos}</div>`,
      )
      .join("");

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
  
  // 7. Carrega logos reais
  loadBadgesLazy();
  loadLeagueLogosLazy();
}

export function renderBench(reservas, benchSortValue) {
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
    const pRating =
      p.rating ?? calculateOVR(p.stats, p.form, isGK, p.aptitude?.[0]);
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
    res.innerHTML = `<div style="display: flex; justify-content: space-between; width: 100%; align-items: center; position: relative;">${mStatusHtml}<span style="font-size: 0.65rem; background: #222; padding: 2px 4px; border-radius: 4px; border: 1px solid #444; font-weight: 800; margin-left: ${mStatusHtml ? "12px" : "0"};">${p.aptitude?.[0] || "??"}</span><div style="display: flex; align-items: center; gap: 4px;">${getFormHTML(p.form)} <span style="background: ${getRatingColor(pRating)}; color: #000; font-size: 0.7rem; font-weight: 900; padding: 2px 4px; border-radius: 4px;">${pRating.toFixed(1)}</span></div></div><svg class="player-silhouette" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><div style="margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; width: 100%;"><strong>${p.name}</strong></div><div style="width: 90%; height: 5px; background: rgba(0,0,0,0.6); border: 1px solid rgba(0,0,0,0.8); border-radius: 2px; overflow: hidden; margin: 6px auto;"><div style="height: 100%; width: ${fitLevel}%; background: ${fitColor}; transition: width 0.3s ease;"></div></div><div style="font-size: 0.6rem; color: #888; margin-top: 2px;">Nº ${p.number} | ${p.age || "--"}A | <span style="color:var(--accent); font-weight:bold;">${formatMoney(p.marketValue || 0)}</span></div>`;
    res.onclick = () => openMenu(p.id);
    benchFragment.appendChild(res);
  });
  bench.appendChild(benchFragment);
}

export function renderMatchHistory(data) {
  const history =
    data && data.matchHistory ? data.matchHistory : window.matchHistory || [];
  const histContainer = document.getElementById("matchHistoryList");
  if (!histContainer) return;

  histContainer.innerHTML = "";
  if (history.length === 0) {
    histContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px; font-size: 0.8rem;">Nenhuma partida disputada ainda.</div>`;
    return;
  }

  [...history]
    .reverse()
    .slice(0, 10)
    .forEach((m) => {
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
    
    // Filtra jogadores com valor > 0 antes de renderizar
    const visibleList = list.filter(p => {
      const val = p[valueKey] || 0;
      return isRating ? p.matchesPlayed > 0 : val > 0;
    }).slice(0, 15);

    visibleList.forEach((p, i) => {
      const val = formatValue ? formatValue(p[valueKey]) : p[valueKey];
      
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

  const topScorers = [...squad].sort(
    (a, b) => (b.goals || 0) - (a.goals || 0),
  );
  renderList(goalsBody, topScorers, "goals", "Gols", "var(--accent)");

  const topAssists = [...squad].sort(
    (a, b) => (b.assists || 0) - (a.assists || 0),
  );
  renderList(assistsBody, topAssists, "assists", "Assis.", "#00aaff");

  const topMatches = [...squad].sort(
    (a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0),
  );
  renderList(matchesBody, topMatches, "matchesPlayed", "Jogos", "#4caf50");

  const topRating = [...squad]
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

  const topCards = [...squad].sort(
    (a, b) => (b.yellowCards || 0) - (a.yellowCards || 0),
  );
  renderList(cardsBody, topCards, "yellowCards", "CA", "var(--danger)");

  if (tacklesBody) {
    const topTackles = [...squad].sort(
      (a, b) => (b.tackles || 0) - (a.tackles || 0),
    );
    renderList(tacklesBody, topTackles, "tackles", "Desar.", "#9c27b0");
  }
}

export function renderPitchPlayers(titulares, format, squad) {
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
    const pRating =
      p.rating ?? calculateOVR(p.stats, p.form, isGK, currentZone);
    let displayRating = pRating;

    if (fitClass === "fit-warning") {
      displayRating =
        (p.aptitude && p.aptitude.includes("GOL")) || currentZone === "GOL"
          ? 1.0
          : Math.max(1.0, pRating - 2.5);
    }

    const fitLevel = p.fitness !== undefined ? p.fitness : 100;
    const fitColorBar = fitLevel > 70 ? "var(--accent)" : (fitLevel > 40 ? "var(--warning)" : "var(--danger)");
    const liveStatusClass = p.matchStatus === "red" ? "is-suspended" : (p.matchStatus === "injury" ? "is-injured" : "");

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
    if (p.playstyle)
      stats.playstylesCount[p.playstyle] =
        (stats.playstylesCount[p.playstyle] || 0) + 1;

    const el = document.createElement("div");
    el.className = `player player-card ${fitClass} ${liveStatusClass}`;
    el.dataset.id = p.id;
    el.style.cssText = `top: ${topPos}%; left: ${leftPos}%;`;
    
    el.innerHTML = `
      <div class="player-card-header">
        <span class="player-card-pos">${currentZone}</span>
        <div class="p-form">${getFormHTML(p.form)}</div>
        <span class="player-card-ovr" style="background: ${getRatingColor(displayRating)}">${displayRating.toFixed(1)}</span>
      </div>
      <div class="player-card-photo">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>
      <div class="player-card-name-row">
        <div class="player-card-name">${p.name}</div>
        <div class="player-card-status-icons">
          ${getMatchStatusHTML(p.matchStatus)}
          ${p.captain ? '<div class="captain-armband-mini">C</div>' : ""}
        </div>
      </div>
      <div class="player-card-stamina">
        <div class="player-card-stamina-fill" style="width: ${fitLevel}%; background: ${fitColorBar};"></div>
      </div>
    `;
    
    el.draggable = true;
    el.ondragstart = (e) => {
      e.dataTransfer.setData("playerId", p.id);
      highlightZones(p);
    };
    el.ondragend = clearZones;
    el.onclick = () => {
      if (!el.classList.contains("dragging")) openMenu(p.id);
    };

    // Drop zone logic for swapping
    el.ondragover = (e) => {
      e.preventDefault();
      el.classList.add("drag-over-player");
    };
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
          const resPlayer = squad.find((x) => x.id === parseInt(reserveId, 10));
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

export function updateTeamStatsUI(stats, titularesCount) {
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
    fitEl.style.color =
      stats.fitCount === titularesCount
        ? "var(--rating-top)"
        : stats.fitCount >= 8
          ? "var(--rating-high)"
          : "var(--warning)";
  }

  const footEl = document.getElementById("teamFoot");
  if (footEl)
    footEl.innerText = `${stats.destrosCount}D | ${stats.canhotosCount}C${stats.ambiCount > 0 ? ` | ${stats.ambiCount}A` : ""}`;

  const atkEl = document.getElementById("teamAtk");
  if (atkEl) {
    atkEl.innerText = avgStats.fin;
    atkEl.style.color = getRatingColor(avgStats.fin);
  }

  const defEl = document.getElementById("teamDef");
  if (defEl) {
    defEl.innerText = avgStats.def;
    defEl.style.color = getRatingColor(avgStats.def);
  }

  const forEl = document.getElementById("teamForeigners");
  if (forEl) forEl.innerText = stats.estrangeirosCount;

  let topStyle = "--",
    maxCount = 0;
  for (const [style, count] of Object.entries(stats.playstylesCount)) {
    if (count > maxCount) {
      maxCount = count;
      topStyle = style;
    }
  }
  const psEl = document.getElementById("teamPlaystyle");
  if (psEl) {
    psEl.innerText = topStyle;
    psEl.title = topStyle;
  }
}

export function renderTeamChemistry(titulares, format, formatName) {
  const svg = document.getElementById("chemistryLines");
  if (!svg || titulares.length === 0) return;

  const linesCounts = formatName.split("-").map(Number);
  const outfieldPlayers = [];

  titulares.forEach((p, i) => {
    if (!format[i]) return;
    if (format[i].l > 14)
      outfieldPlayers.push({
        player: p,
        index: i,
        t: format[i].t,
        l: format[i].l,
      });
  });

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
    const fit1 = checkPositionFit(p1.player, getEfootballPosition(p1.t, p1.l));
    const fit2 = checkPositionFit(p2.player, getEfootballPosition(p2.t, p2.l));
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

export function updateDashboardCoach(info) {
  const nameEl = document.getElementById("dashCoachName");
  const styleEl = document.getElementById("dashCoachStyle");
  const teamEl = document.getElementById("dashTeamName");
  const budgetEl = document.getElementById("dashBudget");
  const dateEl = document.getElementById("dashGameDate");
  const windowEl = document.getElementById("dashWindowStatus");

  if (nameEl) nameEl.innerText = `Treinador: ${info.name}`;
  if (styleEl) styleEl.innerText = `DNA: ${info.playstyle}`;
  if (teamEl) teamEl.innerText = normalizeTeamName(info.teamName) || "--";
  if (budgetEl) budgetEl.innerText = formatMoney(info.budget || 0);

  if (dateEl && info.currentDate) {
    dateEl.innerText = formatGameDate(info.currentDate);
    if (windowEl) {
      const isOpen = isTransferWindowOpen(info.currentDate, info.calendarType || "eu");
      windowEl.innerText = `JANELA: ${isOpen ? "ABERTA" : "FECHADA"}`;
      windowEl.style.background = isOpen ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.05)";
      windowEl.style.color = isOpen ? "var(--accent)" : "#888";
      windowEl.style.border = `1px solid ${isOpen ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}`;
    }
  }

  renderProposals(info);
  renderCalendar(info);
  renderNewsFeed(info);
}

async function renderNewsFeed(info) {
  const feed = document.getElementById("newsFeed");
  if (!feed) return;
  feed.innerHTML = "";

  const news = [];

  // 0. Histórico de Partidas (Novidade: Agora como Notícia)
  const history = await Storage.getMatchHistory();
  if (history && history.length > 0) {
    const lastMatches = history.slice(-3).reverse();
    lastMatches.forEach(m => {
        let resColor = "var(--warning)"; // Empate
        let resIcon = "minus-circle";
        let resText = "Empate";

        if (m.result === "V") {
            resColor = "var(--rating-high)";
            resIcon = "check-circle";
            resText = "Vitória";
        } else if (m.result === "D") {
            resColor = "#ff4444";
            resIcon = "x-circle";
            resText = "Derrota";
        }

        news.push({
            type: "match-result",
            icon: resIcon,
            color: resColor,
            title: `Resultado: ${m.home} ${m.score} ${m.away}`,
            desc: `Partida finalizada com ${resText}. Confira o relatório técnico.`
        });
    });
  }

  // 1. Propostas
  if (info.proposals && info.proposals.length > 0) {
    news.push({
      type: "proposal",
      icon: "shopping-bag",
      color: "var(--accent)",
      title: "Novas Propostas!",
      desc: `Você recebeu ${info.proposals.length} proposta(s) de transferência.`
    });
  }

  // 2. Próximo Jogo
  const leagueData = await Storage.getLeagueData();
  if (leagueData && !leagueData.finished) {
     news.push({
        type: "match",
        icon: "trophy",
        color: "var(--warning)",
        title: "Preparação para o Jogo",
        desc: `Sua equipe entra em campo em breve pela liga.`
     });
  }

  // 3. Jogadores Cansados / Lesionados
  const lowFitness = squad.filter(p => p.fitness < 60 && p.matchStatus === "normal");
  if (lowFitness.length > 0) {
    news.push({
      type: "fitness",
      icon: "alert-triangle",
      color: "#ff4444",
      title: "Alerta de Desgaste",
      desc: `${lowFitness[0].name} e outros ${lowFitness.length - 1} estão muito cansados.`
    });
  }

  // 4. Jogador em Destaque
  const star = [...squad].sort((a,b) => (b.rating || 0) - (a.rating || 0))[0];
  if (star && star.rating > 85) {
     news.push({
        type: "info",
        icon: "star",
        color: "#f9c200",
        title: "Destaque do Treino",
        desc: `${star.name} está em excelente forma técnica.`
     });
  }

  // 5. Reclamações de Jogadores
  const unhappy = squad.slice(11).filter(p => p.rating > 80 && p.matchStatus === "normal");
  if (unhappy.length > 0) {
     news.push({
        type: "complaint",
        icon: "message-square",
        color: "#ff8800",
        title: "Reclamação de Atleta",
        desc: `${unhappy[0].name} não está feliz com a reserva e quer mais tempo de jogo.`
     });
  }

  // 6. Janela de Transferências
  const isWindow = isTransferWindowOpen(info.currentDate, info.calendarType);
  if (isWindow) {
    news.push({
      type: "window",
      icon: "unlock",
      color: "var(--accent)",
      title: "Mercado Aberto",
      desc: "A janela de transferências está aberta para negócios."
    });
  }

  if (news.length === 0) {
    feed.innerHTML = `<div style="text-align: center; color: #444; padding: 40px; font-size: 0.8rem;">Sem novas mensagens no momento.</div>`;
    return;
  }

  news.forEach(item => {
    const msg = document.createElement("div");
    msg.style.cssText = `background: #181818; border-left: 3px solid ${item.color}; padding: 12px 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 15px; transition: all 0.2s; cursor: pointer; border-top: 1px solid #222; border-right: 1px solid #222; border-bottom: 1px solid #222;`;
    
    msg.onmouseover = () => msg.style.background = "#202020";
    msg.onmouseout = () => msg.style.background = "#181818";

    msg.innerHTML = `
      <div style="background: ${item.color}22; padding: 8px; border-radius: 8px;">
        <i data-lucide="${item.icon}" style="width: 1.2rem; height: 1.2rem; color: ${item.color};"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: bold; color: #fff; font-size: 0.85rem; margin-bottom: 3px;">${item.title}</div>
        <div style="font-size: 0.75rem; color: #999; line-height: 1.4;">${item.desc}</div>
      </div>
    `;
    feed.appendChild(msg);
  });

  if (window.lucide) window.lucide.createIcons();
}

async function renderCalendar(info) {
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("calendarMonthTitle");
  if (!grid || !title || !info.currentDate) return;

  const date = new Date(info.currentDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const today = date.getDate();

  const months = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];
  title.innerText = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sáb)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  grid.innerHTML = "";

  // Headers de Dias da Semana
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  weekDays.forEach(d => {
    const dayHead = document.createElement("div");
    dayHead.style.cssText = "font-size: 0.55rem; color: #333; font-weight: 900; padding: 2px 0;";
    dayHead.innerText = d;
    grid.appendChild(dayHead);
  });

  // Espaços vazios para o primeiro dia
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  const isWindowOpen = isTransferWindowOpen(info.currentDate, info.calendarType || "eu");

  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement("div");
    const isToday = d === today;
    const hasMatch = isToday; 
    
    // Estilo Base
    let bgColor = "rgba(255,255,255,0.02)";
    let border = "1px solid rgba(255,255,255,0.04)";
    let color = "#444";
    let transform = "none";
    let boxShadow = "none";

    if (isWindowOpen) {
        bgColor = "rgba(0, 255, 136, 0.05)";
        border = "1px solid rgba(0, 255, 136, 0.1)";
        color = "#888";
    }

    if (isToday) {
      bgColor = "var(--accent)";
      color = "#000";
      border = "1px solid var(--accent)";
      boxShadow = "0 0 15px rgba(0,255,136,0.4)";
      transform = "scale(1.1)";
    }

    const isWeekend = (firstDay + d - 1) % 7 === 0 || (firstDay + d - 1) % 7 === 6;
    if (isWeekend && !isToday && !isWindowOpen) {
        color = "#444";
    }

    dayEl.style.cssText = `
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      border-radius: 6px;
      background: ${bgColor};
      border: ${border};
      color: ${color};
      transition: all 0.2s;
      transform: ${transform};
      box-shadow: ${boxShadow};
      position: relative;
    `;
    
    dayEl.innerText = d;

    // Se tiver jogo (ex: hoje)
    if (isToday) {
       const dot = document.createElement("div");
       dot.style.cssText = "position: absolute; bottom: 2px; width: 4px; height: 4px; background: #000; border-radius: 50%;";
       dayEl.appendChild(dot);
    }

    grid.appendChild(dayEl);
  }
}

export async function renderProposals(info, containerId = "proposalsList", badgeId = "proposalCountBadge", cardId = "transferProposalsCard") {
  const card = document.getElementById(cardId);
  const list = document.getElementById(containerId);
  const badge = document.getElementById(badgeId);
  if (!list) return;

  const proposals = info.proposals || [];
  if (proposals.length === 0) {
    if (card) card.style.display = "none";
    list.innerHTML = `<p style="color: #444; text-align: center; padding: 30px;">Sem propostas pendentes.</p>`;
    return;
  }

  if (card) card.style.display = "block";
  if (badge) badge.innerText = `${proposals.length} Pendente${proposals.length > 1 ? "s" : ""}`;
  list.innerHTML = "";

  proposals.forEach((prop) => {
    const item = document.createElement("div");
    item.style.cssText = "background: #1a1a1a; border: 1px solid #333; padding: 15px; border-radius: 10px; display: flex; flex-direction: column; gap: 10px;";
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.65rem; color: var(--accent); font-weight: 800; text-transform: uppercase;">PROPOSTA: ${prop.type}</span>
        <span style="font-size: 0.6rem; color: #666;">${formatGameDate(prop.date)}</span>
      </div>
      <div>
        <div style="font-weight: bold; color: #fff; font-size: 1rem;">${prop.playerName}</div>
        <div style="font-size: 0.8rem; color: #888;">Interesse de: <b style="color: #fff;">${prop.from}</b></div>
      </div>
      <div style="font-size: 1.1rem; font-weight: 900; color: var(--accent); margin: 5px 0;">${formatMoney(prop.value)}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <button class="accept-prop-btn btn-primary" style="padding: 8px; font-size: 0.7rem; margin:0;" data-id="${prop.id}">ACEITAR</button>
        <button class="reject-prop-btn btn-secondary" style="padding: 8px; font-size: 0.7rem; margin:0; background: #222; border: 1px solid #444; color: #888;" data-id="${prop.id}">RECUSAR</button>
      </div>
    `;
    list.appendChild(item);
  });

  // Eventos
  list.querySelectorAll(".accept-prop-btn").forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.id);
      const prop = proposals.find(x => x.id === id);
      const coach = await Storage.getCoachInfo();
      
      const confirm = await showCustomModal(`Deseja aceitar a proposta de <b>${formatMoney(prop.value)}</b> de <b>${prop.from}</b> por <b>${prop.playerName}</b>?`, "confirm", "btn-primary");
      if (confirm) {
        // 1. Dar dinheiro
        coach.budget += prop.value;
        // 2. Remover Proposta
        coach.proposals = coach.proposals.filter(x => x.id !== id);
        // 3. Remover Jogador do Elenco
        const { squad, saveToLocal } = await import("../core/appCore.js");
        const idx = squad.findIndex(p => p.id === prop.playerId);
        if (idx !== -1) {
            squad.splice(idx, 1);
            saveToLocal();
        }
        await Storage.saveCoachInfo(coach);
        renderApp();
        showCustomModal("Transferência concretizada!", "alert", "btn-primary");
      }
    };
  });

  list.querySelectorAll(".reject-prop-btn").forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.id);
      const coach = await Storage.getCoachInfo();
      coach.proposals = coach.proposals.filter(x => x.id !== id);
      await Storage.saveCoachInfo(coach);
      renderApp();
    };
  });

  if (window.lucide) window.lucide.createIcons();
}
