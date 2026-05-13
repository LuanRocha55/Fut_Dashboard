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

  let audioImports = ``;

  let coreImports = `import { squad, matchInfo, ALL_POSITIONS, ensureCaptain } from "../core.js";\n`;
  coreImports += `import { showCustomModal } from "../modal.js";\n`;
  coreImports += `import { switchMainView } from "../ui.js";\n`;
  coreImports += `import { setTableView } from "../tableView.js";\n`;
  coreImports += `import { Storage } from "../storage.js";\n`;
  coreImports += `import { getMatchDate } from "../league.js";\n`;
  coreImports += `import { getHomeGoalPhrase, getAwayGoalPhrase, getMissPhrase, getSavePhrase, getOppSavePhrase } from "../narrator.js";\n`;
  coreImports += `import { handleMatchPostGame } from "../matchPostGame.js";\n`;
  coreImports += `import { startPenaltyShootout } from "../penalties.js";\n`;
  coreImports += `import { loadOpponentData, getRandomReferee, getTeamAtk, getTeamDef, degradeStamina } from "../matchEngine.js";\n`;
  coreImports += `import { getTeamLogoHTML } from "../graphics.js";\n`;
  coreImports += `import { playSound } from "./audio.js";\n`;

  for (const [filename, funcs] of Object.entries(modulesConfig)) {
    let content = filename === "audio.js" ? audioImports : coreImports;
    for (const fn of funcs) {
      if (extractedFuncs[fn]) {
        content += extractedFuncs[fn] + "\n\n";
      }
    }
    fs.writeFileSync(path.join(destFolder, filename), content);
  }

  console.log("Extraction complete for", filePath);
}

const simModules = {
  "audio.js": ["playSound"],
  "core.js": ["openMatchSimulation"],
};

splitFile("script/simulation.js", "script/simulation", simModules);
