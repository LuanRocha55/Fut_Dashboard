import { Storage } from "../storage.js";
import { renderLeagueData } from "../leagueRenderer.js";
import { LEAGUES } from "../leagueConfig.js";
import { showCustomModal } from "../modal.js";

// Add exports for inter-module calls
import { updateMonthUI } from "./events.js";


export function getMatchDate(type, index, totalRounds) {
  if (type === "league") {
    const month = Math.floor((index * 10) / totalRounds);
    let roundsInMonthBefore = 0;
    for (let i = 0; i < index; i++) {
      if (Math.floor((i * 10) / totalRounds) === month) roundsInMonthBefore++;
    }
    const day = 4 + roundsInMonthBefore * 7;
    return month * 30 + day;
  } else if (type === "cup") {
    // 16-avos (I/V), Oitavas (I/V), Quartas (I/V), Semi (I/V), Final (1) = 9 indices
    const month = index + 1; // De Month 1 a 9
    return month * 30 + 10;
  } else if (type === "continental") {
    // Grupos (3 rounds), Oitavas (I/V), Quartas (I/V), Semi (I/V), Final (1) = 10 indices
    const month = index + 1; // De Month 1 a 10
    return month * 30 + 22;
  }
  return 9999;
}

export function formatMatchDate(dateNumber, startMonth = 0, baseYear = 2026) {
  if (dateNumber === 9999) return "";
  const relativeMonth = Math.floor(dateNumber / 30);
  const day = dateNumber % 30 || 1;

  const absoluteMonth = (startMonth + relativeMonth) % 12;
  const yearOffset = Math.floor((startMonth + relativeMonth) / 12);
  const year = baseYear + yearOffset;

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${day.toString().padStart(2, "0")} ${months[absoluteMonth]} ${year}`;
}

export const getAutoLeagueType = async () => {
  const currentTeamFile = await Storage.getCurrentTeamFile();
  if (!currentTeamFile) return "br";

  let availableTeams = [];
  try {
    const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
    if (listRes.ok) availableTeams = await listRes.json();
  } catch (e) { }

  const userTeamInfo = availableTeams.find(t => t.file === currentTeamFile);
  if (!userTeamInfo || !userTeamInfo.league) return "br";

  const ln = userTeamInfo.league.toLowerCase();
  if (ln.includes("premier") || ln.includes("england")) return "en";
  if (ln.includes("liga") || ln.includes("spain")) return "es";
  if (ln.includes("serie a") || ln.includes("italy")) return "it";
  if (ln.includes("bundesliga") || ln.includes("germany")) return "de";
  if (ln.includes("ligue 1") || ln.includes("france")) return "fr";
  return "br";
};

export async function autoInitLeague() {
  const currentTeamFile = await Storage.getCurrentTeamFile();
  if (!currentTeamFile) return;

  let availableTeams = [];
  try {
    const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
    if (listRes.ok) availableTeams = await listRes.json();
  } catch (e) { return; }

  const userTeamInfo = availableTeams.find(t => t.file === currentTeamFile);
  if (!userTeamInfo) return;

  const leagueName = userTeamInfo.league || "Desconhecida";
  const userTeamName = userTeamInfo.name;

  // 1. FILTRAR LIGA (Apenas times da mesma liga)
  let leagueTeams = availableTeams.filter(t => t.league === leagueName && t.file !== currentTeamFile);
  leagueTeams.sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
  if (leagueTeams.length > 19) leagueTeams = leagueTeams.slice(0, 19);

  const leagueTable = leagueTeams.map(t => ({
    id: t.file, name: t.name, ovr: t.ovr || 75, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0
  }));
  leagueTable.push({
    id: currentTeamFile, name: userTeamName, isUser: true, ovr: userTeamInfo.ovr || 80, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0
  });
  leagueTable.sort(() => 0.5 - Math.random());

  const divisions = [{
    level: 1,
    name: leagueName,
    table: leagueTable,
    rounds: generateFixtures(leagueTable)
  }];

  // 2. FILTRAR COPA NACIONAL (32 times)
  let cupPool = availableTeams.filter(t => t.file !== currentTeamFile);
  // Prioriza times da mesma liga, depois o resto do país se possível
  cupPool.sort((a, b) => {
    if (a.league === leagueName && b.league !== leagueName) return -1;
    if (b.league === leagueName && a.league !== leagueName) return 1;
    return (b.ovr || 75) - (a.ovr || 75);
  });

  const cupTeams = [{ id: currentTeamFile, name: userTeamName, ovr: userTeamInfo.ovr || 80 }, ...cupPool.slice(0, 31).map(t => ({ id: t.file, name: t.name, ovr: t.ovr || 70 }))];
  cupTeams.sort(() => 0.5 - Math.random());

  const cupPhase1 = [];
  for (let i = 0; i < 16; i++) {
    cupPhase1.push({
      home: cupTeams[i * 2].id, away: cupTeams[i * 2 + 1].id,
      played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null
    });
  }
  const cupData = {
    currentPhaseIndex: 0,
    phaseNames: ["16 avos (Ida)", "16 avos (Volta)", "Oitavas (Ida)", "Oitavas (Volta)", "Quartas (Ida)", "Quartas (Volta)", "Semifinal (Ida)", "Semifinal (Volta)", "Final"],
    teams: cupTeams,
    phases: [cupPhase1],
    finished: false,
    winner: null
  };

  const euroKeywords = ["premier", "laliga", "serie a", "bundesliga", "ligue 1", "portugal", "nederland", "belgium", "turkey", "scotland", "germany", "spain", "italy", "england", "france", "erdivisie", "pro league"];
  const southAmKeywords = ["brazil", "argentina", "libertadores", "sudamericana", "primera division", "dimayor", "uruguay", "chile", "colombia", "brasil", "conmebol"];

  const isEuro = euroKeywords.some(k => leagueName.toLowerCase().includes(k));
  const isSouthAm = southAmKeywords.some(k => leagueName.toLowerCase().includes(k));

  let startMonth = 0; // Jan
  let baseYear = 2026;
  let seasonName = "2026";
  if (isEuro) {
    startMonth = 7; // Agosto
    baseYear = 2025;
    seasonName = "2025/26";
  }

  let contName = "Champions League";
  let contFilter = euroKeywords;
  if (isSouthAm) {
    contName = "Copa Libertadores";
    contFilter = southAmKeywords;
  } else if (!isEuro) {
    contName = "Copa Continental";
    contFilter = [leagueName.toLowerCase()];
  }

  let contPool = availableTeams.filter(t => contFilter.some(k => (t.league || "").toLowerCase().includes(k)));
  contPool.sort((a, b) => (b.ovr || 75) - (a.ovr || 75));

  // Top 32 times do continente
  let contTeamsInfo = contPool.slice(0, 32).map(t => ({ id: t.file, name: t.name, ovr: t.ovr || 75 }));

  if (!contTeamsInfo.some(t => t.id === currentTeamFile)) {
    contTeamsInfo[contTeamsInfo.length - 1] = { id: currentTeamFile, name: userTeamName, ovr: userTeamInfo.ovr || 80 };
  }
  contTeamsInfo.sort(() => 0.5 - Math.random());

  // GERAÇÃO DOS GRUPOS (8 grupos de 4)
  const groups = [];
  for (let i = 0; i < 8; i++) {
    const groupTeams = contTeamsInfo.slice(i * 4, i * 4 + 4).map(t => ({
      ...t, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0
    }));
    const groupMatches = [
      { home: groupTeams[0].id, away: groupTeams[1].id, played: false, homeScore: null, awayScore: null, round: 1 },
      { home: groupTeams[2].id, away: groupTeams[3].id, played: false, homeScore: null, awayScore: null, round: 1 },
      { home: groupTeams[0].id, away: groupTeams[2].id, played: false, homeScore: null, awayScore: null, round: 2 },
      { home: groupTeams[1].id, away: groupTeams[3].id, played: false, homeScore: null, awayScore: null, round: 2 },
      { home: groupTeams[0].id, away: groupTeams[3].id, played: false, homeScore: null, awayScore: null, round: 3 },
      { home: groupTeams[1].id, away: groupTeams[2].id, played: false, homeScore: null, awayScore: null, round: 3 }
    ];
    groups.push({ name: String.fromCharCode(65 + i), teams: groupTeams, matches: groupMatches });
  }

  const continentalData = {
    name: contName,
    teams: contTeamsInfo,
    groups: groups,
    currentPhaseIndex: 0,
    phaseNames: ["Fase de Grupos", "Fase de Grupos", "Fase de Grupos", "Oitavas (Ida)", "Oitavas (Volta)", "Quartas (Ida)", "Quartas (Volta)", "Semifinal (Ida)", "Semifinal (Volta)", "Final"],
    phases: [],
    finished: false,
    winner: null
  };

  const data = {
    currentRound: 1,
    divisions: divisions,
    cup: cupData,
    continentalCup: continentalData,
    scorers: {}, // Objeto, não array
    assists: {},
    ratings: {},
    history: [],
    startMonth: startMonth,
    baseYear: baseYear,
    seasonName: seasonName,
  };

  await Storage.saveLeagueData(data);
  console.log(`[League] Auto-inicializada: ${leagueName}, ${cupData.phaseNames[0]} e ${contName}.`);
}

export async function createNewLeague(leagueType = "br", existingDivisions = null, gender = "male", qualifiedIds = []) {
  const myTeamName = matchInfo.home || "Meu Time";
  const myTeamId = (await Storage.getCurrentTeamFile()) || "meu_time";
  let divisions = [];

  const euroKeywords = ["premier", "laliga", "serie a", "bundesliga", "ligue 1", "portugal", "nederland", "belgium", "turkey", "scotland", "germany", "spain", "italy", "england", "france", "erdivisie", "pro league"];
  const isEuro = leagueType !== "br" && euroKeywords.some(k => leagueType.toLowerCase().includes(k));

  let startMonth = 0;
  let baseYear = 2026;
  let seasonName = "2026";

  const oldData = await Storage.getLeagueData();
  if (oldData && oldData.baseYear) {
    baseYear = oldData.baseYear + 1;
    if (isEuro || leagueType === "euro") {
      startMonth = 7;
      seasonName = `${baseYear}/${(baseYear + 1).toString().slice(-2)}`;
    } else {
      seasonName = `${baseYear}`;
    }
  } else {
    if (isEuro || leagueType === "euro") {
      startMonth = 7;
      baseYear = 2025;
      seasonName = "2025/26";
    }
  }

  if (existingDivisions) {
    divisions = existingDivisions;
    // Promoção e Rebaixamento
    for (let i = 0; i < divisions.length - 1; i++) {
      let higherDiv = divisions[i];
      let lowerDiv = divisions[i + 1];
      higherDiv.table.sort((a, b) => b.pts - a.pts || b.w - a.w || b.gd - a.gd || b.gf - a.gf);
      lowerDiv.table.sort((a, b) => b.pts - a.pts || b.w - a.w || b.gd - a.gd || b.gf - a.gf);

      let relegated = higherDiv.table.splice(-3, 3);
      let promoted = lowerDiv.table.splice(0, 3);

      higherDiv.table.push(...promoted);
      lowerDiv.table.push(...relegated);
    }
    divisions.forEach(div => {
      div.table.forEach(t => { t.pts = 0; t.p = 0; t.w = 0; t.d = 0; t.l = 0; t.gf = 0; t.ga = 0; t.gd = 0; });
      div.rounds = generateFixtures(div.table);
    });
  } else {
    let availableTeams = [];
    try {
      const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
      if (listRes.ok) availableTeams = await listRes.json();
    } catch (e) { }

    let pool = availableTeams.filter((t) => t.file !== myTeamId);

    // Filtro por gênero
    const femKeywords = ["Vrouwen", "Fem", "NWSL", "WSL", "Liga F", "GPFBL", "Arkema PL", "Nederland Vrouwen Liga"];
    pool = pool.filter(t => {
      const isFemTeam = t.name.includes("(Fem)") || femKeywords.some(k => (t.league || "").includes(k));
      return gender === "female" ? isFemTeam : !isFemTeam;
    });

    let leaguePool = pool.filter((t) => {
      const ln = (t.league || "").toLowerCase();
      if (leagueType === "br" && (ln.includes("brazil") || ln.includes("brasil") || ln.includes("libertadores") || ln.includes("sudamericana") || ln.includes("primera") || ln.includes("colombia") || ln.includes("argentina") || ln.includes("serie b") || ln.includes("br"))) return true;
      if (leagueType === "en" && (ln.includes("premier") || ln.includes("england") || ln.includes("championship") || ln.includes("league one") || ln.includes("league two") || ln.includes("wsl"))) return true;
      if (leagueType === "es" && (ln.includes("liga") || ln.includes("spain") || ln.includes("segunda"))) return true;
      if (leagueType === "it" && (ln.includes("serie a") || ln.includes("italy") || ln.includes("serie b") || ln.includes("calcio"))) return true;
      if (leagueType === "de" && (ln.includes("bundesliga") || ln.includes("germany") || ln.includes("3. liga") || ln.includes("frauen"))) return true;
      return false;
    });

    if (leaguePool.length > 0) pool = leaguePool;
    // Ordena do mais forte pro mais fraco para distribuir nas divisões corretas
    pool.sort((a, b) => (b.ovr || 75) - (a.ovr || 75));

    let level = 1;
    while (pool.length > 0 && level <= 3) {
      let size = (level === 1) ? 19 : 20;
      if (pool.length < 10) break;
      let divTeams = pool.splice(0, size).map(t => ({ id: t.file, name: t.name, ovr: t.ovr || 75 }));
      if (level !== 1 && divTeams.length % 2 !== 0) divTeams.pop();
      divTeams.sort(() => 0.5 - Math.random());

      let table = [];
      if (level === 1) {
        table.push({ id: myTeamId, name: myTeamName, isUser: true, ovr: 80, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 });
      }
      divTeams.forEach(t => table.push({ id: t.id, name: t.name, ovr: t.ovr, isUser: false, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));

      divisions.push({ level: level, name: `${level}ª Divisão`, table: table, rounds: generateFixtures(table) });
      level++;
    }

    if (divisions.length === 0) {
      const abstractTeams = LEAGUES[leagueType] || LEAGUES["br"];
      let shuf = [...abstractTeams].sort(() => 0.5 - Math.random());
      let table = [{ id: myTeamId, name: myTeamName, isUser: true, ovr: 80, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }];
      shuf.forEach(t => table.push({ id: t.id, name: t.name, ovr: t.ovr, isUser: false, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      divisions.push({ level: 1, name: "1ª Divisão", table: table, rounds: generateFixtures(table) });
    }
  }

  // Gera os 32 times da Copa misturando TODAS as divisões (1, 2 e 3)
  let cupPool = [];
  divisions.forEach(d => {
    cupPool = cupPool.concat(d.table.filter(t => !t.isUser).map(t => ({ id: t.id, name: t.name, ovr: t.ovr })));
  });

  cupPool.sort(() => 0.5 - Math.random());
  // Pega o usuário + 31 times
  const cupTeams = [{ id: myTeamId, name: myTeamName, ovr: 80 }, ...cupPool.slice(0, 31)];
  cupTeams.sort(() => 0.5 - Math.random());

  const phase1 = [];
  for (let i = 0; i < 16; i++) {
    phase1.push({
      home: cupTeams[i * 2].id,
      away: cupTeams[i * 2 + 1].id,
      played: false,
      homeScore: null, awayScore: null, homePen: null, awayPen: null,
    });
  }
  const cupData = {
    currentPhaseIndex: 0,
    phaseNames: ["16 avos (Ida)", "16 avos (Volta)", "Oitavas (Ida)", "Oitavas (Volta)", "Quartas (Ida)", "Quartas (Volta)", "Semifinal (Ida)", "Semifinal (Volta)", "Final"],
    teams: cupTeams,
    phases: [phase1],
    finished: false,
    winner: null,
  };

  let continentalName = leagueType === "br" ? "Copa Libertadores" : "Champions League";
  let contTeamsInfo = [];

  // Se temos uma lista de qualificados (Temporada 2+)
  if (qualifiedIds && qualifiedIds.length > 0) {
    const allCurrentTeams = divisions.flatMap(d => d.table);
    qualifiedIds.forEach(id => {
      const found = allCurrentTeams.find(t => t.id === id);
      if (found) contTeamsInfo.push({ id: found.id, name: found.name, ovr: found.ovr });
    });
  } else {
    // Temporada 1: Top 8 da Divisão 1
    contTeamsInfo = divisions[0].table.slice(0, 8).map(t => ({ id: t.id, name: t.name, ovr: t.ovr }));
  }

  let availableTeams = [];
  try {
    const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
    if (listRes.ok) availableTeams = await listRes.json();
  } catch (e) { }

  // Filtramos times estrangeiros para completar os 32
  let foreignTeams = availableTeams.filter(t => !divisions.some(d => d.table.some(dt => dt.id === t.file)));
  foreignTeams.sort((a, b) => (b.ovr || 75) - (a.ovr || 75));

  // Completa até 32 times
  contTeamsInfo.push(...foreignTeams.slice(0, 32 - contTeamsInfo.length).map(t => ({ id: t.file, name: t.name, ovr: t.ovr || 75 })));
  contTeamsInfo.sort(() => 0.5 - Math.random());

  // GERAÇÃO DOS GRUPOS (8 grupos de 4)
  const groups = [];
  for (let i = 0; i < 8; i++) {
    const groupTeams = contTeamsInfo.slice(i * 4, i * 4 + 4).map(t => ({
      ...t, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0
    }));

    // Gera 3 rodadas (cada um joga com cada um uma vez - turno único para manter o calendário leve)
    const groupMatches = [
      { home: groupTeams[0].id, away: groupTeams[1].id, played: false, homeScore: null, awayScore: null, round: 1 },
      { home: groupTeams[2].id, away: groupTeams[3].id, played: false, homeScore: null, awayScore: null, round: 1 },
      { home: groupTeams[0].id, away: groupTeams[2].id, played: false, homeScore: null, awayScore: null, round: 2 },
      { home: groupTeams[1].id, away: groupTeams[3].id, played: false, homeScore: null, awayScore: null, round: 2 },
      { home: groupTeams[0].id, away: groupTeams[3].id, played: false, homeScore: null, awayScore: null, round: 3 },
      { home: groupTeams[1].id, away: groupTeams[2].id, played: false, homeScore: null, awayScore: null, round: 3 }
    ];

    groups.push({
      name: String.fromCharCode(65 + i), // Grupo A, B, C...
      teams: groupTeams,
      matches: groupMatches
    });
  }

  const continentalData = {
    name: continentalName,
    teams: contTeamsInfo, // Referência de todos os times
    groups: groups,
    currentPhaseIndex: 0, // 0 = Grupos, 1 = Oitavas...
    phaseNames: ["Fase de Grupos", "Fase de Grupos", "Fase de Grupos", "Oitavas (Ida)", "Oitavas (Volta)", "Quartas (Ida)", "Quartas (Volta)", "Semifinal (Ida)", "Semifinal (Volta)", "Final"],
    phases: [], // Oitavas em diante serão geradas aqui
    finished: false,
    winner: null
  };

  const leagueData = {
    currentRound: 1,
    divisions: divisions,
    cup: cupData,
    continentalCup: continentalData,
    type: leagueType,
    startMonth: startMonth,
    baseYear: baseYear,
    seasonName: seasonName,
  };

  let initialDivision = divisions.findIndex(d => d.table.some(t => t.isUser));
  if (initialDivision === -1) initialDivision = 0;
  updateLeagueState({ currentViewDivision: initialDivision });

  await Storage.saveLeagueData(leagueData);
  showCustomModal(
    `Liga criada com sucesso! Foram geradas ${divisions.length} divisão(ões) conectadas.`,
    "alert",
    "btn-primary",
  );
}

export function generateFixtures(teams) {
  const numTeams = teams.length;
  if (numTeams % 2 !== 0) {
    console.error("A geração de rodadas requer um número par de equipes.");
    return [];
  }

  let teamList = [...teams];
  const firstHalfRounds = [];

  for (let i = 0; i < numTeams - 1; i++) {
    const roundFixtures = [];
    for (let j = 0; j < numTeams / 2; j++) {
      const home = teamList[j];
      const away = teamList[numTeams - 1 - j];
      // Alterna o mando de campo para o primeiro time para garantir equilíbrio
      if (j === 0 && i % 2 !== 0) {
        roundFixtures.push({
          home: away.id,
          away: home.id,
          played: false,
          homeScore: null,
          awayScore: null,
        });
      } else {
        roundFixtures.push({
          home: home.id,
          away: away.id,
          played: false,
          homeScore: null,
          awayScore: null,
        });
      }
    }
    firstHalfRounds.push(roundFixtures);

    // Gira as equipes, mantendo a primeira fixa
    const lastTeam = teamList.pop();
    teamList.splice(1, 0, lastTeam);
  }

  // Gera o returno invertendo os mandos
  const secondHalfRounds = firstHalfRounds.map((round) => {
    return round.map((match) => ({
      home: match.away,
      away: match.home,
      played: false,
      homeScore: null,
      awayScore: null,
    }));
  });

  return [...firstHalfRounds, ...secondHalfRounds];
}

export async function simulateCurrentRound(silent = false) {
  const data = await Storage.getLeagueData();
  if (!data) return;

  if (!data.divisions && data.table) {
    data.divisions = [{ level: 1, name: "1ª Divisão", table: data.table, rounds: data.rounds }];
  }
  const totalRounds = Math.max(...data.divisions.map(d => d.rounds.length));

  if (data.currentRound > totalRounds) {
    if (!silent)
      showCustomModal("O campeonato já terminou!", "alert", "btn-warning");
    return;
  }

  // Auto-simulate Cup Phase
  if (data.cup && !data.cup.finished) {
    const nextCupDate = getMatchDate("cup", data.cup.currentPhaseIndex, totalRounds);
    const currentLeagueDate = getMatchDate("league", data.currentRound - 1, totalRounds);

    if (nextCupDate <= currentLeagueDate) {
      const phaseIdx = data.cup.currentPhaseIndex;
      const matches = data.cup.phases[phaseIdx];
      const allTeamsFlat = data.divisions.flatMap((d) => d.table);
      const getTeamOvr = (id) => {
        let t = allTeamsFlat.find(x => x.id === id);
        if (t) return t.ovr || 75;
        t = data.cup.teams.find(x => x.id === id);
        return t ? t.ovr || 75 : 75;
      };

      const isFinal = phaseIdx === 8;
      const isVolta = phaseIdx % 2 === 1 && !isFinal;
      const isIda = phaseIdx % 2 === 0 && !isFinal;

      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = getTeamOvr(m.home);
          const aOvr = getTeamOvr(m.away);
          let hScore = Math.floor(Math.random() * 3);
          let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1;
          if (aOvr > hOvr + 5) aScore += 1;

          let hPen = null, aPen = null;
          // Pênaltis apenas na Final ou em Volta empatada no agregado
          if (isFinal) {
            if (hScore === aScore) {
              hPen = Math.floor(Math.random() * 4) + 2;
              aPen = Math.floor(Math.random() * 4) + 2;
              if (hPen === aPen) hPen++;
            }
          } else if (isVolta) {
            const idaMatch = data.cup.phases[phaseIdx - 1].find(im => im.home === m.away && im.away === m.home);
            if (idaMatch) {
              const aggHome = idaMatch.homeScore + aScore;
              const aggAway = idaMatch.awayScore + hScore;
              if (aggHome === aggAway) {
                hPen = Math.floor(Math.random() * 4) + 2;
                aPen = Math.floor(Math.random() * 4) + 2;
                if (hPen === aPen) hPen++;
              }
            }
          }

          m.homeScore = hScore;
          m.awayScore = aScore;
          m.homePen = hPen;
          m.awayPen = aPen;
          m.played = true;
        }
      });

      if (isIda) {
        // Gera a Volta
        const voltaPhase = matches.map(m => ({
          home: m.away, away: m.home, played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null
        }));
        data.cup.phases.push(voltaPhase);
        data.cup.currentPhaseIndex++;
      } else if (isVolta) {
        // Decide vencedores e gera próxima Ida ou Final
        const winners = [];
        matches.forEach(m => {
          const idaMatch = data.cup.phases[phaseIdx - 1].find(im => im.home === m.away && im.away === m.home);
          const aggHome = idaMatch.homeScore + m.awayScore;
          const aggAway = idaMatch.awayScore + m.homeScore;
          if (aggAway > aggHome || (aggAway === aggHome && m.homePen > m.awayPen)) winners.push(m.home);
          else winners.push(m.away);
        });

        if (winners.length > 1) {
          const nextIda = [];
          for (let i = 0; i < winners.length; i += 2) {
            nextIda.push({ home: winners[i], away: winners[i + 1], played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null });
          }
          data.cup.phases.push(nextIda);
          data.cup.currentPhaseIndex++;
        } else {
          data.cup.currentPhaseIndex++; // Vai para a Final (index 8)
        }
      } else if (isFinal) {
        const m = matches[0];
        data.cup.winner = (m.homeScore > m.awayScore || (m.homeScore === m.awayScore && m.homePen > m.awayPen)) ? m.home : m.away;
        data.cup.finished = true;
      }
    }
  }

  if (data.continentalCup && !data.continentalCup.finished) {
    const totalRounds = Math.max(...data.divisions.map(d => d.rounds.length));
    const nextContDate = getMatchDate("continental", data.continentalCup.currentPhaseIndex, totalRounds);
    const currentLeagueDate = getMatchDate("league", data.currentRound - 1, totalRounds);

    if (nextContDate <= currentLeagueDate) {
      const phaseIdx = data.continentalCup.currentPhaseIndex;
      const allTeamsFlat = data.divisions.flatMap(d => d.table);
      const getTeamOvr = (id) => {
        let t = allTeamsFlat.find(x => x.id === id);
        if (t) return t.ovr || 75;
        t = data.continentalCup.teams.find(x => x.id === id);
        return t ? t.ovr || 75 : 75;
      };

      if (phaseIdx < 3) {
        // FASE DE GRUPOS
        const round = phaseIdx + 1;
        data.continentalCup.groups.forEach(group => {
          const roundMatches = group.matches.filter(m => m.round === round);
          roundMatches.forEach(m => {
            if (!m.played) {
              const hOvr = getTeamOvr(m.home);
              const aOvr = getTeamOvr(m.away);
              let hScore = Math.floor(Math.random() * 3), aScore = Math.floor(Math.random() * 3);
              if (hOvr > aOvr + 5) hScore += 1; if (aOvr > hOvr + 5) aScore += 1;
              m.homeScore = hScore; m.awayScore = aScore; m.played = true;
              const hTeam = group.teams.find(t => t.id === m.home), aTeam = group.teams.find(t => t.id === m.away);
              hTeam.p++; aTeam.p++; hTeam.gf += hScore; hTeam.ga += aScore; hTeam.gd = hTeam.gf - hTeam.ga;
              aTeam.gf += aScore; aTeam.ga += hScore; aTeam.gd = aTeam.gf - aTeam.ga;
              if (hScore > aScore) { hTeam.w++; hTeam.pts += 3; aTeam.l++; }
              else if (aScore > hScore) { aTeam.w++; aTeam.pts += 3; hTeam.l++; }
              else { hTeam.d++; aTeam.d++; hTeam.pts += 1; aTeam.pts += 1; }
            }
          });
        });
        data.continentalCup.currentPhaseIndex++;
        if (data.continentalCup.currentPhaseIndex === 3) {
          const qualified = [];
          data.continentalCup.groups.forEach(group => {
            group.teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
            qualified.push(group.teams[0].id, group.teams[1].id);
          });
          qualified.sort(() => 0.5 - Math.random());
          const oitavasIda = [];
          for (let i = 0; i < 8; i++) oitavasIda.push({ home: qualified[i * 2], away: qualified[i * 2 + 1], played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null });
          data.continentalCup.phases = [oitavasIda];
        }
      } else {
        // MATA-MATA (Oitavas I/V, Quartas I/V, Semi I/V, Final)
        const knockoutIdx = phaseIdx - 3; // 0=Oitavas Ida, 1=Oitavas Volta...
        const matches = data.continentalCup.phases[knockoutIdx];
        const isFinal = phaseIdx === 9;
        const isVolta = !isFinal && knockoutIdx % 2 === 1;
        const isIda = !isFinal && knockoutIdx % 2 === 0;

        matches.forEach(m => {
          if (!m.played) {
            const hOvr = getTeamOvr(m.home), aOvr = getTeamOvr(m.away);
            let hScore = Math.floor(Math.random() * 3), aScore = Math.floor(Math.random() * 3);
            if (hOvr > aOvr + 5) hScore += 1; if (aOvr > hOvr + 5) aScore += 1;
            let hPen = null, aPen = null;
            if (isFinal) {
              if (hScore === aScore) { hPen = Math.floor(Math.random() * 4) + 2; aPen = Math.floor(Math.random() * 4) + 2; if (hPen === aPen) hPen++; }
            } else if (isVolta) {
              const idaMatch = data.continentalCup.phases[knockoutIdx - 1].find(im => im.home === m.away && im.away === m.home);
              if (idaMatch && (idaMatch.homeScore + aScore === idaMatch.awayScore + hScore)) {
                hPen = Math.floor(Math.random() * 4) + 2; aPen = Math.floor(Math.random() * 4) + 2; if (hPen === aPen) hPen++;
              }
            }
            m.homeScore = hScore; m.awayScore = aScore; m.homePen = hPen; m.awayPen = aPen; m.played = true;
          }
        });

        if (isIda) {
          const volta = matches.map(m => ({ home: m.away, away: m.home, played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null }));
          data.continentalCup.phases.push(volta);
          data.continentalCup.currentPhaseIndex++;
        } else if (isVolta) {
          const winners = [];
          matches.forEach(m => {
            const idaMatch = data.continentalCup.phases[knockoutIdx - 1].find(im => im.home === m.away && im.away === m.home);
            if ((idaMatch.awayScore + m.homeScore) > (idaMatch.homeScore + m.awayScore) || ((idaMatch.awayScore + m.homeScore) === (idaMatch.homeScore + m.awayScore) && m.homePen > m.awayPen)) winners.push(m.home);
            else winners.push(m.away);
          });
          if (winners.length > 1) {
            const nextIda = [];
            for (let i = 0; i < winners.length; i += 2) nextIda.push({ home: winners[i], away: winners[i + 1], played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null });
            data.continentalCup.phases.push(nextIda);
            data.continentalCup.currentPhaseIndex++;
          } else {
            // Final será o index 9
            data.continentalCup.currentPhaseIndex++;
            // Note: A final precisa de um par de times. Vamos gerar a final aqui se houver 2 winners.
            // Mas o loop acima já deve lidar com isso se winners.length === 2.
            // Se winners.length é 1, algo deu errado (ou é a semi).
          }
        } else if (isFinal) {
          const m = matches[0];
          data.continentalCup.winner = (m.homeScore > m.awayScore || (m.homeScore === m.awayScore && m.homePen > m.awayPen)) ? m.home : m.away;
          data.continentalCup.finished = true;
        }
      }
    }
  }

  let userMatch = null;
  data.divisions.forEach(div => {
    if (data.currentRound <= div.rounds.length) {
      const match = div.rounds[data.currentRound - 1].find(m => div.table.find(t => t.id === m.home)?.isUser || div.table.find(t => t.id === m.away)?.isUser);
      if (match) userMatch = match;
    }
  });

  if (userMatch && !userMatch.played) {
    if (!silent) {
      const proceed = await showCustomModal(
        "O seu jogo desta rodada ainda não foi jogado. Se você avançar, seu jogo também será simulado automaticamente por inteligência artificial. Deseja avançar mesmo assim?",
        "confirm",
        "btn-warning",
      );
      if (!proceed) return;
    }
  }

  if (!data.scorers) data.scorers = {};
  if (!data.assists) data.assists = {};
  if (!data.ratings) data.ratings = {};

  data.divisions.forEach(div => {
    if (data.currentRound <= div.rounds.length) {
      const currentMatches = div.rounds[data.currentRound - 1];
      currentMatches.forEach((match) => {
        if (!match.played) {
          const homeTeam = div.table.find((t) => t.id === match.home);
          const awayTeam = div.table.find((t) => t.id === match.away);

          if (homeTeam && awayTeam) {
            const homeOvr = homeTeam.ovr || (homeTeam.isUser ? 85 : 80);
            const awayOvr = awayTeam.ovr || (awayTeam.isUser ? 85 : 80);

            const homeChance = homeOvr + 5 + Math.random() * 20;
            const awayChance = awayOvr + Math.random() * 20;

            let homeGoals = 0,
              awayGoals = 0;

            if (homeChance > awayChance + 15) {
              homeGoals = Math.floor(Math.random() * 3) + 2;
              awayGoals = Math.floor(Math.random() * 2);
            } else if (homeChance > awayChance) {
              homeGoals = Math.floor(Math.random() * 2) + 1;
              awayGoals = Math.floor(Math.random() * 2);
            } else if (awayChance > homeChance + 15) {
              homeGoals = Math.floor(Math.random() * 2);
              awayGoals = Math.floor(Math.random() * 3) + 2;
            } else {
              homeGoals = Math.floor(Math.random() * 2);
              awayGoals = Math.floor(Math.random() * 2);
            }

            match.homeScore = homeGoals;
            match.awayScore = awayGoals;
            match.played = true;

            const updateScorers = (goals, team) => {
              for (let i = 0; i < goals; i++) {
                const scorerName = getSimulatedScorer(team.name);
                const key = `${scorerName} (${team.name})`;
                if (!data.scorers[key]) {
                  data.scorers[key] = {
                    name: scorerName,
                    team: team.name,
                    goals: 0,
                  };
                }
                data.scorers[key].goals++;

                // Chance de 70% de gerar uma assistência no gol simulado da IA
                if (Math.random() < 0.7) {
                  const assisterName = getSimulatedScorer(team.name + i); // Semente diferente
                  if (assisterName !== scorerName) {
                    const aKey = `${assisterName} (${team.name})`;
                    if (!data.assists[aKey]) {
                      data.assists[aKey] = {
                        name: assisterName,
                        team: team.name,
                        assists: 0,
                      };
                    }
                    data.assists[aKey].assists++;
                  }
                }
              }
            };

            if (homeGoals > 0) updateScorers(homeGoals, homeTeam);
            if (awayGoals > 0) updateScorers(awayGoals, awayTeam);

            const updateSimulatedRatings = (team, gf, ga) => {
              for (let i = 0; i < 3; i++) {
                const pName = getSimulatedScorer(team.name + i + gf);
                const key = `${pName} (${team.name})`;
                if (!data.ratings[key])
                  data.ratings[key] = {
                    name: pName,
                    team: team.name,
                    sumRatings: 0,
                    matches: 0,
                  };
                let r = 6.0 + Math.random() * 2.5;
                if (gf > ga) r += 0.8;
                else if (gf < ga) r -= 0.5;
                data.ratings[key].sumRatings += Math.min(10.0, r);
                data.ratings[key].matches++;
              }
            };
            updateSimulatedRatings(homeTeam, homeGoals, awayGoals);
            updateSimulatedRatings(awayTeam, awayGoals, homeGoals);

            homeTeam.p++;
            homeTeam.gf += homeGoals;
            homeTeam.ga += awayGoals;
            homeTeam.gd = homeTeam.gf - homeTeam.ga;
            awayTeam.p++;
            awayTeam.gf += awayGoals;
            awayTeam.ga += homeGoals;
            awayTeam.gd = awayTeam.gf - awayTeam.ga;

            if (homeGoals > awayGoals) {
              homeTeam.w++;
              homeTeam.pts += 3;
              awayTeam.l++;
            } else if (awayGoals > homeGoals) {
              awayTeam.w++;
              awayTeam.pts += 3;
              homeTeam.l++;
            } else {
              homeTeam.d++;
              awayTeam.d++;
              homeTeam.pts += 1;
              awayTeam.pts += 1;
            }
          }
        }
      });
    }
  });

  data.currentRound++;
  await Storage.saveLeagueData(data);

  if (!silent) {
    if (data.currentRound > totalRounds) {
      showCustomModal(
        "O campeonato acabou! Verifique a tabela de classificação final.",
        "alert",
        "btn-primary",
      );
    } else {
      showCustomModal(
        "Rodada finalizada com sucesso! A tabela foi atualizada.",
        "alert",
        "btn-primary",
      );
    }
  }
}

export function getSimulatedScorer(teamName) {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const surnames = [
    "Silva",
    "Santos",
    "Costa",
    "Oliveira",
    "Pereira",
    "Rodrigues",
    "Almeida",
    "Nunes",
    "Lima",
    "Gomes",
    "García",
    "Smith",
    "Müller",
    "Rossi",
  ];
  const index1 = Math.abs(hash) % surnames.length;
  const index2 = Math.abs(hash * 2) % surnames.length;

  if (Math.random() < 0.6) {
    return "J. " + surnames[index1];
  } else {
    return "M. " + surnames[index2];
  }
}

