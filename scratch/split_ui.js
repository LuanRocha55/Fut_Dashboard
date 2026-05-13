const fs = require('fs');
const path = require('path');

function splitFile(filePath, destFolder, modulesConfig) {
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  
  let currentFunc = null;
  let braceCount = 0;
  let inFunc = false;
  let funcBody = [];
  
  const extractedFuncs = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we are starting a function
    if (!inFunc) {
      const match = line.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/) || 
                    line.match(/^(?:export\s+)?(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/);
                    
      if (match) {
        currentFunc = match[1] || match[2];
        inFunc = true;
        braceCount = 0;
        funcBody = [];
      }
    }
    
    if (inFunc) {
      funcBody.push(line);
      
      // Basic brace counting (ignores braces in strings/comments, but usually fine for simple code)
      // To be slightly safer, we strip strings and comments before counting:
      let cleanLine = line.replace(/(['"`]).*?\1/g, '').replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      
      braceCount += (cleanLine.match(/\{/g) || []).length;
      braceCount -= (cleanLine.match(/\}/g) || []).length;
      
      if (braceCount === 0 && funcBody.some(l => l.includes('{'))) {
        // Function ended
        extractedFuncs[currentFunc] = funcBody.join('\n');
        inFunc = false;
        currentFunc = null;
      }
    }
  }
  
  // Now write to files based on config
  let importsHeader = `import { squad, formations, ALL_POSITIONS, initSystem, performSwap, downloadJSON, resetData, resetFormationAlignment, resetSystem, calculateOVR, saveToLocal, healSquad, matchHistory, matchInfo, ensureCaptain } from "../core.js";\n`;
  importsHeader += `import { getEfootballPosition, checkPositionFit, swapTitulares, handlePlayerMove, autoFillTeam } from "../tactics.js";\n`;
  importsHeader += `import { openMatchSimulation } from "../simulation.js";\n`;
  importsHeader += `import { getRatingColor, getStarsHTML, getFormHTML, getMatchStatusHTML, drawRadar, normalizeTeamName } from "../graphics.js";\n`;
  importsHeader += `import { showCustomModal } from "../modal.js";\n`;
  importsHeader += `import { normalizeStr } from "../utils.js";\n`;
  importsHeader += `import { initEditorEvents, openMenu } from "../playerEditor.js";\n`;
  importsHeader += `import { initTableEvents, isTableView, renderTable, setTableView } from "../tableView.js";\n`;
  importsHeader += `import { initLeagueEvents, autoInitLeague } from "../league.js";\n`;
  importsHeader += `import { renderLeagueData } from "../leagueRenderer.js";\n`;
  importsHeader += `import { Storage } from "../storage.js";\n\n`;

  for (const [filename, funcs] of Object.entries(modulesConfig)) {
    let content = importsHeader;
    for (const fn of funcs) {
      if (extractedFuncs[fn]) {
        content += extractedFuncs[fn] + '\n\n';
      }
    }
    fs.writeFileSync(path.join(destFolder, filename), content);
  }
  
  console.log('Extraction complete for', filePath);
}

const uiModules = {
  'utils.js': ['dbgToast'],
  'zones.js': ['highlightZones', 'clearZones'],
  'views.js': ['switchMainView', 'showScreen'],
  'dragDrop.js': ['handleSubstitution', 'initDragAndDrop'],
  'events.js': ['setupEventListeners', 'initCareerEvents', 'finalizeCareerSetup'],
  'teams.js': ['loadTeams', 'fetchTeamBadge', 'getLeagueBadgeMap', 'loadBadgesLazy', 'loadLeagueLogosLazy', 'renderVisualTeams'],
  'render.js': ['renderApp', 'render', 'renderBench', 'renderMatchHistory', 'renderTeamStats', 'renderPitchPlayers', 'updateTeamStatsUI', 'renderTeamChemistry', 'updateDashboardCoach'],
  'init.js': ['main']
};

splitFile('script/ui.js', 'script/ui', uiModules);
