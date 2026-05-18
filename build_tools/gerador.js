const fs = require("fs");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("❌ ERRO: Informe o nome do time que deseja extrair.");
  console.log('Exemplo de uso: node gerador.js "Real Madrid"');
  console.log(
    "Ou digite TODOS para gerar os arquivos de todos os times: node gerador.js TODOS",
  );
  process.exit(1);
}

const normalizeString = (str) => {
  return str
    ? str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
    : "";
};

const teamNameInput = normalizeString(args[0]);
const isAll = teamNameInput === "todos";
const path = require("path");
const csvFilePath = path.join(__dirname, "../all_players.csv");

if (!fs.existsSync(csvFilePath)) {
  console.log("❌ ARQUIVO NÃO ENCONTRADO: " + csvFilePath);
  console.log("➡️  Passo a Passo:");
  console.log("1. Baixe o 'all_players.csv' do EA FC 25 no Kaggle.");
  console.log("2. Coloque o arquivo na mesma pasta deste script.");
  process.exit(1);
}

console.log(`⏳ Escaneando banco de dados para: "${args[0]}"...`);

const data = fs.readFileSync(csvFilePath, "utf8");
const lines = data.split("\n");
if (lines.length < 2) {
  console.log("❌ ERRO: O arquivo CSV parece estar vazio ou mal formatado.");
  process.exit(1);
}

// Descobre o separador automaticamente (, ou ; ou \t)
const firstLine = lines[0];
const separator = firstLine.includes(";")
  ? ";"
  : firstLine.includes("\t")
    ? "\t"
    : ",";

// Lógica rápida e segura para ler CSV ignorando separadores dentro de aspas
function parseCSVLine(text, sep = ",") {
  let ret = [];
  let inQuote = false;
  let value = "";
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i < text.length - 1 && text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        value += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === sep) {
        ret.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }
  }
  ret.push(value.trim());
  return ret;
}

const headers = parseCSVLine(firstLine, separator);
const col = {};
headers.forEach((h, i) => (col[h.toLowerCase().trim()] = i));

const getCol = (...names) => {
  for (let n of names) {
    if (col[n] !== undefined) return col[n];
  }
  return -1;
};

// Mapeamento flexível de colunas (Funciona em vários datasets do Kaggle)
const idxClub = getCol("club_name", "club", "team_name", "team");
const idxName = getCol("short_name", "name", "player_name", "known_as");
const idxPos = getCol(
  "player_positions",
  "positions",
  "position",
  "best_position",
);
const idxNum = getCol("club_jersey_number", "jersey_number", "kit_number", "number");
const idxAge = getCol("age");
const idxFoot = getCol("preferred_foot", "foot");
const idxNat = getCol("nationality_name", "nationality", "nation");

const idxPac = getCol("pace", "pac");
const idxSho = getCol("shooting", "sho");
const idxPas = getCol("passing", "pas");
const idxDri = getCol("dribbling", "dri");
const idxDef = getCol("defending", "def");
const idxPhy = getCol("physic", "phy");
const idxSta = getCol("power_stamina", "stamina", "stm");

// Info da Liga
const idxLeague = getCol("league_name", "league");

// Novos atributos detalhados e informações extras
const idxOvr = getCol("ovr", "overall");
const idxAcc = getCol("acceleration");
const idxSpr = getCol("sprint speed", "sprint_speed");
const idxPosit = getCol("positioning");
const idxFinish = getCol("finishing");
const idxShotP = getCol("shot power", "shot_power");
const idxLongS = getCol("long shots", "long_shots");
const idxVolleys = getCol("volleys");
const idxPenalties = getCol("penalties");
const idxVision = getCol("vision");
const idxCrossing = getCol("crossing");
const idxFKAcc = getCol("free kick accuracy", "free_kick_accuracy");
const idxShortP = getCol("short passing", "short_passing");
const idxLongP = getCol("long passing", "long_passing");
const idxCurve = getCol("curve");
const idxAgi = getCol("agility");
const idxBal = getCol("balance");
const idxRea = getCol("reactions");
const idxBallC = getCol("ball control", "ball_control");
const idxComp = getCol("composure");
const idxInt = getCol("interceptions");
const idxHead = getCol("heading accuracy", "heading_accuracy");
const idxDefAw = getCol("def awareness", "def_awareness");
const idxStandT = getCol("standing tackle", "standing_tackle");
const idxSlideT = getCol("sliding tackle", "sliding_tackle");
const idxJump = getCol("jumping");
const idxStr = getCol("strength");
const idxAgg = getCol("aggression");
const idxPlayStyle = getCol("play style", "play_style", "playstyles");

// GK - Ajustado para o padrão FIFA (com espaços)
const idxDiv = getCol("goalkeeping_diving", "gk diving", "gk_div");
const idxHan = getCol("goalkeeping_handling", "gk handling", "gk_han");
const idxKic = getCol("goalkeeping_kicking", "gk kicking", "gk_kic");
const idxRef = getCol("goalkeeping_reflexes", "gk reflexes", "gk_ref");
const idxSpd = getCol("goalkeeping_speed", "gk speed", "gk_spd");
const idxPosGk = getCol("goalkeeping_positioning", "gk positioning", "gk_pos");

const FEM_LEAGUES = [
  "Liga F",
  "Barclays WSL",
  "NWSL",
  "Arkema PL",
  "GPFBL",
  "Calcio A Femminile",
  "Nederland Vrouwen Liga",
  "Sverige Liga",
  "Liga Portugal Feminino",
  "Ceska Liga Zen",
  "Scottish Women's League",
  "Schweizer Damen Liga"
];

if (idxClub === -1 || idxName === -1) {
  console.log(
    "❌ ERRO: Não foi possível identificar as colunas de Clube ou Nome no arquivo.",
  );
  console.log("Colunas encontradas:", Object.keys(col).slice(0, 15).join(", "));
  process.exit(1);
}

const equipes = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const row = parseCSVLine(lines[i], separator);

  let club = row[idxClub];
  if (!club) continue;

  // Diferencia Masculino e Feminino baseado na Liga
  const league = idxLeague !== -1 ? row[idxLeague] : "";
  if (FEM_LEAGUES.some(fem => league.includes(fem))) {
    club += " (Fem)";
  }

  if (isAll || normalizeString(club).includes(teamNameInput)) {
    if (!equipes[club]) equipes[club] = [];
    equipes[club].push(row);
  }
}

if (Object.keys(equipes).length === 0) {
  console.log(`❌ Nenhum jogador encontrado para o time "${args[0]}".`);

  // Mostra alguns times disponíveis no arquivo para ajudar
  const sampleTeams = new Set();
  for (let i = 1; i < Math.min(1000, lines.length); i++) {
    const row = parseCSVLine(lines[i], separator);
    if (row[idxClub]) sampleTeams.add(row[idxClub]);
  }
  console.log("💡 Algumas equipes presentes no arquivo (Exemplos):");
  console.log(Array.from(sampleTeams).slice(0, 15).join(", "));
  process.exit(1);
}

const timesEncontrados = Object.keys(equipes);
console.log(
  `✅ Foram encontrados ${timesEncontrados.length} times! Convertendo e gerando arquivos...`,
);

// Mapeamento de Posições: Inglês/FIFA -> Português/FutDashboard
const posMap = {
  GK: ["GOL"],
  SW: ["ZE", "ZD"],
  CB: ["ZE", "ZD"],
  RCB: ["ZE", "ZD"],
  LCB: ["ZE", "ZD"],
  RB: ["LD"],
  LB: ["LE"],
  RWB: ["LD", "MD"],
  LWB: ["LE", "ME"],
  CDM: ["VOL"],
  RDM: ["VOL"],
  LDM: ["VOL"],
  CM: ["MC"],
  RCM: ["MC"],
  LCM: ["MC"],
  CAM: ["MEI"],
  RAM: ["MEI"],
  LAM: ["MEI"],
  RM: ["MD"],
  LM: ["ME"],
  RW: ["PD"],
  LW: ["PE"],
  CF: ["SA", "CA"],
  RF: ["SA"],
  LF: ["SA"],
  ST: ["CA"]
};

const parseNum = (val, def = 50) => {
  const n = parseInt(val, 10);
  return isNaN(n) ? def : n;
};

let timesGerados = 0;
const listaDeTimes = [];

for (const realTeamName of timesEncontrados) {
  const elencoBruto = equipes[realTeamName];
  const assignedNumbers = new Set();
  const squad = elencoBruto.map((p, index) => {
    const rawPositions = idxPos !== -1 ? p[idxPos] : "ST";
    let aptitudes = [];
    rawPositions
      .replace(/\"/g, "")
      .split(",")
      .forEach((pos) => {
        const mapped = posMap[pos.trim().toUpperCase()];
        if (mapped) {
          mapped.forEach(m => { if (!aptitudes.includes(m)) aptitudes.push(m); });
        }
      });

    if (aptitudes.length === 0) aptitudes = ["CA"];
    const isGK = aptitudes.includes("GOL");

    // Lógica para número da camisa
    let number = idxNum !== -1 ? parseNum(p[idxNum], 0) : 0;
    if (number === 0) {
      const mainPos = aptitudes[0];
      const defaults = {
        GOL: [1, 12, 22], LD: [2, 13, 24], LE: [3, 16, 26], ZE: [4, 14, 25], ZD: [5, 15, 33],
        VOL: [5, 21, 23], MC: [8, 18, 20], MEI: [10, 23, 30], ME: [11, 19, 27], MD: [11, 19, 28],
        PE: [7, 17, 29], PD: [17, 31, 32], CA: [9, 10, 19, 20]
      };
      const possible = defaults[mainPos] || [index + 1];
      number = possible.find(n => !assignedNumbers.has(n)) || (index + 1);
      while (assignedNumbers.has(number)) number++;
    }
    assignedNumbers.add(number);

    const playstylesRaw = idxPlayStyle !== -1 ? p[idxPlayStyle] : "";
    const playstyles = playstylesRaw
      ? playstylesRaw
        .replace(/\"/g, "")
        .split(",")
        .map((s) => s.trim())
      : isGK
        ? ["Goleiro Defensivo"]
        : ["Meia Versátil"];

    return {
      id: index + 1,
      number: number,
      name: p[idxName].replace(/\"/g, ""),
      ovr: idxOvr !== -1 ? parseNum(p[idxOvr], 75) : 75,
      status: index < 11 ? "titular" : "reserva",
      aptitude: aptitudes,
      age: idxAge !== -1 ? parseNum(p[idxAge], 25) : 25,
      foot:
        idxFoot !== -1
          ? p[idxFoot] && p[idxFoot].toLowerCase().includes("right")
            ? "Destro"
            : "Canhoto"
          : "Destro",
      captain: index === 0, // Assume o melhor OVR como capitão inicial
      nationality: idxNat !== -1 ? p[idxNat] : "INT",
      playstyles: playstyles,
      stats: isGK
        ? {
          alc: idxDiv !== -1 ? parseNum(p[idxDiv], 75) : 75,
          seg: idxHan !== -1 ? parseNum(p[idxHan], 75) : 75,
          esp: idxRef !== -1 ? Math.round((parseNum(p[idxRef]) + parseNum(p[idxDiv])) / 1.8) : 75,
          ref: idxRef !== -1 ? parseNum(p[idxRef], 75) : 75,
          pos: idxPosGk !== -1 ? parseNum(p[idxPosGk], 75) : 75,
          vel: idxSpd !== -1 ? parseNum(p[idxSpd]) : (idxSpr !== -1 ? parseNum(p[idxSpr], 40) : 40),
          sta: idxSta !== -1 ? parseNum(p[idxSta], 50) : 50,
        }
        : {
          vel: idxPac !== -1 ? parseNum(p[idxPac], 50) : 50,
          fin: idxSho !== -1 ? parseNum(p[idxSho], 50) : 50,
          pas: idxPas !== -1 ? parseNum(p[idxPas], 50) : 50,
          dri: idxDri !== -1 ? parseNum(p[idxDri], 50) : 50,
          def: idxDef !== -1 ? parseNum(p[idxDef], 50) : 50,
          fis: idxPhy !== -1 ? parseNum(p[idxPhy], 50) : 50,
          sta: idxSta !== -1 ? parseNum(p[idxSta], 75) : 75,
        },
      detailedStats: {
        acceleration: idxAcc !== -1 ? parseNum(p[idxAcc]) : 50,
        sprintSpeed: idxSpr !== -1 ? parseNum(p[idxSpr]) : 50,
        positioning: idxPosit !== -1 ? parseNum(p[idxPosit]) : 50,
        finishing: idxFinish !== -1 ? parseNum(p[idxFinish]) : 50,
        shotPower: idxShotP !== -1 ? parseNum(p[idxShotP]) : 50,
        longShots: idxLongS !== -1 ? parseNum(p[idxLongS]) : 50,
        volleys: idxVolleys !== -1 ? parseNum(p[idxVolleys]) : 50,
        penalties: idxPenalties !== -1 ? parseNum(p[idxPenalties]) : 50,
        vision: idxVision !== -1 ? parseNum(p[idxVision]) : 50,
        crossing: idxCrossing !== -1 ? parseNum(p[idxCrossing]) : 50,
        freeKickAccuracy: idxFKAcc !== -1 ? parseNum(p[idxFKAcc]) : 50,
        shortPassing: idxShortP !== -1 ? parseNum(p[idxShortP]) : 50,
        longPassing: idxLongP !== -1 ? parseNum(p[idxLongP]) : 50,
        curve: idxCurve !== -1 ? parseNum(p[idxCurve]) : 50,
        agility: idxAgi !== -1 ? parseNum(p[idxAgi]) : 50,
        balance: idxBal !== -1 ? parseNum(p[idxBal]) : 50,
        reactions: idxRea !== -1 ? parseNum(p[idxRea]) : 50,
        ballControl: idxBallC !== -1 ? parseNum(p[idxBallC]) : 50,
        composure: idxComp !== -1 ? parseNum(p[idxComp]) : 50,
        interceptions: idxInt !== -1 ? parseNum(p[idxInt]) : 50,
        headingAccuracy: idxHead !== -1 ? parseNum(p[idxHead]) : 50,
        defAwareness: idxDefAw !== -1 ? parseNum(p[idxDefAw]) : 50,
        standingTackle: idxStandT !== -1 ? parseNum(p[idxStandT]) : 50,
        slidingTackle: idxSlideT !== -1 ? parseNum(p[idxSlideT]) : 50,
        jumping: idxJump !== -1 ? parseNum(p[idxJump]) : 50,
        strength: idxStr !== -1 ? parseNum(p[idxStr]) : 50,
        aggression: idxAgg !== -1 ? parseNum(p[idxAgg]) : 50,
      },
    };
  });

  const leagueName = idxLeague !== -1 ? elencoBruto[0][idxLeague] : "Amistoso";
  const teamOvr = Math.round(squad.slice(0, 11).reduce((acc, p) => acc + (p.ovr || 75), 0) / Math.min(11, squad.length)) || 75;

  const finalJson = {
    matchInfo: {
      home: realTeamName,
      away: "Adversário",
      tournament: leagueName,
      group: "",
    },
    squad: squad,
  };

  const fileName =
    realTeamName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".json";

  const dir = path.join(__dirname, "../data/teams");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/${fileName}`, JSON.stringify(finalJson, null, 2));

  listaDeTimes.push({ name: realTeamName, file: fileName, league: leagueName, ovr: teamOvr });
  timesGerados++;
}

listaDeTimes.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(__dirname, "../data/teamsList.json"), JSON.stringify(listaDeTimes, null, 2));

console.log(`🎉 Sucesso! ${timesGerados} times foram salvos na pasta data/teams/`);
console.log(`📋 Arquivo 'teamsList.json' atualizado com sucesso!`);
