import { setTableView, renderTable } from "../tableView.js";
import { renderTeamStats } from "./stats.js";

/**
 * Gerencia a troca entre as visões principais do dashboard.
 */
export function switchMainView(viewName) {
  setTableView(viewName === "table");

  const views = {
    pitch: document.getElementById("pitch"),
    table: document.getElementById("tableView"),
    sim: document.getElementById("simulationView"),
    dashboard: document.getElementById("dashboardView"),
    league: document.getElementById("leagueView"),
    teamStats: document.getElementById("teamStatsView")
  };

  const bench = document.querySelector(".bottom-bench");
  const sidebar = document.getElementById("sidebar");

  // Esconder todas as visões
  Object.values(views).forEach(v => { if (v) v.style.display = "none"; });

  const navButtons = {
    pitch: document.getElementById("navPitchBtn"),
    table: document.getElementById("navTableBtn"),
    dash: document.getElementById("navDashboardBtn")
  };

  // Reset de classes dos botões
  if (navButtons.pitch) navButtons.pitch.className = "btn-secondary";
  if (navButtons.table) navButtons.table.className = "btn-secondary";

  if (viewName === "simulation") {
    if (sidebar) sidebar.style.display = "none";
    if (views.sim) views.sim.style.display = "block";
    if (bench) bench.style.display = "none";
  } else if (viewName === "table") {
    if (sidebar) sidebar.style.display = "flex";
    if (views.table) views.table.style.display = "block";
    if (bench) bench.style.display = "none";
    if (navButtons.table) navButtons.table.className = "btn-primary";
    window.render();
  } else if (viewName === "pitch") {
    if (sidebar) sidebar.style.display = "flex";
    if (views.pitch) views.pitch.style.display = "block";
    if (bench) bench.style.display = "flex";
    if (navButtons.pitch) navButtons.pitch.className = "btn-primary";
    window.render();
  } else if (viewName === "league") {
    if (sidebar) sidebar.style.display = "none";
    if (views.league) views.league.style.display = "block";
    if (bench) bench.style.display = "none";
    window.render();
  } else if (viewName === "teamStats") {
    if (sidebar) sidebar.style.display = "none";
    if (views.teamStats) views.teamStats.style.display = "block";
    if (bench) bench.style.display = "none";
    renderTeamStats();
  } else {
    // dashboard
    if (sidebar) sidebar.style.display = "none";
    if (views.dashboard) views.dashboard.style.display = "block";
    if (bench) bench.style.display = "none";
    window.render();
  }

  if (window.lucide) window.lucide.createIcons();
}
