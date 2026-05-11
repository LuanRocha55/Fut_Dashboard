import {
  squad,
  formations,
  ALL_POSITIONS,
  initSystem,
  performSwap,
  downloadJSON,
  resetData,
  resetFormationAlignment,
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
}

export function renderApp() {
  render();
}

function render() {
  const pitch = document.getElementById("pitch");
  const bench = document.getElementById("benchList");
  pitch.querySelectorAll(".player").forEach((el) => el.remove());
  bench.innerHTML = "";

  ensureCaptain();

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
    totalFis = 0,
    totalSta = 0;
  let outfieldCount = 0;
  let playstylesCount = {};

  const pitchFragment = document.createDocumentFragment();

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

    const fitLevel = p.fitness !== undefined ? p.fitness : 100;
    const fitColorBar =
      fitLevel > 70
        ? "var(--accent)"
        : fitLevel > 40
          ? "var(--warning)"
          : "var(--danger)";
    const fitBarHtml = `<div style="position:absolute; bottom: -28px; left: -10%; width: 120%; height: 6px; background: rgba(0,0,0,0.8); border: 1px solid #000; border-radius: 3px; overflow: hidden; z-index: 15; box-shadow: 0 2px 4px rgba(0,0,0,0.5);"><div style="height: 100%; width: ${fitLevel}%; background: ${fitColorBar}; transition: width 0.3s ease, background 0.3s ease;"></div></div>`;

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
      totalSta += s.sta || s.stm || 50;
      outfieldCount++;
    }

    if (p.nationality && p.nationality !== "BR") estrangeirosCount++;
    if (p.playstyle)
      playstylesCount[p.playstyle] = (playstylesCount[p.playstyle] || 0) + 1;

    const el = document.createElement("div");
    el.className = `player ${fitClass} ${liveStatusClass}`;
    el.dataset.id = p.id;
    el.style.cssText = `top: ${topPos}%; left: ${leftPos}%;`;
    el.innerHTML = `<div class="p-icon" style="border-color: ${getRatingColor(pRating)}">${getMatchStatusHTML(p.matchStatus)}${p.captain ? '<div class="captain-armband">C</div>' : ""}<div class="p-pos-badge">${currentZone}</div><div class="p-form">${getFormHTML(p.form)}</div>${p.number}<span class="p-badge" style="background: ${getRatingColor(displayRating)}">${displayRating.toFixed(1)}</span>${fitBarHtml}</div><div class="p-name">${p.name}</div>`;
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
    // UX Melhorada: Duplo clique ou clique simples (com verificação para não conflitar com drag)
    el.onclick = () => {
      if (!el.classList.contains("dragging")) openMenu(p.id);
    };
    pitchFragment.appendChild(el);
  });
  pitch.appendChild(pitchFragment);

  if (titulares.length > 0) {
    const divBy = outfieldCount > 0 ? outfieldCount : 1;
    const avgStats = {
      vel: Math.round(totalVel / divBy),
      fin: Math.round(totalFin / divBy),
      pas: Math.round(totalPas / divBy),
      dri: Math.round(totalDri / divBy),
      def: Math.round(totalDef / divBy),
      fis: Math.round(totalFis / divBy),
      sta: Math.round(totalSta / divBy),
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

    // Render Match History
    const historyContainer = document.getElementById("matchHistoryList");
    if (historyContainer) {
      historyContainer.innerHTML = "";
      if (matchHistory.length === 0) {
        historyContainer.innerHTML =
          "<span style='font-size:0.7rem; color:#666;'>Nenhuma partida simulada ainda.</span>";
      } else {
        matchHistory.forEach((m) => {
          const isHome = m.homeTeam === (matchInfo.home || "Seu Time");
          const myScore = isHome ? m.homeScore : m.awayScore;
          const oppScore = isHome ? m.awayScore : m.homeScore;
          let color = "#888";
          let resChar = "E";
          if (myScore > oppScore) {
            color = "var(--accent)";
            resChar = "V";
          } else if (myScore < oppScore) {
            color = "var(--danger)";
            resChar = "D";
          }
          const badge = document.createElement("div");
          badge.style.cssText = `background: #222; border: 1px solid ${color}; color: ${color}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 0.9rem; font-weight: bold; cursor: help;`;
          badge.title = `${m.homeTeam} ${m.homeScore} x ${m.awayScore} ${m.awayTeam}`;
          badge.innerText = resChar;
          historyContainer.appendChild(badge);
        });
      }
    }

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

  const benchSortValue = document.getElementById("benchSortSelect").value;
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
        return bFit - aFit; // Booleans convert to 1/0, so this puts fit players first
      }
      // If both are fit or both unfit, sort by rating as a secondary measure
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    // Default to position sort
    return (
      (ALL_POSITIONS.indexOf(a.aptitude?.[0]) ?? 99) -
      (ALL_POSITIONS.indexOf(b.aptitude?.[0]) ?? 99)
    );
  });

  const benchFragment = document.createDocumentFragment();
  reservasDisplay.forEach((p) => {
    const res = document.createElement("div");
    const isGK = p.aptitude && p.aptitude[0] === "GL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK);
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
    res.innerHTML = `<div style="display: flex; justify-content: space-between; width: 100%; align-items: center; position: relative;">${mStatusHtml}<span style="font-size: 0.65rem; background: #222; padding: 2px 4px; border-radius: 4px; border: 1px solid #444; font-weight: 800; margin-left: ${mStatusHtml ? "12px" : "0"};">${p.aptitude?.[0] || "??"}</span><div style="display: flex; align-items: center; gap: 4px;">${getFormHTML(p.form)} <span style="background: ${getRatingColor(pRating)}; color: #000; font-size: 0.7rem; font-weight: 900; padding: 2px 4px; border-radius: 4px;">${pRating.toFixed(1)}</span></div></div><svg class="player-silhouette" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><div style="margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; width: 100%;"><strong>${p.name}</strong></div><div style="width: 90%; height: 6px; background: rgba(0,0,0,0.8); border: 1px solid #000; border-radius: 3px; overflow: hidden; margin-top: 4px; margin-bottom: 5px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);"><div style="height: 100%; width: ${fitLevel}%; background: ${fitColor}; transition: width 0.3s ease, background 0.3s ease;"></div></div><div style="font-size: 0.6rem; color: #888; margin-top: 2px;">Nº ${p.number} | ${p.age || "--"}A | ${p.foot ? p.foot.charAt(0).toUpperCase() : "D"}</div>`;
    res.onclick = () => openMenu(p.id);
    benchFragment.appendChild(res);
  });
  bench.appendChild(benchFragment);
  initDragAndDrop();

  if (isTableView) renderTable();
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
}

function setupEventListeners() {
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

  document
    .getElementById("formationSelect")
    .addEventListener("change", async (e) => {
      await Storage.setCurrentFormation(e.target.value);
      resetFormationAlignment(e.target.value);
      render();
    });

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

async function main() {
  // 1. Garante que o botão de Resetar funcione SEMPRE, mesmo se a tela quebrar ao carregar!
  document.getElementById("resetBtn").onclick = async () => {
    const proceed = await showCustomModal(
      "ATENÇÃO: Isso apagará todas as suas edições, contratações e táticas salvas. Deseja realmente resetar o aplicativo para os padrões de fábrica?",
      "confirm",
      "btn-danger",
    );
    if (proceed) {
      await resetData();
    }
  };

  // 2. [EMERGÊNCIA] Descomente a linha abaixo (remova as duas barras //), salve,
  // atualize a página 1 vez e depois comente a linha de novo para não apagar tudo sempre.
  // localStorage.clear();

  const teamSelect = document.getElementById("teamSelect");
  if (teamSelect) {
    teamSelect.value = (await Storage.getCurrentTeamFile()) || "vasco.json";
  }

  const initResult = await initSystem();
  if (initResult === true) {
    const select = document.getElementById("formationSelect");

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

    // Lógica de Memória de Tática do Usuário (Default 4-3-3)
    let savedFormation = await Storage.getCurrentFormation();
    if (!savedFormation || !sortedFormations.includes(savedFormation)) {
      savedFormation = sortedFormations.includes("4-3-3")
        ? "4-3-3"
        : sortedFormations[0];
      await Storage.setCurrentFormation(savedFormation);
    }
    select.value = savedFormation;

    // Força o aplicativo a abrir sempre na nova Visão Geral
    switchMainView("dashboard");
    setupEventListeners();
  } else {
    await showCustomModal(
      typeof initResult === "string"
        ? initResult
        : "Erro crítico desconhecido ao carregar os dados.",
      "alert",
      "btn-danger",
    );
  }
}

main();
