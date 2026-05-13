// Main entry point for the UI module
export { highlightZones, clearZones } from "./ui/zones.js";
export { switchMainView } from "./ui/views.js";
export { renderApp, render, renderTeamStats } from "./ui/render.js";

import { main } from "./ui/init.js";

main();
