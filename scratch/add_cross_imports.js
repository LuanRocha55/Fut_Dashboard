const fs = require("fs");
const path = require("path");

const uiModules = {
  "utils.js": ["dbgToast"],
  "zones.js": ["highlightZones", "clearZones"],
  "views.js": ["switchMainView", "showScreen"],
  "dragDrop.js": ["handleSubstitution", "initDragAndDrop"],
  "events.js": [
    "setupEventListeners",
    "initCareerEvents",
    "finalizeCareerSetup",
  ],
  "teams.js": [
    "loadTeams",
    "fetchTeamBadge",
    "getLeagueBadgeMap",
    "loadBadgesLazy",
    "loadLeagueLogosLazy",
    "renderVisualTeams",
  ],
  "render.js": [
    "renderApp",
    "render",
    "renderBench",
    "renderMatchHistory",
    "renderTeamStats",
    "renderPitchPlayers",
    "updateTeamStatsUI",
    "renderTeamChemistry",
    "updateDashboardCoach",
  ],
  "init.js": ["main"],
};

for (const [filename, funcs] of Object.entries(uiModules)) {
  let fileContent = fs.readFileSync(path.join("script/ui", filename), "utf8");
  let crossImports = "";
  for (const [otherFilename, otherFuncs] of Object.entries(uiModules)) {
    if (filename !== otherFilename) {
      crossImports += `import { ${otherFuncs.join(", ")} } from './${otherFilename}';\n`;
    }
  }
  if (fileContent.includes("import { squad")) {
    fileContent = fileContent.replace(
      "import { squad",
      crossImports + "\nimport { squad",
    );
    fs.writeFileSync(path.join("script/ui", filename), fileContent);
  }
}
