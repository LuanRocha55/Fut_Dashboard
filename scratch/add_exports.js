const fs = require('fs');

function addExports(filePath, funcNames) {
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  funcNames.forEach(fn => {
    // Match "async function NAME(" or "function NAME(" not already exported
    const asyncPattern = new RegExp(`(?<!export )async function ${fn}\\(`);
    const syncPattern = new RegExp(`(?<!export )function ${fn}\\(`);
    const constPattern = new RegExp(`(?<!export )const ${fn} = `);
    
    if (asyncPattern.test(code)) {
      code = code.replace(`async function ${fn}(`, `export async function ${fn}(`);
      changed = true;
    } else if (syncPattern.test(code)) {
      code = code.replace(`function ${fn}(`, `export function ${fn}(`);
      changed = true;
    } else if (constPattern.test(code)) {
      code = code.replace(`const ${fn} = `, `export const ${fn} = `);
      changed = true;
    }
  });
  if (changed) fs.writeFileSync(filePath, code);
  return changed;
}

// teams.js
addExports('script/ui/teams.js', ['loadTeams', 'fetchTeamBadge', 'getLeagueBadgeMap', 'loadBadgesLazy', 'loadLeagueLogosLazy', 'renderVisualTeams']);

// views.js
addExports('script/ui/views.js', ['switchMainView', 'showScreen']);

// zones.js
addExports('script/ui/zones.js', ['highlightZones', 'clearZones']);

// dragDrop.js
addExports('script/ui/dragDrop.js', ['handleSubstitution', 'initDragAndDrop']);

// events.js
addExports('script/ui/events.js', ['setupEventListeners', 'initCareerEvents', 'finalizeCareerSetup']);

// render.js
addExports('script/ui/render.js', ['renderApp', 'render', 'renderBench', 'renderMatchHistory', 'renderTeamStats', 'renderPitchPlayers', 'updateTeamStatsUI', 'renderTeamChemistry', 'updateDashboardCoach']);

// init.js
addExports('script/ui/init.js', ['main']);

console.log('All exports added!');
