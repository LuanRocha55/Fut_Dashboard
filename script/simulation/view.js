import { getTacticalPositions, getRole } from "./engine.js";

/**
 * Renderiza a prancheta tática com os jogadores em campo.
 */
export const renderMiniPitch = (homeActivePlayers, currentFormation, selectedOutIdx, checkSubButtonCallback) => {
  const pitch = document.getElementById("miniPitchPlayers");
  if (!pitch) return;
  pitch.innerHTML = "";

  const tacticalPos = getTacticalPositions(currentFormation);
  const onPitchPlayers = homeActivePlayers.filter(p => !p.isExpelled);

  onPitchPlayers.forEach((p, i) => {
    const slot = tacticalPos[i] || { x: 50, y: 50, pos: "MC" };
    const coords = { x: slot.x, y: slot.y };
    const isSelected = i === selectedOutIdx ? "selected" : "";
    const fit = Math.floor(p.currentStamina);
    const fitColor = fit > 70 ? "var(--accent)" : fit > 40 ? "var(--warning)" : "var(--danger)";

    const slotRole = getRole(slot.pos);
    const playerRole = getRole(p.aptitude?.[0] || "MC");
    const isOutPos = slotRole !== playerRole;

    const node = document.createElement("div");
    node.className = `mini-player-node ${isSelected}`;
    node.style.left = `${coords.x}%`;
    node.style.top = `${coords.y}%`;
    node.style.borderColor = isOutPos ? "#fff" : fitColor;
    node.style.borderStyle = isOutPos ? "dashed" : "solid";
    node.style.boxShadow = isSelected ? `0 0 10px ${fitColor}` : "none";

    node.innerHTML = `
      <span style="color: ${isOutPos ? '#fff' : fitColor}; font-weight: bold;">${p.aptitude?.[0] || "?"}</span>
      <div class="mini-player-label">${p.name.split(" ").pop()}</div>
      <div style="position:absolute; bottom:-3px; right:-3px; width:8px; height:8px; border-radius:50%; background:${fitColor}; border:1px solid #000;"></div>
    `;
    node.title = `${p.name} - Estamina: ${fit}% ${isOutPos ? '(Fora de Posição)' : ''}`;

    node.onclick = () => {
      checkSubButtonCallback(i);
    };

    pitch.appendChild(node);
  });
};

/**
 * Atualiza o log da partida.
 */
export const addLog = (minute, text, type = "log-neutral") => {
  const logContainer = document.getElementById("simLog");
  if (!logContainer) return;

  const el = document.createElement("div");
  el.className = `log-entry ${type}`;
  el.innerHTML = `<strong style="font-size:0.9rem;">${minute}'</strong> &nbsp; ${text}`;
  logContainer.appendChild(el);

  setTimeout(() => {
    logContainer.scrollTo({
      top: logContainer.scrollHeight,
      behavior: "smooth",
    });
  }, 10);
};

/**
 * Atualiza o gráfico de momento (estilo SofaScore).
 */
export const updateMomentumGraph = (intensity, momentumHistoryLength) => {
  const graph = document.getElementById("simMomentumGraph");
  if (!graph) return;

  const bar = document.createElement("div");
  const height = Math.abs(intensity) * 0.4;

  bar.style.width = "4px";
  bar.style.height = `${Math.max(2, height)}px`;
  bar.style.flexShrink = "0";
  bar.style.borderRadius = "1px";
  bar.style.zIndex = "2";
  bar.style.transition = "height 0.3s ease";

  if (intensity >= 0) {
    bar.style.background = "var(--accent)";
    bar.style.alignSelf = "flex-end";
    bar.style.marginBottom = "40px";
    bar.style.boxShadow = "0 0 5px var(--accent)44";
  } else {
    bar.style.background = "#ff4d4d";
    bar.style.alignSelf = "flex-start";
    bar.style.marginTop = "40px";
  }

  graph.appendChild(bar);
  if (momentumHistoryLength > 20) {
    graph.scrollLeft = graph.scrollWidth;
  }
};

/**
 * Atualiza as estatísticas exibidas na UI.
 */
export const updateStatsUI = (stats) => {
  const {
    homeScore, awayScore, homePossession, homeShots, homeShotsOnTarget,
    awayShots, awayShotsOnTarget, homeFouls, awayFouls, homePasses, awayPasses,
    homeCorners, awayCorners, homeCrosses, awayCrosses, homeOffsides, awayOffsides,
    homeLongBalls, awayLongBalls, homeTackles, awayTackles, homeCards, awayCards,
    homeSaves, awaySaves, homeScorers, awayScorers
  } = stats;

  const homeScorersDiv = document.getElementById("simHomeScorers");
  const awayScorersDiv = document.getElementById("simAwayScorers");
  if (!homeScorersDiv || !awayScorersDiv) return;

  const formatStats = (scorersArr, cardsArr) => {
    const counts = {};
    scorersArr.forEach((n) => (counts[n] = (counts[n] || 0) + 1));
    let html = Object.entries(counts)
      .map(([n, c]) => `⚽ ${n} ${c > 1 ? `(${c})` : ""}`)
      .join("<br>");

    if (cardsArr.length > 0) {
      if (html) html += "<br>";
      html += cardsArr
        .map((c) => `${c.type === "red" ? "🟥" : "🟨"} ${c.name}`)
        .join("<br>");
    }
    return html;
  };

  homeScorersDiv.innerHTML = formatStats(homeScorers, homeCards);
  awayScorersDiv.innerHTML = formatStats(awayScorers, awayCards);

  document.getElementById("simHomePossession").innerText = homePossession;
  document.getElementById("simAwayPossession").innerText = 100 - homePossession;
  document.getElementById("simHomeShots").innerText = homeShots;
  document.getElementById("simHomeShotsOnTarget").innerText = homeShotsOnTarget;
  document.getElementById("simAwayShots").innerText = awayShots;
  document.getElementById("simAwayShotsOnTarget").innerText = awayShotsOnTarget;
  document.getElementById("simHomeFouls").innerText = homeFouls;
  document.getElementById("simAwayFouls").innerText = awayFouls;
  document.getElementById("simHomePasses").innerText = homePasses;
  document.getElementById("simAwayPasses").innerText = awayPasses;
  document.getElementById("simHomeCorners").innerText = homeCorners;
  document.getElementById("simAwayCorners").innerText = awayCorners;
  document.getElementById("simHomeCrosses").innerText = homeCrosses;
  document.getElementById("simAwayCrosses").innerText = awayCrosses;
  document.getElementById("simHomeOffsides").innerText = homeOffsides;
  document.getElementById("simAwayOffsides").innerText = awayOffsides;
  document.getElementById("simHomeLongBalls").innerText = homeLongBalls;
  document.getElementById("simAwayLongBalls").innerText = awayLongBalls;
  document.getElementById("simHomeTackles").innerText = homeTackles;
  document.getElementById("simAwayTackles").innerText = awayTackles;
  document.getElementById("simHomeCards").innerText = homeCards.length;
  document.getElementById("simAwayCards").innerText = awayCards.length;
  document.getElementById("simHomeSaves").innerText = homeSaves;
  document.getElementById("simAwaySaves").innerText = awaySaves;

  const scoreEl = document.getElementById("simScore");
  if (scoreEl) scoreEl.innerText = `${homeScore} x ${awayScore}`;
};
