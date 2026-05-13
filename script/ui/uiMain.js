// Main entry point for the UI module
export { highlightZones, clearZones } from "./zones.js";
export { switchMainView } from "./views.js";
export { renderApp, render, renderTeamStats } from "./render.js";

import { main } from "./init.js";

main();
