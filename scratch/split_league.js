const fs = require("fs");
const path = require("path");

function splitFile(filePath, destFolder, modulesConfig) {
  const code = fs.readFileSync(filePath, "utf8");
  const lines = code.split("\n");

  let currentFunc = null;
  let braceCount = 0;
  let inFunc = false;
  let funcBody = [];

  const extractedFuncs = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFunc) {
      const match =
        line.match(
          /^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/,
        ) ||
        line.match(
          /^(?:export\s+)?(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/,
        );

      if (match) {
        currentFunc = match[1] || match[2];
        inFunc = true;
        braceCount = 0;
        funcBody = [];
      }
    }

    if (inFunc) {
      funcBody.push(line);
      let cleanLine = line
        .replace(/(['"`]).*?\1/g, "")
        .replace(/\/\/.*$/, "")
        .replace(/\/\*.*?\*\//g, "");
      braceCount += (cleanLine.match(/\{/g) || []).length;
      braceCount -= (cleanLine.match(/\}/g) || []).length;

      if (braceCount === 0 && funcBody.some((l) => l.includes("{"))) {
        extractedFuncs[currentFunc] = funcBody.join("\n");
        inFunc = false;
        currentFunc = null;
      }
    }
  }

  let importsHeader = `import { Storage } from "../storage.js";\n`;
  importsHeader += `import { saveToLocal, loadFromLocal } from "../core.js";\n`;
  importsHeader += `import { BRASILEIRAO_SERIE_A_TEAMS } from "../teams_br_a.js";\n`;
  importsHeader += `import { renderLeagueData, renderContinentalStandings, renderContinentalFixtures, renderSeasonReport } from "../leagueRenderer.js";\n`;
  importsHeader += `import { LEAGUE_CONFIG } from "../leagueConfig.js";\n`;
  importsHeader += `import { showCustomModal } from "../modal.js";\n`;
  importsHeader += `import { drawRadar } from "../graphics.js";\n\n`;
  importsHeader += `// Add exports for inter-module calls\n`;
  importsHeader += `import { simulateCurrentRound, autoInitLeague, createNewLeague, generateFixtures, getAutoLeagueType, formatMatchDate, getMatchDate } from "./core.js";\n`;
  importsHeader += `import { updateMonthUI } from "./events.js";\n\n`;

  for (const [filename, funcs] of Object.entries(modulesConfig)) {
    let content = importsHeader;
    for (const fn of funcs) {
      if (extractedFuncs[fn]) {
        content += extractedFuncs[fn] + "\n\n";
      }
    }
    fs.writeFileSync(path.join(destFolder, filename), content);
  }

  console.log("Extraction complete for", filePath);
}

const leagueModules = {
  "core.js": [
    "getMatchDate",
    "formatMatchDate",
    "getAutoLeagueType",
    "autoInitLeague",
    "createNewLeague",
    "generateFixtures",
    "simulateCurrentRound",
    "getSimulatedScorer",
  ],
  "events.js": ["updateMonthUI", "initLeagueEvents"],
};

splitFile("script/league.js", "script/league", leagueModules);
