/**
 * squadSync.js
 * Serviço para sincronizar o elenco local com os dados reais da API-Football.
 */

import { API_KEYS_CONFIG } from "./apiKeys.js";
import { expandAptitudes } from "./appCore.js";

const API_KEY = localStorage.getItem("FUT_API_KEY") || API_KEYS_CONFIG.API_FOOTBALL || "";
const BASE_URL = "https://v3.football.api-sports.io";

/**
 * Sincroniza o elenco de um time
 * @param {string} teamName Nome do time para busca
 * @param {number} baseTeamOvr OVR base do time para referência de atributos
 * @returns {Promise<Array|null>} Nova lista de jogadores
 */
export async function syncSquadWithAPI(teamName, baseTeamOvr = 75) {
  if (!API_KEY) {
    throw new Error("Chave de API não configurada em apiKeys.js");
  }

  try {
    // 1. Buscar o ID do time
    const teamRes = await fetch(`${BASE_URL}/teams?search=${encodeURIComponent(teamName)}`, {
      headers: { 'x-apisports-key': API_KEY }
    });
    const teamData = await teamRes.json();
    const teamId = teamData?.response?.[0]?.team?.id;

    if (!teamId) {
      throw new Error(`Time "${teamName}" não encontrado na API.`);
    }

    // 2. Buscar o elenco completo (nomes e números)
    dbgToast("👥 Baixando lista de jogadores...", "#00ff88");
    const squadRes = await fetch(`${BASE_URL}/players/squads?team=${teamId}`, {
      headers: { 'x-apisports-key': API_KEY }
    });
    const squadData = await squadRes.json();
    const players = squadData?.response?.[0]?.players || [];

    if (players.length === 0) {
      throw new Error("Nenhum jogador encontrado para este time na API.");
    }

    // 3. Buscar estatísticas de performance (notas médias) - Suporta paginação para pegar todo o elenco
    const currentYear = new Date().getFullYear();
    let season = currentYear - 1; // 2025

    dbgToast(`📊 Analisando performance (${season})...`, "#00aaff");

    let playerStats = [];

    // Busca as duas primeiras páginas (total 40 jogadores) para garantir o elenco todo
    for (let page = 1; page <= 2; page++) {
      const statsRes = await fetch(`${BASE_URL}/players?team=${teamId}&season=${season}&page=${page}`, {
        headers: { 'x-apisports-key': API_KEY }
      });
      const statsData = await statsRes.json();
      if (statsData?.response) {
        playerStats = playerStats.concat(statsData.response);
      }
      // Se a primeira página já veio vazia, nem tenta a segunda
      if (page === 1 && (!statsData?.response || statsData.response.length === 0)) {
        season = currentYear - 2; // Tenta 2024
        dbgToast(`🔄 Sem dados em ${currentYear - 1}. Tentando ${season}...`, "#ffaa00");
        page = 0; // Reinicia o loop para a nova temporada
        playerStats = [];
        continue;
      }
      // Se a página atual veio com menos de 20, já pegamos todo mundo
      if (statsData?.response?.length < 20) break;
    }

    const ratingMap = {};
    playerStats.forEach(item => {
      const pId = item.player.id;
      // Pega a nota da primeira estatística disponível (geralmente a liga principal)
      const rating = item.statistics?.[0]?.games?.rating;
      if (rating && rating !== "null") {
        ratingMap[pId] = parseFloat(rating);
      }
    });

    // 4. Buscar enriquecimento no Banco de Dados (SQLite) ou CSV (Fallback)
    let csvPlayers = [];
    let db = null;
    const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;

    if (isElectron) {
      try {
        const Database = require('better-sqlite3');
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'database', 'players.db');
        db = new Database(dbPath);
        dbgToast("📂 Conectado ao Banco de Dados SQLite", "#00ff88");
      } catch (dbErr) {
        console.warn("Erro ao conectar ao SQLite, tentando fallback CSV...", dbErr);
      }
    }

    if (!db) {
      dbgToast("📄 Lendo base de dados local (CSV)...", "#aa00ff");
      try {
        const csvRes = await fetch("../../all_players.csv");
        const csvText = await csvRes.text();
        csvPlayers = parseCSV(csvText);
      } catch (csvErr) {
        console.warn("Não foi possível carregar o CSV.", csvErr);
      }
    }

    // 5. Converter para o formato do Dashboard com enriquecimento
    const safeBaseOvr = Math.max(78, baseTeamOvr); 
    const unknownBaseOvr = 55;

    const result = players.map((p, index) => {
      const apiPos = mapPosition(p.position);
      const number = p.number || 0;
      
      // Tentar achar o jogador (No Banco ou no CSV)
      let csvP = null;
      if (db) {
        // Busca inteligente no SQLite
        const query = db.prepare("SELECT * FROM players WHERE name = ? OR name LIKE ? LIMIT 1");
        csvP = query.get(p.name, `%${p.name}%`);
        
        // Se achou no banco, precisamos normalizar as chaves para bater com o resto do código
        if (csvP) {
           csvP.Name = csvP.name;
           csvP.OVR = csvP.ovr;
           csvP.Position = csvP.position;
           csvP["Alternative positions"] = csvP.alt_positions;
           csvP.Nation = csvP.nation;
           csvP.Age = csvP.age;
           csvP["Preferred foot"] = csvP.foot;
           csvP["play style"] = csvP.playstyles;
           csvP.PAC = csvP.pac; csvP.SHO = csvP.sho; csvP.PAS = csvP.pas;
           csvP.DRI = csvP.dri; csvP.DEF = csvP.def; csvP.PHY = csvP.phy;
           csvP.Stamina = csvP.stamina;
           // Detalhadas
           csvP.Acceleration = csvP.acceleration; csvP["Sprint Speed"] = csvP.sprint_speed;
           csvP.Positioning = csvP.positioning; csvP.Finishing = csvP.finishing;
           csvP["Shot Power"] = csvP.shot_power; csvP["Long Shots"] = csvP.long_shots;
           csvP.Volleys = csvP.volleys; csvP.Penalties = csvP.penalties;
           csvP.Vision = csvP.vision; csvP.Crossing = csvP.crossing;
           csvP["Free Kick Accuracy"] = csvP.fk_acc; csvP["Short Passing"] = csvP.short_passing;
           csvP["Long Passing"] = csvP.long_passing; csvP.Curve = csvP.curve;
           csvP.Agility = csvP.agility; csvP.Balance = csvP.balance;
           csvP.Reactions = csvP.reactions; csvP["Ball Control"] = csvP.ball_control;
           csvP.Composure = csvP.composure; csvP.Interceptions = csvP.interceptions;
           csvP["Heading Accuracy"] = csvP.heading_acc; csvP["Def Awareness"] = csvP.def_aware;
           csvP["Standing Tackle"] = csvP.stand_tackle; csvP["Sliding Tackle"] = csvP.slide_tackle;
           csvP.Jumping = csvP.jumping; csvP.Strength = csvP.strength;
           csvP.Aggression = csvP.aggression;
        }
      } else {
        csvP = findInCSV(csvPlayers, p.name);
      }
      
      let baseOvr;
      const realRating = ratingMap[p.id];

      if (realRating && realRating > 0) {
        baseOvr = Math.round(realRating * 10 + 15);
      } else if (csvP) {
        baseOvr = parseInt(csvP.OVR) || safeBaseOvr;
      } else {
        baseOvr = unknownBaseOvr + Math.floor(Math.random() * 8); 
      }

      baseOvr = Math.max(45, Math.min(99, baseOvr));
      
      let aptitudes;
      if (csvP) {
        const mainPos = mapFIFAtoDash(csvP.Position);
        const altPosStr = csvP["Alternative positions"] || "";
        const altPos = altPosStr.split(",").filter(s => s.trim()).map(pos => mapFIFAtoDash(pos.trim()));
        aptitudes = expandAptitudes([mainPos, ...altPos]);
      } else {
        let initialAptitudes = [apiPos];
        if (apiPos === "ZE" && [2,3,4,6,12,13,14,16,17,21,22,25,27,29].includes(number)) initialAptitudes.push("LE", "LD");
        else if (apiPos === "CA" && [7,11,17,18,19,20,21,22,23,25,27,30].includes(number)) initialAptitudes.push("PE", "PD", "SA");
        else if (apiPos === "MC" && [8,10,20,21,23,24,26,28,30].includes(number)) initialAptitudes.push("MEI", "ME", "MD");
        aptitudes = expandAptitudes(initialAptitudes);
      }

      const stats = {};
      if (csvP) {
        stats.vel = parseInt(csvP.PAC) || baseOvr;
        stats.fin = parseInt(csvP.SHO) || baseOvr;
        stats.pas = parseInt(csvP.PAS) || baseOvr;
        stats.dri = parseInt(csvP.DRI) || baseOvr;
        stats.def = parseInt(csvP.DEF) || baseOvr;
        stats.fis = parseInt(csvP.PHY) || baseOvr;
        stats.sta = parseInt(csvP.Stamina) || baseOvr;
      } else {
        const isGK = aptitudes.includes("GOL");
        if (isGK) {
           Object.assign(stats, { alc: baseOvr, seg: baseOvr, esp: baseOvr, ref: baseOvr, pos: baseOvr, vel: 45, sta: 90 });
        } else {
           Object.assign(stats, { vel: baseOvr, fin: baseOvr, pas: baseOvr, dri: baseOvr, def: baseOvr, fis: baseOvr, sta: baseOvr });
        }
      }
      
      Object.keys(stats).forEach(k => {
        if (typeof stats[k] === "number") stats[k] = Math.max(10, Math.min(99, stats[k] + (Math.floor(Math.random() * 5) - 2)));
      });

      return {
        id: Date.now() + index,
        apiId: p.id,
        number: number || (index + 1),
        name: csvP ? csvP.Name : p.name,
        ovr: baseOvr,
        rating: baseOvr / 10,
        status: index < 11 ? "titular" : "reserva",
        aptitude: aptitudes,
        age: csvP ? (parseInt(csvP.Age) || p.age || 25) : (p.age || 25),
        foot: csvP ? (csvP["Preferred foot"] === "Left" ? "Canhoto" : "Destro") : (Math.random() > 0.8 ? "Canhoto" : "Destro"),
        nationality: csvP ? csvP.Nation : "N/A",
        playstyles: csvP ? (csvP["play style"] ? csvP["play style"].split(",").map(s => s.trim()) : []) : [],
        stats: stats,
        detailedStats: generateDetailedFromCSV(csvP, baseOvr)
      };
    });

    if (db) db.close();
    return result;

  } catch (error) {
    if (typeof db !== 'undefined' && db) db.close();
    console.error("Erro no SquadSync:", error);
    throw error;
  }
}

function generateDetailedFromCSV(csvP, baseOvr) {
  if (!csvP) return generateDefaultDetailedStats(baseOvr);

  const d = {};
  // Mapeamento direto dos nomes das colunas do CSV para o padrão do dashboard
  d.acceleration = parseInt(csvP.Acceleration) || baseOvr;
  d.sprintSpeed = parseInt(csvP["Sprint Speed"]) || baseOvr;
  d.positioning = parseInt(csvP.Positioning) || baseOvr;
  d.finishing = parseInt(csvP.Finishing) || baseOvr;
  d.shotPower = parseInt(csvP["Shot Power"]) || baseOvr;
  d.longShots = parseInt(csvP["Long Shots"]) || baseOvr;
  d.volleys = parseInt(csvP.Volleys) || baseOvr;
  d.penalties = parseInt(csvP.Penalties) || baseOvr;
  d.vision = parseInt(csvP.Vision) || baseOvr;
  d.crossing = parseInt(csvP.Crossing) || baseOvr;
  d.fkAcc = parseInt(csvP["Free Kick Accuracy"]) || baseOvr;
  d.shortPass = parseInt(csvP["Short Passing"]) || baseOvr;
  d.longPass = parseInt(csvP["Long Passing"]) || baseOvr;
  d.curve = parseInt(csvP.Curve) || baseOvr;
  d.dribbling = parseInt(csvP.Dribbling) || baseOvr;
  d.agility = parseInt(csvP.Agility) || baseOvr;
  d.balance = parseInt(csvP.Balance) || baseOvr;
  d.reactions = parseInt(csvP.Reactions) || baseOvr;
  d.ballControl = parseInt(csvP["Ball Control"]) || baseOvr;
  d.composure = parseInt(csvP.Composure) || baseOvr;
  d.interceptions = parseInt(csvP.Interceptions) || baseOvr;
  d.headingAcc = parseInt(csvP["Heading Accuracy"]) || baseOvr;
  d.defAware = parseInt(csvP["Def Awareness"]) || baseOvr;
  d.standTackle = parseInt(csvP["Standing Tackle"]) || baseOvr;
  d.slideTackle = parseInt(csvP["Sliding Tackle"]) || baseOvr;
  d.jumping = parseInt(csvP.Jumping) || baseOvr;
  d.stamina = parseInt(csvP.Stamina) || baseOvr;
  d.strength = parseInt(csvP.Strength) || baseOvr;
  d.aggression = parseInt(csvP.Aggression) || baseOvr;

  // Aplica a mesma variação de +-2 para detalhadas
  Object.keys(d).forEach(k => {
    d[k] = Math.max(10, Math.min(99, d[k] + (Math.floor(Math.random() * 5) - 2)));
  });

  return d;
}

function parseCSV(text) {
  const lines = text.split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Regex para lidar com vírgulas dentro de aspas
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.replace(/"/g, "").trim());
    return obj;
  });
}

function findInCSV(players, name) {
  if (!name) return null;
  const searchName = name.toLowerCase();
  // Busca exata primeiro
  let found = players.find(p => p.Name && p.Name.toLowerCase() === searchName);
  if (!found) {
    // Busca parcial (se o nome da API estiver contido no CSV ou vice-versa)
    found = players.find(p => p.Name && (p.Name.toLowerCase().includes(searchName) || searchName.includes(p.Name.toLowerCase())));
  }
  return found;
}

function mapFIFAtoDash(fifaPos) {
  const map = {
    "ST": "CA", "CF": "SA", "RW": "PD", "LW": "PE",
    "CAM": "MEI", "CM": "MC", "CDM": "VOL", "RM": "MD", "LM": "ME",
    "RB": "LD", "LB": "LE", "CB": "ZE", "GK": "GOL", "RWB": "LD", "LWB": "LE"
  };
  return map[fifaPos] || "MC";
}

function dbgToast(msg, color) {
  // Dispara evento para o uiUtils.js mostrar o toast se disponível
  const event = new CustomEvent("dbgToast", { detail: { msg, color } });
  window.dispatchEvent(event);
}

function mapPosition(apiPos) {
  switch (apiPos) {
    case "Goalkeeper": return "GOL";
    case "Defender": return "ZE";
    case "Midfielder": return "MC";
    case "Attacker": return "CA";
    default: return "MC";
  }
}

function generateDefaultDetailedStats(ovr) {
  const stats = {};
  const fields = [
    "acceleration", "sprintSpeed", "positioning", "finishing", "shotPower",
    "longShots", "volleys", "penalties", "vision", "crossing", "freeKickAccuracy",
    "shortPassing", "longPassing", "curve", "agility", "balance", "reactions",
    "ballControl", "composure", "interceptions", "headingAccuracy", "defAwareness",
    "standingTackle", "slidingTackle", "jumping", "strength", "aggression"
  ];
  fields.forEach(f => stats[f] = ovr);
  return stats;
}
