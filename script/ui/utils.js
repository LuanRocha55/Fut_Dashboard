import { highlightZones, clearZones } from './zones.js';
import { switchMainView, showScreen } from './views.js';
import { handleSubstitution, initDragAndDrop } from './dragDrop.js';
import { setupEventListeners, initCareerEvents, finalizeCareerSetup } from './events.js';
import { loadTeams, fetchTeamBadge, getLeagueBadgeMap, loadBadgesLazy, loadLeagueLogosLazy, renderVisualTeams } from './teams.js';
import { renderApp, render, renderBench, renderMatchHistory, renderTeamStats, renderPitchPlayers, updateTeamStatsUI, renderTeamChemistry, updateDashboardCoach } from './render.js';
import { main } from './init.js';

import { squad, formations, ALL_POSITIONS, initSystem, performSwap, downloadJSON, resetData, resetFormationAlignment, resetSystem, calculateOVR, saveToLocal, healSquad, matchHistory, matchInfo, ensureCaptain } from "../core.js";
import { getEfootballPosition, checkPositionFit, swapTitulares, handlePlayerMove, autoFillTeam } from "../tactics.js";
import { openMatchSimulation } from "../simulation.js";
import { getRatingColor, getStarsHTML, getFormHTML, getMatchStatusHTML, drawRadar, normalizeTeamName } from "../graphics.js";
import { showCustomModal } from "../modal.js";
import { normalizeStr } from "../utils.js";
import { initEditorEvents, openMenu } from "../playerEditor.js";
import { initTableEvents, isTableView, renderTable, setTableView } from "../tableView.js";
import { initLeagueEvents, autoInitLeague } from "../league.js";
import { renderLeagueData } from "../leagueRenderer.js";
import { Storage } from "../storage.js";

let _dbgContainer = null;

export function dbgToast(msg, bg = "#222", duration = 4000) {
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

