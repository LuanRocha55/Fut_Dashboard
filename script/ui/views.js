import {
  renderApp,
  renderTeamStats,
} from "./render.js";
import {
  setTableView,
} from "./uiTableView.js";

export function switchMainView(viewName) {
  setTableView(viewName === "table");

  const pitch = document.getElementById("pitch");
  const table = document.getElementById("tableView");
  const sim = document.getElementById("simulationView");
  const dashboard = document.getElementById("dashboardView");
  const league = document.getElementById("leagueView");
  const teamStats = document.getElementById("teamStatsView");
  const transfer = document.getElementById("transferView");
  const bench = document.querySelector(".bottom-bench");
  const sidebar = document.getElementById("sidebar");

  if (pitch) pitch.style.display = "none";
  if (table) table.style.display = "none";
  if (sim) sim.style.display = "none";
  if (dashboard) dashboard.style.display = "none";
  if (league) league.style.display = "none";
  if (teamStats) teamStats.style.display = "none";
  if (transfer) transfer.style.display = "none";

  const navDash = document.getElementById("navDashboardBtn");
  const navPitch = document.getElementById("navPitchBtn");
  const navTable = document.getElementById("navTableBtn");
  const navTransfer = document.getElementById("navTransferBtn");

  if (navPitch) navPitch.className = "btn-secondary";
  if (navTable) navTable.className = "btn-secondary";
  if (navTransfer) navTransfer.className = "btn-secondary";

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
  } else if (viewName === "transfer") {
    if (sidebar) sidebar.style.display = "flex";
    if (transfer) transfer.style.display = "block";
    if (bench) bench.style.display = "none";
    if (navTransfer) navTransfer.className = "btn-primary";
  } else {
    // dashboard
    if (sidebar) sidebar.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    if (bench) bench.style.display = "none";
    renderApp();
  }
  if (window.lucide) window.lucide.createIcons();
}

export function showScreen(screenId) {
  const screens = [
    "mainMenuScreen",
    "coachCreationScreen",
    "teamSelectionScreen",
    "mainApp",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      // mainApp e teamSelectionScreen precisam de flex para o layout funcionar
      el.style.display =
        id === "mainApp" || id === "teamSelectionScreen" ? "flex" : "flex";
    } else {
      el.style.display = "none";
    }
  });
  if (window.lucide) window.lucide.createIcons();
}
