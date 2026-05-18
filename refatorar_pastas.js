const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'script');

// Mapeamento: Caminho Original -> Subpastas com Nomes Únicos
const fileMap = {
  // 📦 CORE (Núcleo e Dados)
  "core.js": "core/appCore.js",
  "storage.js": "core/appStorage.js",
  "utils.js": "core/appUtils.js",
  "idb-keyval.js": "core/idbKeyval.js",

  // 🖥️ UI (Interface de Usuário)
  "ui.js": "ui/uiMain.js",
  "ui/events.js": "ui/uiEvents.js",
  "ui/utils.js": "ui/uiUtils.js",
  "ui/dragDrop.js": "ui/dragDrop.js",
  "ui/teams.js": "ui/teams.js",
  "ui/render.js": "ui/render.js",
  "ui/init.js": "ui/init.js",
  "ui/zones.js": "ui/zones.js",
  "ui/views.js": "ui/views.js",
  "ui/state.js": "ui/state.js",
  "modal.js": "ui/uiModal.js",
  "graphics.js": "ui/uiGraphics.js",
  "tableView.js": "ui/uiTableView.js",

  // 🏆 LEAGUE (Ligas e Copas)
  "league.js": "league/leagueMain.js",
  "league/core.js": "league/leagueCore.js",
  "league/events.js": "league/leagueEvents.js",
  "leagueRenderer.js": "league/leagueRenderer.js",
  "leagueConfig.js": "league/leagueConfig.js",

  // ⚽ SIMULATION (Simulação de Jogo)
  "simulation.js": "simulation/simMain.js",
  "simulation/core.js": "simulation/simCore.js",
  "simulation/tactics.js": "simulation/simTactics.js",
  "simulation/audio.js": "simulation/audio.js",

  // ⚔️ MATCH (Mecânicas da Partida/Pós Jogo)
  "matchEngine.js": "match/matchEngine.js",
  "matchPostGame.js": "match/matchPostGame.js",
  "penalties.js": "match/penalties.js",
  "narrator.js": "match/narrator.js",

  // ♟️ TACTICS & PLAYER (Táticas no Campo e Editor)
  "tactics.js": "tactics/pitchTactics.js",
  "playerEditor.js": "player/playerEditor.js"
};

function computeNewImportPath(oldSourceRelToScript, newSourceRelToScript, importString) {
    // Se não começar com '.', provavelmente é um pacote externo/URL, ignora.
    if (!importString.startsWith('.')) return importString;

    const oldSourceDir = path.dirname(path.join(BASE_DIR, oldSourceRelToScript));
    const importedAbsPath = path.resolve(oldSourceDir, importString);
    const oldImportedRelToScript = path.relative(BASE_DIR, importedAbsPath).replace(/\\/g, '/');

    // Se o arquivo importado faz parte dos arquivos que movemos
    if (fileMap[oldImportedRelToScript]) {
        const newImportedRelToScript = fileMap[oldImportedRelToScript];
        const newSourceDir = path.dirname(path.join(BASE_DIR, newSourceRelToScript));
        const newImportedAbsPath = path.join(BASE_DIR, newImportedRelToScript);

        let newRelativeImport = path.relative(newSourceDir, newImportedAbsPath).replace(/\\/g, '/');
        if (!newRelativeImport.startsWith('.')) {
            newRelativeImport = './' + newRelativeImport;
        }
        return newRelativeImport;
    }
    return importString;
}

const importRegex = /(import[\s\S]*?from\s+['"])(.*?)(['"])/g;
const exportRegex = /(export[\s\S]*?from\s+['"])(.*?)(['"])/g;
const dynamicRegex = /(import\(['"])(.*?)(['"]\))/g;

const modifiedFiles = {};

// 1. Lê todos os arquivos originais e reescreve as rotas de import/export
for (const [oldPath, newPath] of Object.entries(fileMap)) {
    const fullOldPath = path.join(BASE_DIR, oldPath);
    if (fs.existsSync(fullOldPath)) {
        let content = fs.readFileSync(fullOldPath, 'utf8');
        const replacer = (match, p1, p2, p3) => p1 + computeNewImportPath(oldPath, newPath, p2) + p3;
        content = content.replace(importRegex, replacer)
                       .replace(exportRegex, replacer)
                       .replace(dynamicRegex, replacer);
        modifiedFiles[newPath] = content;
    } else {
        console.warn(`Aviso: Arquivo antigo não encontrado: ${fullOldPath}`);
    }
}

// 2. Salva os novos arquivos nas novas pastas
for (const [newPath, content] of Object.entries(modifiedFiles)) {
    const fullNewPath = path.join(BASE_DIR, newPath);
    const dir = path.dirname(fullNewPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullNewPath, content, 'utf8');
    console.log(`✅ Atualizado e Movido: ${newPath}`);
}

// 3. Exclui os arquivos nas pastas antigas
for (const oldPath of Object.keys(fileMap)) {
    if (!Object.values(fileMap).includes(oldPath)) {
        const fullOldPath = path.join(BASE_DIR, oldPath);
        if (fs.existsSync(fullOldPath)) fs.unlinkSync(fullOldPath);
    }
}

console.log("\\n🚀 Refatoração perfeita! Não esqueça de atualizar a tag <script> principal no seu HTML.");