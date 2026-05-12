import {
  squad, calculateOVR, ALL_POSITIONS, performSwap, ensureCaptain
} from "../core.js";
import {
  getRatingColor, getFormHTML, getMatchStatusHTML
} from "../graphics.js";
import {
  getEfootballPosition, checkPositionFit, swapTitulares
} from "../tactics.js";
import { showCustomModal } from "../modal.js";
import { openMenu } from "../playerEditor.js";
import { Storage } from "../storage.js";

/**
 * Destaca as zonas de aptidão do jogador no campo.
 */
export function highlightZones(player) {
  const pitch = document.getElementById("pitch");
  if (!pitch) return;
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

/**
 * Limpa os destaques de zona.
 */
export function clearZones() {
  const pitch = document.getElementById("pitch");
  if (pitch) {
    pitch.classList.remove("active-selection");
    pitch.classList.remove("drag-over");
  }
}

/**
 * Renderiza os jogadores titulares no campo.
 */
export function renderPitchPlayers(titulares, format, squad, openMenuCallback) {
  const pitch = document.getElementById("pitch");
  if (!pitch) return {};

  const pitchFragment = document.createDocumentFragment();

  let stats = {
    totalRating: 0, totalAge: 0, fitCount: 0, destrosCount: 0, canhotosCount: 0,
    ambiCount: 0, estrangeirosCount: 0, totalVel: 0, totalFin: 0, totalPas: 0,
    totalDri: 0, totalDef: 0, totalFis: 0, totalSta: 0, outfieldCount: 0,
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

    el.ondragover = (e) => { e.preventDefault(); el.classList.add("drag-over-player"); };
    el.ondragleave = () => el.classList.remove("drag-over-player");
    el.ondrop = (e) => {
      e.preventDefault();
      el.classList.remove("drag-over-player");
      clearZones();
      const draggedId = e.dataTransfer.getData("playerId");
      if (draggedId && draggedId !== p.id.toString()) {
        swapTitulares(parseInt(draggedId, 10), p.id);
        window.render();
      } else {
        const reserveId = e.dataTransfer.getData("reserveId");
        if (reserveId) {
          const resPlayer = squad.find(x => x.id === parseInt(reserveId, 10));
          if (resPlayer && (resPlayer.matchStatus === "red" || resPlayer.matchStatus === "injury")) {
            showCustomModal("Jogadores suspensos ou machucados não podem ser escalados.", "alert", "btn-danger");
            return;
          }
          performSwap(p.id, parseInt(reserveId, 10));
          window.render();
        }
      }
    };

    pitchFragment.appendChild(el);
  });
  pitch.appendChild(pitchFragment);
  return stats;
}

/**
 * Renderiza o banco de reservas.
 */
export function renderBench(reservas, benchSortValue, showOnlyFitPlayers) {
  const bench = document.getElementById("benchList");
  if (!bench) return;
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
      if (aFit !== bFit) return bFit - aFit;
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (ALL_POSITIONS.indexOf(a.aptitude?.[0]) ?? 99) - (ALL_POSITIONS.indexOf(b.aptitude?.[0]) ?? 99);
  });

  const benchFragment = document.createDocumentFragment();
  reservasDisplay.forEach((p) => {
    const res = document.createElement("div");
    const isGK = p.aptitude && p.aptitude[0] === "GOL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK, p.aptitude?.[0]);
    const mStatusHtml = getMatchStatusHTML(p.matchStatus);
    const fitLevel = p.fitness !== undefined ? p.fitness : 100;
    const fitColor = fitLevel > 70 ? "var(--accent)" : fitLevel > 40 ? "var(--warning)" : "var(--danger)";

    res.className = "reserve-item";
    res.dataset.id = p.id;
    res.innerHTML = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; position: relative;">
        ${mStatusHtml}
        <span style="font-size: 0.65rem; background: #222; padding: 2px 4px; border-radius: 4px; border: 1px solid #444; font-weight: 800; margin-left: ${mStatusHtml ? "12px" : "0"};">${p.aptitude?.[0] || "??"}</span>
        <div style="display: flex; align-items: center; gap: 4px;">
          ${getFormHTML(p.form)} 
          <span style="background: ${getRatingColor(pRating)}; color: #000; font-size: 0.7rem; font-weight: 900; padding: 2px 4px; border-radius: 4px;">${pRating.toFixed(1)}</span>
        </div>
      </div>
      <svg class="player-silhouette" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      <div style="margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; width: 100%;"><strong>${p.name}</strong></div>
      <div style="width: 90%; height: 5px; background: rgba(0,0,0,0.6); border: 1px solid rgba(0,0,0,0.8); border-radius: 2px; overflow: hidden; margin: 6px auto;">
        <div style="height: 100%; width: ${fitLevel}%; background: ${fitColor}; transition: width 0.3s ease;"></div>
      </div>
      <div style="font-size: 0.6rem; color: #888; margin-top: 2px;">Nº ${p.number} | ${p.age || "--"}A | ${p.foot ? p.foot.charAt(0).toUpperCase() : "D"}</div>`;

    res.draggable = true;
    res.ondragstart = (e) => {
      e.dataTransfer.setData("reserveId", p.id);
      highlightZones(p);
    };
    res.ondragend = clearZones;
    res.onclick = () => openMenu(p.id);
    benchFragment.appendChild(res);
  });
  bench.appendChild(benchFragment);
}
