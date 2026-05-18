import { dbgToast } from "./uiUtils.js";
import { highlightZones, clearZones } from "./zones.js";
import { switchMainView } from "./views.js";
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
  renderStatsNumbers,
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

  // 8. Atualiza Dashboard se visível
  const dashView = document.getElementById("dashboardView");
  if (dashView && dashView.style.display !== "none") {
    const coach = await Storage.getCoachInfo();
    if (coach) await updateDashboardCoach(coach);
  }
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

export async function updateDashboardCoach(info) {
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
      const isOpen = isTransferWindowOpen(
        info.currentDate,
        info.calendarType || "eu",
      );
      windowEl.innerText = `JANELA: ${isOpen ? "ABERTA" : "FECHADA"}`;
      windowEl.style.background = isOpen
        ? "rgba(0,255,136,0.15)"
        : "rgba(255,255,255,0.05)";
      windowEl.style.color = isOpen ? "var(--accent)" : "#888";
      windowEl.style.border = `1px solid ${isOpen ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}`;
    }
  }

  renderProposals(info);
  await renderCalendar(info);
  renderNewsFeed(info);
}

export async function getNewsList(info, includeArchived = false) {
  const news = [];
  const history = await Storage.getMatchHistory();
  const leagueData = await Storage.getLeagueData();

  // 0. Histórico de Partidas
  if (history && history.length > 0) {
    const lastMatches = history.slice(-3).reverse();
    lastMatches.forEach((m, i) => {
      let resColor = "var(--warning)";
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

      const compName = m.compType === "cup" ? "Copa Nacional" : m.compType === "continental" ? "Continental" : "Liga Nacional";

      news.push({
        id: `match-${m.timestamp || i}`,
        type: "match-result",
        icon: resIcon,
        color: resColor,
        title: `${resText}: ${m.home} ${m.score} ${m.away}`,
        desc: `Relatório pós-jogo: ${m.home} vs ${m.away} (${compName}).`,
        longDesc: `Prezado Treinador,<br><br>A partida válida pela <strong>${compName}</strong> entre <strong>${m.home}</strong> e <strong>${m.away}</strong> terminou em <strong>${m.score}</strong>.<br><br>Nossa análise indica que a equipe se comportou de forma ${m.result === "V" ? "excelente" : m.result === "D" ? "abaixo do esperado" : "regular"}. O placar de <strong>${m.score}</strong> reflete o que vimos em campo. Os dados individuais de performance e estatísticas de jogo já foram processados e estão disponíveis para sua revisão tática.<br><br>Seguimos focados na preparação para o próximo compromisso.`,
        actionLabel: "VER TABELA",
        actionView: "league",
      });
    });
  }

  // 1. Propostas Individuais
  if (info.proposals && info.proposals.length > 0) {
    info.proposals.forEach(prop => {
      news.push({
        id: `prop-${prop.id}`,
        type: "proposal",
        icon: "shopping-bag",
        color: "var(--accent)",
        title: `Proposta: ${prop.playerName}`,
        desc: `${prop.from} oferece ${formatMoney(prop.value)} pelo atleta.`,
        longDesc: `Recebemos uma proposta oficial do <strong>${prop.from}</strong> pelo jogador <strong>${prop.playerName}</strong>.<br><br>O valor oferecido é de <strong>${formatMoney(prop.value)}</strong> na modalidade de <strong>${prop.type === "Compra" ? "Transferência Definitiva" : "Empréstimo"}</strong>.<br><br>O mercado está aguardando sua posição. Você pode aceitar, recusar ou tentar negociar termos melhores diretamente na central de transferências.`,
        actionLabel: "NEGOCIAR AGORA",
        actionView: "negotiation",
        secondaryAction: () => renderNegotiation(prop.playerId, prop.id, false),
      });
    });
  }

  // 2. Próximo Jogo
  if (leagueData && !leagueData.finished) {
    const round = leagueData.divisions[0].rounds[leagueData.currentRound - 1];
    const userMatch = round.find(m => m.home === info.teamFile || m.away === info.teamFile);
    
    if (userMatch) {
      const opponent = userMatch.home === info.teamFile ? userMatch.awayName : userMatch.homeName;
      const stadium = userMatch.home === info.teamFile ? "em casa" : "fora de casa";
      const leagueName = leagueData.divisions[0].name;

      news.push({
        id: "next-match-alert",
        type: "match",
        icon: "trophy",
        color: "var(--warning)",
        title: "Próximo Confronto",
        desc: `Enfrentaremos o ${opponent} pela ${leagueName}.`,
        longDesc: `O clima no vestiário é de foco total para o próximo confronto contra o <strong>${opponent}</strong>, válido pela <strong>${leagueName}</strong>.<br><br>Jogaremos <strong>${stadium}</strong> e a expectativa da diretoria é de um desempenho sólido. Nossa equipe de análise já mapeou os pontos fortes e fracos do adversário. É essencial que a prancheta tática esteja definida e que os jogadores estejam em suas melhores condições físicas.<br><br>A torcida já está se mobilizando para apoiar o time neste importante duelo!`,
        actionLabel: "IR PARA O JOGO",
        actionView: "dashboard",
      });
    }
  }

  // 3. Desempenho de Jogador (Últimas 5 notas)
  const sortedByRating = [...squad].filter(p => p.ratingHistory && p.ratingHistory.length > 0)
    .sort((a, b) => {
       const avgA = a.ratingHistory.reduce((s,v)=>s+v,0) / a.ratingHistory.length;
       const avgB = b.ratingHistory.reduce((s,v)=>s+v,0) / b.ratingHistory.length;
       return avgB - avgA;
    });

  if (sortedByRating.length > 0) {
    const p = sortedByRating[0];
    const notes = p.ratingHistory.map(r => `<span style="background: ${r >= 7 ? 'var(--rating-high)' : r >= 6 ? 'var(--warning)' : '#ff4444'}; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-right: 5px;">${r.toFixed(1)}</span>`).join(" ");
    
    news.push({
      id: `performance-${p.id}`,
      type: "info",
      icon: "trending-up",
      color: "var(--accent)",
      title: `Performance: ${p.name}`,
      desc: `Histórico recente do atleta: ${p.ratingHistory.join(" | ")}`,
      longDesc: `Temos um relatório detalhado sobre o desempenho recente de <strong>${p.name}</strong>.<br><br>Nas últimas partidas, o atleta manteve uma regularidade impressionante. Confira as notas das últimas 5 atuações:<br><br>${notes}<br><br>Este nível de consistência é fundamental para a estabilidade tática da equipe. O jogador demonstra estar em excelente sintonia com o plano de jogo estabelecido pela comissão técnica.`,
      actionLabel: "VER DETALHES",
      actionView: "table",
    });
  }

  // 4. Jogadores Cansados
  const lowFitness = squad.filter((p) => p.fitness < 60 && p.matchStatus === "normal");
  if (lowFitness.length > 0) {
    news.push({
      id: "fitness-alert",
      type: "fitness",
      icon: "alert-triangle",
      color: "#ff4444",
      title: "Alerta de Desgaste",
      desc: `${lowFitness[0].name} e outros ${lowFitness.length - 1} estão muito cansados.`,
      longDesc: `O departamento médico emitiu um alerta vermelho sobre a condição física de alguns atletas. <br><br>Jogadores como <strong>${lowFitness[0].name}</strong> apresentam níveis críticos de fadiga e correm sério risco de lesão caso sejam escalados na próxima partida sem o devido descanso.<br><br>Sugerimos um rodízio no elenco ou uma carga reduzida de treinos para preservar a integridade física do grupo.`,
      actionLabel: "GERENCIAR ELENCO",
      actionView: "table",
    });
  }

  // 5. Jogador em Destaque
  const star = [...squad].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  if (star && star.rating > 85) {
    news.push({
      id: "star-player",
      type: "info",
      icon: "star",
      color: "#f9c200",
      title: "Destaque do Treino",
      desc: `${star.name} está em excelente forma técnica.`,
      longDesc: `Temos o prazer de informar que <strong>${star.name}</strong> tem se destacado nos treinamentos desta semana de forma excepcional.<br><br>A dedicação e o desempenho técnico do atleta têm sido exemplares, elevando o nível de competitividade do grupo e servindo de inspiração para os jovens da base. Jogadores com este comprometimento são os pilares do nosso projeto esportivo de longo prazo.`,
      actionLabel: "GERENCIAR ELENCO",
      actionView: "table",
    });
  }

  // 5. Janela de Transferências
  const isWindow = isTransferWindowOpen(info.currentDate, info.calendarType);
  if (isWindow) {
    news.push({
      id: "market-window",
      type: "window",
      icon: "unlock",
      color: "var(--accent)",
      title: "Mercado Aberto",
      desc: "A janela de transferências está aberta para negócios.",
      longDesc: `A janela de transferências foi oficialmente aberta para este período da temporada!<br><br>Este é o momento ideal para reforçar o elenco ou negociar atletas que não fazem parte dos planos futuros da comissão técnica. O mercado está aquecido e diversas oportunidades de negócio podem surgir a qualquer momento, tanto para compra quanto para venda.<br><br>Fique atento às movimentações dos outros clubes e aos valores de mercado.`,
      actionLabel: "IR PARA O MERCADO",
      actionView: "transfer",
    });
  }

  // 6. Filtrar Arquivados
  if (includeArchived) return news;
  
  const archived = info.archivedNews || [];
  return news.filter(n => !archived.includes(n.id));
}

async function renderNewsFeed(info) {
  const feed = document.getElementById("newsFeed");
  if (!feed) return;
  feed.innerHTML = "";

  const news = await getNewsList(info);

  if (news.length === 0) {
    feed.innerHTML = `<div style="text-align: center; color: #444; padding: 40px; font-size: 0.8rem;">Sem novas mensagens no momento.</div>`;
    return;
  }

  news.forEach((item) => {
    const msg = document.createElement("div");
    msg.style.cssText = `background: #181818; border-left: 3px solid ${item.color}; padding: 12px 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 15px; transition: all 0.2s; cursor: pointer; border-top: 1px solid #222; border-right: 1px solid #222; border-bottom: 1px solid #222;`;

    msg.onmouseover = () => (msg.style.background = "#202020");
    msg.onmouseout = () => (msg.style.background = "#181818");

    msg.innerHTML = `
      <div style="background: ${item.color}22; padding: 8px; border-radius: 8px;">
        <i data-lucide="${item.icon}" style="width: 1.2rem; height: 1.2rem; color: ${item.color};"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: bold; color: #fff; font-size: 0.85rem; margin-bottom: 3px;">${item.title}</div>
        <div style="font-size: 0.75rem; color: #999; line-height: 1.4;">${item.desc}</div>
      </div>
    `;

    msg.onclick = () => {
      import("./views.js").then((m) => {
        m.switchMainView("inbox");
        renderInbox(item.id);
      });
    };

    feed.appendChild(msg);
  });

  if (window.lucide) window.lucide.createIcons();
}

export async function renderInbox(selectedId = null, showArchived = false) {
  const sidebar = document.getElementById("inboxSidebarList");
  const content = document.getElementById("inboxEmailContent");
  const sidebarHeader = document.querySelector("#inboxSidebar .sidebar-header"); // Assumindo que existe um header
  
  if (!sidebar || !content) return;

  const coach = await Storage.getCoachInfo();
  // Pegamos a lista COMPLETA sem o filtro de arquivados para podermos alternar
  const allNews = await getNewsList(coach, true); 
  const archivedIds = coach.archivedNews || [];

  let news = [];
  if (showArchived) {
    news = allNews.filter(n => archivedIds.includes(n.id));
  } else {
    news = allNews.filter(n => !archivedIds.includes(n.id));
  }

  // Header com Toggle (Injetar se não existir ou atualizar)
  const sidebarContainer = sidebar.parentElement;
  let toggleContainer = document.getElementById("inboxArchiveToggle");
  if (!toggleContainer) {
    toggleContainer = document.createElement("div");
    toggleContainer.id = "inboxArchiveToggle";
    toggleContainer.style.cssText = "padding: 10px 15px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; background: #111;";
    sidebarContainer.insertBefore(toggleContainer, sidebar);
  }

  toggleContainer.innerHTML = `
    <span style="font-size: 0.65rem; color: #555; font-weight: 800; text-transform: uppercase;">${showArchived ? "Arquivados" : "Caixa de Entrada"}</span>
    <button id="btnToggleArchive" style="background: transparent; border: 1px solid #333; color: var(--accent); font-size: 0.6rem; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold;">
      ${showArchived ? "VER ATIVOS" : "VER ARQUIVO"}
    </button>
  `;

  document.getElementById("btnToggleArchive").onclick = () => renderInbox(null, !showArchived);

  sidebar.innerHTML = "";
  if (news.length === 0) {
    sidebar.innerHTML = `<div style="text-align: center; color: #444; padding: 40px; font-size: 0.7rem;">${showArchived ? "Nenhum arquivado" : "Caixa vazia"}</div>`;
    content.innerHTML = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #333;">Selecione uma mensagem</div>`;
    return;
  }

  let selectedItem = news.find((n) => n.id === selectedId) || news[0];

  news.forEach((item) => {
    const isSelected = item.id === selectedItem.id;
    const msg = document.createElement("div");
    msg.style.cssText = `
      padding: 15px; 
      border-radius: 8px; 
      cursor: pointer; 
      transition: all 0.2s; 
      border: 1px solid ${isSelected ? "var(--accent)" : "#222"};
      background: ${isSelected ? "rgba(0,255,136,0.05)" : "#181818"};
      margin-bottom: 8px;
    `;

    msg.onclick = () => renderInbox(item.id, showArchived);

    msg.innerHTML = `
      <div style="font-weight: bold; color: ${isSelected ? "var(--accent)" : "#fff"}; font-size: 0.8rem; margin-bottom: 5px;">${item.title}</div>
      <div style="font-size: 0.7rem; color: #777; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.desc}</div>
    `;
    sidebar.appendChild(msg);
  });

  // Renderizar Conteúdo
  content.innerHTML = `
    <div style="padding: 30px; display: flex; flex-direction: column; height: 100%;">
      
      <!-- Cabeçalho do E-mail -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 15px;">
        <div style="display: flex; gap: 15px; align-items: center;">
          <div style="background: ${selectedItem.color}22; padding: 12px; border-radius: 12px;">
            <i data-lucide="${selectedItem.icon}" style="width: 1.8rem; height: 1.8rem; color: ${selectedItem.color};"></i>
          </div>
          <div>
            <h2 style="color: #fff; margin: 0 0 5px 0; font-size: 1.4rem; font-weight: 800;">${selectedItem.title}</h2>
            <div style="color: #666; font-size: 0.75rem;">
              <span style="color: #999;">De:</span> secretaria@clube.com <span style="margin: 0 10px;">|</span> 
              <span style="color: #999;">Assunto:</span> Notificação Oficial
            </div>
          </div>
        </div>
        <button onclick="switchMainView('dashboard')" style="background: transparent; border: 1px solid #333; color: #888; width: 80px; height: 32px; border-radius: 6px; font-size: 0.65rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'" onmouseout="this.style.borderColor='#333'; this.style.color='#888'">VOLTAR</button>
      </div>

      <!-- Corpo do E-mail -->
      <div style="flex: 1; overflow-y: auto; color: #bbb; line-height: 1.8; font-size: 1rem; padding-right: 10px;">
        <p>${selectedItem.longDesc || selectedItem.desc}</p>
        <div style="margin-top: 25px; border-top: 1px solid #222; padding-top: 15px; color: #555; font-size: 0.8rem;">
          Atenciosamente,<br>
          <strong style="color: #888;">Diretoria Executiva</strong><br>
          FutDashboard Football Club
        </div>
      </div>

      <!-- Ações -->
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #222; display: flex; gap: 10px; justify-content: flex-end;">
        ${
          selectedItem.actionLabel
            ? `
          <button id="inboxActionBtn" class="btn-primary" style="padding: 12px 25px; font-weight: 900; font-size: 0.8rem; letter-spacing: 1px; width: auto; margin: 0;">
            ${selectedItem.actionLabel}
          </button>
        `
            : ""
        }
        <button id="inboxArchiveBtn" style="width: 140px; height: 45px; background: #222; border: 1px solid #333; color: #fff; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#222'">${showArchived ? "RESTAURAR" : "ARQUIVAR"}</button>
      </div>

    </div>
  `;

  const actionBtn = document.getElementById("inboxActionBtn");
  if (actionBtn && selectedItem.actionView) {
    actionBtn.onclick = () => {
      switchMainView(selectedItem.actionView);
      if (selectedItem.secondaryAction) selectedItem.secondaryAction();
    };
  }

  const archiveBtn = document.getElementById("inboxArchiveBtn");
  if (archiveBtn) {
    archiveBtn.onclick = async () => {
      const { archiveNews, unarchiveNews } = await import("../core/appCore.js");
      if (showArchived) {
        await unarchiveNews(selectedItem.id);
      } else {
        await archiveNews(selectedItem.id);
      }
      renderInbox(null, showArchived); // Recarrega a lista no mesmo modo
    };
  }

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

  // --- BUSCAR JOGOS PARA O CALENDÁRIO ---
  const leagueData = await Storage.getLeagueData();
  const matchHistory = (await Storage.getMatchHistory()) || [];
  const matchEvents = {};

  // 1. Marcar Histórico (Passado)
  matchHistory.forEach((m) => {
    const parts = m.date ? m.date.split("/") : [];
    if (parts.length === 3) {
      const d = parseInt(parts[0]);
      const mIdx = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      if (mIdx === month && y === year) {
        matchEvents[d] = {
          opponent: m.oppTeam || (m.home === info.teamName ? m.away : m.home),
          result: m.result,
          isPast: true,
        };
      }
    }
  });

  // 2. Marcar Futuro (Baseado na Round atual e no salto de 7 dias)
  if (leagueData && !leagueData.finished && info.teamFile) {
    const userFile = info.teamFile;
    const currentRound = leagueData.currentRound || 1;
    // Tenta pegar a primeira divisão ou o objeto raiz
    const rounds = leagueData.divisions
      ? leagueData.divisions[0].rounds
      : leagueData.rounds || [];

    for (let r = currentRound; r <= rounds.length; r++) {
      const weekDiff = r - currentRound;
      const matchDate = new Date(info.currentDate);
      matchDate.setDate(matchDate.getDate() + weekDiff * 7);

      if (matchDate.getMonth() === month && matchDate.getFullYear() === year) {
        const roundMatches = rounds[r - 1];
        if (roundMatches) {
          const userMatch = roundMatches.find(
            (m) => m.home === userFile || m.away === userFile,
          );
          if (userMatch) {
            const d = matchDate.getDate();
            if (!matchEvents[d]) {
              matchEvents[d] = {
                opponent:
                  userMatch.home === userFile
                    ? userMatch.awayName
                    : userMatch.homeName,
                isFuture: true,
              };
            }
          }
        }
      }
      // Se já passou do mês atual, para de procurar
      if (
        matchDate.getFullYear() > year ||
        (matchDate.getFullYear() === year && matchDate.getMonth() > month)
      )
        break;
    }
  }

  const months = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];
  title.innerText = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sáb)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  grid.innerHTML = "";

  // Headers de Dias da Semana
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  weekDays.forEach((d) => {
    const dayHead = document.createElement("div");
    dayHead.style.cssText =
      "font-size: 0.55rem; color: #333; font-weight: 900; padding: 2px 0;";
    dayHead.innerText = d;
    grid.appendChild(dayHead);
  });

  // Espaços vazios para o primeiro dia
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  const isWindowOpen = isTransferWindowOpen(
    info.currentDate,
    info.calendarType || "eu",
  );

  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement("div");
    const isToday = d === today;
    const match = matchEvents[d];

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

    if (match) {
      if (match.isFuture) {
        border = "1px solid var(--accent)";
        bgColor = "rgba(0, 255, 136, 0.1)";
        color = "#fff";
      } else if (match.isPast) {
        const resColor =
          match.result === "V"
            ? "var(--rating-high)"
            : match.result === "D"
              ? "#ff4444"
              : "var(--warning)";
        border = `1px solid ${resColor}`;
        bgColor = `${resColor}22`;
        color = "#888";
      }
    }

    if (isToday) {
      bgColor = "var(--accent)";
      color = "#000";
      border = "1px solid var(--accent)";
      boxShadow = "0 0 15px rgba(0,255,136,0.4)";
      transform = "scale(1.1)";
    }

    const isWeekend =
      (firstDay + d - 1) % 7 === 0 || (firstDay + d - 1) % 7 === 6;
    if (isWeekend && !isToday && !isWindowOpen && !match) {
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
      cursor: ${match ? "pointer" : "default"};
    `;

    dayEl.innerText = d;
    if (match) {
      dayEl.title = `${match.isFuture ? "Jogo contra: " : "Resultado vs: "}${match.opponent}${match.result ? ` (${match.result})` : ""}`;
    }

    // Marcador de ponto
    if (isToday || match) {
      const dot = document.createElement("div");
      let dotColor = "#000";
      if (!isToday && match) {
        dotColor = match.isFuture
          ? "var(--accent)"
          : match.result === "V"
            ? "var(--rating-high)"
            : "#ff4444";
      }
      dot.style.cssText = `position: absolute; bottom: 2px; width: 4px; height: 4px; background: ${dotColor}; border-radius: 50%;`;
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

export async function renderPlayerDetail(playerId) {
  const container = document.getElementById("playerDetailView");
  if (!container) return;

  const p = squad.find((x) => x.id === playerId);
  if (!p) return;

  const isGK = p.aptitude && p.aptitude[0] === "GOL";
  const pRating = p.ovr || p.rating || 5.0;
  const rColor = getRatingColor(pRating);
  const mainPos = p.aptitude?.[0] || "CA";

  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column; background: #080808; border-radius: 15px; overflow: hidden; border: 1px solid var(--border);">
      
      <!-- Top Bar: Nome e Botão Voltar -->
      <div style="padding: 25px 40px; background: linear-gradient(90deg, #111 0%, #080808 100%); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222;">
        <div style="display: flex; align-items: center; gap: 20px; min-width: 0; flex: 1;">
          <div style="background: ${rColor}; color: #000; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 900; box-shadow: 0 0 20px ${rColor}44; flex-shrink: 0;">
            ${pRating.toFixed(1)}
          </div>
          <div style="overflow: hidden; min-width: 0;">
            <h1 style="margin: 0; color: #fff; font-size: 2rem; font-weight: 900; letter-spacing: -1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name.toUpperCase()}</h1>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
              <span style="background: #222; color: var(--accent); padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 0.8rem; flex-shrink: 0;">${mainPos}</span>
              <span style="color: #666; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nationality || "BR"} | ${p.age || 25} Anos | Camisa ${p.number || 99}</span>
            </div>
          </div>
        </div>
        <button onclick="switchMainView('dashboard')" style="background: #222; border: 1px solid #333; color: #fff; width: 120px; height: 45px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 8px; margin-left: 20px;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#222'">
          <i data-lucide="arrow-left" style="width: 1rem; height: 1rem;"></i>
          VOLTAR
        </button>
      </div>

      <!-- Main Content: Três Colunas Reorganizadas -->
      <div style="flex: 1; display: grid; grid-template-columns: 380px 1fr 340px; gap: 20px; padding: 25px; overflow-y: auto; align-items: start;">
        
        <!-- Coluna 1: Perfil e Radar -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 20px; display: flex; flex-direction: column; align-items: center;">
            <h4 style="color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Perfil de Atributos</h4>
            <canvas id="detailRadarChart" width="260" height="260"></canvas>
            <div id="detailStatsNumbers" style="margin-top: 25px; width: 100%;"></div>
          </div>
        </div>

        <!-- Coluna 2: Habilidades e Temporada -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 25px;">
            <h4 style="color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px;">Análise de Habilidades</h4>
            <div id="detailAttributeBars" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 25px 40px;">
               <!-- Injetado via JS loop -->
            </div>
          </div>

          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 25px;">
             <h4 style="color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Estatísticas na Temporada</h4>
             <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
               <div style="text-align: center; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03);">
                 <div style="color: var(--accent); font-size: 1.8rem; font-weight: 900;">${p.goals || 0}</div>
                 <div style="color: #555; font-size: 0.65rem; text-transform: uppercase; margin-top: 5px;">Gols Marcados</div>
               </div>
               <div style="text-align: center; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03);">
                 <div style="color: #00aaff; font-size: 1.8rem; font-weight: 900;">${p.assists || 0}</div>
                 <div style="color: #555; font-size: 0.65rem; text-transform: uppercase; margin-top: 5px;">Assistências</div>
               </div>
               <div style="text-align: center; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03);">
                 <div style="color: var(--warning); font-size: 1.8rem; font-weight: 900;">${p.avgRating ? p.avgRating.toFixed(1) : "--"}</div>
                 <div style="color: #555; font-size: 0.65rem; text-transform: uppercase; margin-top: 5px;">Nota Média</div>
               </div>
             </div>
          </div>
        </div>

        <!-- Coluna 3: Contrato e Gestão -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 25px;">
            <h4 style="color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px;">Contrato</h4>
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div>
                <label style="color: #444; font-size: 0.65rem; text-transform: uppercase; display: block; margin-bottom: 5px;">Valor de Mercado</label>
                <div style="color: var(--accent); font-size: 1.6rem; font-weight: 900;">${formatMoney(p.marketValue || 0)}</div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <label style="color: #444; font-size: 0.6rem; text-transform: uppercase;">Mercado</label>
                  <div style="color: #fff; font-size: 0.85rem; font-weight: bold; margin-top: 2px;">${p.transferStatus === "transfer" ? "À VENDA" : p.transferStatus === "loan" ? "EMPRÉSTIMO" : "INTOCÁVEL"}</div>
                </div>
                <div>
                  <label style="color: #444; font-size: 0.6rem; text-transform: uppercase;">Vínculo</label>
                  <div style="color: #fff; font-size: 0.85rem; font-weight: bold; margin-top: 2px;">${Math.floor((p.contractMonths || 24) / 12)}a ${ (p.contractMonths || 24) % 12 }m</div>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <label style="color: #444; font-size: 0.6rem; text-transform: uppercase;">Estilo</label>
                  <div style="color: var(--warning); font-size: 0.85rem; font-weight: bold; margin-top: 2px;">${p.playstyle || "N/A"}</div>
                </div>
                <div>
                  <label style="color: #444; font-size: 0.6rem; text-transform: uppercase;">Salário</label>
                  <div style="color: #fff; font-size: 0.85rem; font-weight: bold; margin-top: 2px;">${formatMoney((p.marketValue || 0) * 0.005)} /mês</div>
                </div>
              </div>
              <div>
                <label style="color: #444; font-size: 0.6rem; text-transform: uppercase; display: block; margin-bottom: 8px;">Condição Física (${Math.floor(p.fitness || 100)}%)</label>
                <div style="width: 100%; height: 6px; background: #222; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${p.fitness || 100}%; height: 100%; background: var(--accent); box-shadow: 0 0 10px var(--accent)aa;"></div>
                </div>
              </div>
            </div>
          </div>
        <!-- Coluna 3: Ações e Opções de Mercado -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 25px;">
            <h4 style="color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Gestão</h4>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <button id="detailSellBtn" class="btn-primary" style="padding: 18px; font-weight: 900; font-size: 0.85rem; border-radius: 12px;">VENDER AGORA (80%)</button>
              
              <div>
                <select id="detailMarketStatusSelect" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 10px; outline: none; font-size: 0.85rem;">
                  <option value="none" ${p.transferStatus === "none" ? "selected" : ""}>Status: Intocável</option>
                  <option value="transfer" ${p.transferStatus === "transfer" ? "selected" : ""}>Status: Listar Venda</option>
                  <option value="loan" ${p.transferStatus === "loan" ? "selected" : ""}>Status: Listar Empréstimo</option>
                </select>
              </div>
              <button id="detailReleaseBtn" style="background: transparent; border: 1px solid var(--danger); color: var(--danger); padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.75rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,0,0,0.05)'" onmouseout="this.style.background='transparent'">RESCINDIR CONTRATO</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Radar
  drawRadar("detailRadarChart", p.stats, null, isGK);
  renderStatsNumbers(p.stats, null, isGK, "detailStatsNumbers");

  // Atributos em Barra
  const barsContainer = document.getElementById("detailAttributeBars");
  const statKeys = isGK
    ? [
        { key: "alc", label: "ALCANCE" },
        { key: "seg", label: "SEGURANÇA" },
        { key: "esp", label: "ESPALMADA" },
        { key: "ref", label: "REFLEXOS" },
        { key: "vel", label: "VELOCIDADE" },
        { key: "pos", label: "POSICION." },
        { key: "sta", label: "FÔLEGO" },
      ]
    : [
        { key: "vel", label: "VELOCIDADE" },
        { key: "fin", label: "FINALIZAÇÃO" },
        { key: "pas", label: "PASSE" },
        { key: "dri", label: "DRIBLE" },
        { key: "def", label: "DEFESA" },
        { key: "fis", label: "FÍSICO" },
        { key: "sta", label: "FÔLEGO" },
      ];

  statKeys.forEach((s) => {
    const val = p.stats[s.key] || 50;
    const barColor =
      val > 85
        ? "var(--accent)"
        : val > 75
          ? "#00aaff"
          : val > 60
            ? "var(--warning)"
            : "#ff4444";

    barsContainer.innerHTML += `
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 0.7rem; color: #888; font-weight: 800; letter-spacing: 0.5px;">${s.label}</span>
          <span style="font-size: 0.85rem; color: #fff; font-weight: 900;">${val}</span>
        </div>
        <div style="width: 100%; height: 8px; background: #1a1a1a; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.03);">
          <div style="width: ${val}%; height: 100%; background: ${barColor}; border-radius: 4px; box-shadow: 0 0 12px ${barColor}66;"></div>
        </div>
      </div>
    `;
  });

  // Eventos de Gestão
  const { sellPlayer, releasePlayer } = await import("../player/playerEditor.js");

  document.getElementById("detailSellBtn").onclick = () => sellPlayer(p.id);
  document.getElementById("detailReleaseBtn").onclick = () => releasePlayer(p.id);

  document.getElementById("detailMarketStatusSelect").onchange = async (e) => {
    const { updatePlayerData } = await import("../core/appCore.js");
    updatePlayerData(p.id, { transferStatus: e.target.value });
    renderPlayerDetail(p.id);
  };

  if (window.lucide) window.lucide.createIcons();
}

export async function renderNegotiation(playerId, propId = null, isBuying = false, externalPlayerData = null) {
  const container = document.getElementById("negotiationView");
  if (!container) return;

  switchMainView("negotiation");
  container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--accent);">Carregando central de negociações...</div>`;

  const coach = await Storage.getCoachInfo();
  let player = externalPlayerData;

  if (!player) {
    if (!isBuying) {
      player = squad.find(p => p.id === playerId);
    }
  }

  if (!player) {
    container.innerHTML = `<div style="padding: 40px; text-align: center;"><p style="color: #666;">Jogador não encontrado.</p><button onclick="switchMainView('transfer')" class="btn-primary" style="width: auto; margin-top: 20px;">VOLTAR</button></div>`;
    return;
  }

  const proposal = propId ? coach.proposals.find(p => p.id === propId) : null;
  const ovr = player.ovr || player.rating || 75;
  const initialValue = proposal ? proposal.value : (player.marketValue || 0);
  
  container.innerHTML = `
    <div style="padding: 30px; max-width: 1400px; margin: 0 auto; min-height: 100%; display: flex; flex-direction: column; gap: 25px;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="background: var(--accent); width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="handshake" style="color: #000; width: 1.5rem; height: 1.5rem;"></i>
          </div>
          <div>
            <h1 style="color: #fff; margin: 0; font-size: 1.5rem; font-weight: 900;">CENTRAL DE <span style="color: var(--accent);">NEGOCIAÇÃO</span></h1>
            <p style="color: #666; font-size: 0.75rem; margin: 0;">${isBuying ? "Proposta de Aquisição" : "Proposta de Venda"}</p>
          </div>
        </div>
        <button onclick="switchMainView('${isBuying ? "transfer" : "inbox"}')" style="background: transparent; border: 1px solid #333; color: #888; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.75rem;">CANCELAR E SAIR</button>
      </div>

      <!-- Grid Principal -->
      <div style="display: grid; grid-template-columns: 350px 1fr 380px; gap: 25px; flex: 1;">
        
        <!-- Coluna 1: Perfil do Jogador -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="background: #111; border: 1px solid #222; border-radius: 15px; overflow: hidden;">
            <div style="background: ${getRatingColor(ovr)}; height: 100px; position: relative;">
               <div style="position: absolute; bottom: -20px; left: 20px; background: #000; padding: 10px; border-radius: 12px; border: 2px solid #222; font-size: 2rem; font-weight: 900; color: ${getRatingColor(ovr)};">${ovr.toFixed(0)}</div>
            </div>
            <div style="padding: 40px 20px 20px 20px;">
              <h2 style="color: #fff; margin: 0; font-size: 1.4rem;">${player.name}</h2>
              <div style="color: var(--accent); font-weight: 800; font-size: 0.8rem; margin-top: 5px; text-transform: uppercase;">${player.aptitude ? player.aptitude[0] : "---"} | ${player.nationality || "---"}</div>
              
              <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
                  <span style="color: #666;">Idade</span>
                  <span style="color: #fff; font-weight: bold;">${player.age || 25} anos</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
                  <span style="color: #666;">Valor de Mercado</span>
                  <span style="color: var(--accent); font-weight: bold;">${formatMoney(player.marketValue || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
                  <span style="color: #666;">Clube Atual</span>
                  <span style="color: #fff; font-weight: bold;">${isBuying ? (player.clubName || "Externo") : coach.teamName}</span>
                </div>
              </div>
            </div>
          </div>

          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 20px;">
            <h3 style="color: #fff; font-size: 0.75rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; color: #555;">Último Desempenho</h3>
            <div style="display: flex; gap: 8px;">
               ${(player.ratingHistory || []).map(r => `<div style="background: ${getRatingColor(r)}; color: #000; width: 35px; height: 35px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem;">${r.toFixed(1)}</div>`).join("")}
            </div>
          </div>
        </div>

        <!-- Coluna 2: Ambiente de Reunião -->
        <div style="background: #0a0a0a; border: 1px solid #222; border-radius: 15px; display: flex; flex-direction: column; position: relative; background-image: radial-gradient(circle at center, #111 0%, #000 100%);">
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 20px; padding: 40px; text-align: center;">
             <div style="width: 120px; height: 120px; border: 2px solid var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0,255,136,0.05); box-shadow: 0 0 30px rgba(0,255,136,0.1);">
                <i data-lucide="users" style="width: 3.5rem; height: 3.5rem; color: var(--accent);"></i>
             </div>
             <h3 style="color: #fff; font-size: 1.2rem; font-weight: 800;">Os diretores estão reunidos</h3>
             <p style="color: #555; max-width: 400px; line-height: 1.6;">${isBuying ? `Aguardando sua proposta oficial para ser apresentada ao <strong>${player.clubName || "clube detentor"}</strong>.` : `O <strong>${proposal ? proposal.from : "clube interessado"}</strong> apresentou os termos abaixo para a liberação imediata do atleta.`}</p>
          </div>
          
          <div style="background: rgba(0,0,0,0.4); padding: 30px; border-top: 1px solid #222; text-align: center;">
            <div style="font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">PROPOSTA ATUAL</div>
            <div id="negValueDisplay" style="font-size: 2.8rem; font-weight: 900; color: #fff; letter-spacing: -1px;">${formatMoney(initialValue)}</div>
          </div>
        </div>

        <!-- Coluna 3: Painel de Decisão -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          
          <div style="background: #111; border: 1px solid #222; border-radius: 15px; padding: 25px; flex: 1;">
            <h3 style="color: #fff; font-size: 1rem; margin-bottom: 25px; font-weight: 900;">Ações da Diretoria</h3>
            
            <div style="margin-bottom: 30px;">
              <label style="display: block; font-size: 0.65rem; color: #666; margin-bottom: 15px; font-weight: 800; text-transform: uppercase;">Ajustar Valor (OFERTA)</label>
              <input type="range" id="negValueSlider" min="${initialValue * 0.5}" max="${initialValue * 2}" step="50000" value="${initialValue}" style="width: 100%; height: 6px; background: #222; border-radius: 5px; outline: none; cursor: pointer; accent-color: var(--accent);">
              <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.65rem; color: #444;">
                <span>Min: ${formatMoney(initialValue * 0.5)}</span>
                <span>Max: ${formatMoney(initialValue * 2)}</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${!isBuying && proposal ? `
                <button id="negAcceptBtn" class="btn-primary" style="padding: 15px; font-weight: 900; letter-spacing: 1px; font-size: 0.9rem;">ACEITAR PROPOSTA</button>
                <button id="negRejectBtn" class="btn-danger" style="padding: 12px; font-weight: 800; font-size: 0.8rem; opacity: 0.8;">RECUSAR E ENCERRAR</button>
              ` : `
                <button id="negSubmitBtn" class="btn-primary" style="padding: 15px; font-weight: 900; letter-spacing: 1px; font-size: 0.9rem;">ENVIAR OFERTA</button>
              `}
              <button id="negCounterBtn" style="background: transparent; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">FAZER CONTRA-PROPOSTA</button>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.02); border: 1px solid #222; border-radius: 15px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; color: #555; font-size: 0.7rem;">
               <i data-lucide="info" style="width: 1rem; height: 1rem;"></i>
               <span>Seu orçamento atual: <strong style="color: var(--accent);">${formatMoney(coach.budget || 0)}</strong></span>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  const slider = document.getElementById("negValueSlider");
  const valueDisplay = document.getElementById("negValueDisplay");
  if (slider && valueDisplay) {
    slider.oninput = () => {
      valueDisplay.innerText = formatMoney(parseInt(slider.value));
    };
  }

  const acceptBtn = document.getElementById("negAcceptBtn");
  if (acceptBtn) {
    acceptBtn.onclick = async () => {
      const confirm = await showCustomModal(`Confirmar venda de <strong>${player.name}</strong> para o <strong>${proposal.from}</strong> por <strong>${formatMoney(proposal.value)}</strong>?`, "confirm", "btn-primary");
      if (confirm) {
        const idx = squad.findIndex(p => p.id === player.id);
        if (idx !== -1) squad.splice(idx, 1);
        coach.budget += proposal.value;
        coach.proposals = coach.proposals.filter(p => p.id !== propId);
        await Storage.saveCoachInfo(coach);
        import("../core/appCore.js").then(m => m.saveToLocal());
        showCustomModal(`Venda concluída! O saldo do clube agora é ${formatMoney(coach.budget)}`, "alert", "btn-primary");
        switchMainView("dashboard");
      }
    };
  }

  const rejectBtn = document.getElementById("negRejectBtn");
  if (rejectBtn) {
    rejectBtn.onclick = async () => {
      coach.proposals = coach.proposals.filter(p => p.id !== propId);
      await Storage.saveCoachInfo(coach);
      showCustomModal(`Proposta recusada. Os negociadores do <strong>${proposal.from}</strong> deixaram a mesa.`, "alert", "btn-secondary");
      switchMainView("inbox");
    };
  }

  const submitBtn = document.getElementById("negSubmitBtn");
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const offerValue = parseInt(slider.value);
      if (offerValue > coach.budget) {
        showCustomModal("Saldo insuficiente para realizar esta oferta.", "alert", "btn-danger");
        return;
      }
      const confirm = await showCustomModal(`Deseja enviar oferta de <strong>${formatMoney(offerValue)}</strong> para contratar <strong>${player.name}</strong>?`, "confirm", "btn-primary");
      if (confirm) {
        const successChance = offerValue >= player.marketValue ? 0.9 : (offerValue / player.marketValue) * 0.8;
        if (Math.random() < successChance) {
           coach.budget -= offerValue;
           await Storage.saveCoachInfo(coach);
           const newId = squad.length > 0 ? Math.max(...squad.map((x) => x.id)) + 1 : 1;
           const newPlayer = { ...player, id: newId, status: "reserva", matchStatus: "normal", captain: false };
           squad.push(newPlayer);
           import("../core/appCore.js").then(m => m.saveToLocal());
           showCustomModal(`<strong>OFERTA ACEITA!</strong><br><br>${player.name} já está integrado ao seu elenco.`, "alert", "btn-primary");
           switchMainView("table");
        } else {
           showCustomModal(`<strong>PROPOSTA REJEITADA!</strong><br><br>O <strong>${player.clubName || "clube"}</strong> considerou a oferta muito baixa para liberar o atleta.`, "alert", "btn-danger");
        }
      }
    };
  }

  if (window.lucide) window.lucide.createIcons();
}
