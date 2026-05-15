/**
 * badgeService.js
 * Serviço centralizado para busca e cache de escudos de clubes e logos de ligas.
 * Suporta múltiplos provedores com roteamento por região.
 */

import { Storage } from "./appStorage.js";
import { API_KEYS_CONFIG } from "./apiKeys.js";

// Configurações de API (Prioriza localStorage, depois o arquivo apiKeys.js)
const API_KEYS = {
  API_FOOTBALL: localStorage.getItem("FUT_API_KEY") || API_KEYS_CONFIG.API_FOOTBALL || "", 
};

// Cache em memória para evitar hits repetidos no mesmo ciclo de vida
const _memoryCache = {};

/**
 * Busca o escudo de um time baseado no nome e na liga.
 */
export async function getTeamBadge(teamName, leagueName = "") {
  if (!teamName) return null;
  if (_memoryCache[teamName]) return _memoryCache[teamName];

  const cachedBadge = await Storage.getBadgeFromCache(teamName);
  if (cachedBadge) {
    _memoryCache[teamName] = cachedBadge;
    return cachedBadge;
  }

  let badgeUrl = null;

  try {
    // 1. Tenta API-Football (Provedor Principal)
    if (API_KEYS.API_FOOTBALL) {
      badgeUrl = await fetchFromAPIFootball(teamName);
    }

    // 2. Fallback Gratuito (TheSportsDB)
    if (!badgeUrl) {
      badgeUrl = await fetchFromTheSportsDB(teamName);
    }

    if (badgeUrl) {
      _memoryCache[teamName] = badgeUrl;
      await Storage.saveBadgeToCache(teamName, badgeUrl);
    }

    return badgeUrl || null;
  } catch (error) {
    console.error(`Erro ao buscar badge para ${teamName}:`, error);
    return null;
  }
}

/**
 * Busca logo da competição
 */
export async function getCompetitionBadge(leagueName) {
  if (!leagueName) return null;
  const cacheKey = `league_${leagueName}`;

  if (_memoryCache[cacheKey]) return _memoryCache[cacheKey];

  const cached = await Storage.getBadgeFromCache(cacheKey);
  if (cached) return cached;

  const url = await fetchLeagueFromTheSportsDB(leagueName);

  if (url) {
    _memoryCache[cacheKey] = url;
    await Storage.saveBadgeToCache(cacheKey, url);
  }

  return url || null;
}

// --- PROVEDORES ---

async function fetchFromAPIFootball(teamName) {
  if (!API_KEYS.API_FOOTBALL) return null;
  try {
    const response = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(teamName)}`, {
      headers: {
        'x-apisports-key': API_KEYS.API_FOOTBALL
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.response?.[0]?.team?.logo || null;
  } catch (error) {
    console.error("Erro na API-Football:", error);
    return null;
  }
}

async function fetchFromTheSportsDB(teamName) {
  try {
    let cleanName = teamName.replace(/\s*\(Fem\)$/i, "").trim();
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
    if (!r.ok) return null;
    const data = await r.json();
    let badge = data?.teams?.[0]?.strTeamBadge;

    if (!badge && cleanName !== teamName) {
      const r2 = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(cleanName)}`);
      if (r2.ok) {
        const data2 = await r2.json();
        badge = data2?.teams?.[0]?.strTeamBadge;
      }
    }
    return badge || null;
  } catch {
    return null;
  }
}

async function fetchLeagueFromTheSportsDB(leagueName) {
  try {
    // Este método é mais complexo pois o TheSportsDB não tem busca direta de logo de liga por nome fácil sem ID
    // Usamos o cache que já existe ou uma lista pré-carregada
    const r = await fetch("https://www.thesportsdb.com/api/v1/json/3/all_leagues.php");
    if (!r.ok) return null;
    const data = await r.json();
    
    const league = (data?.leagues || []).find(l => 
      l.strLeague.toLowerCase() === leagueName.toLowerCase() ||
      (l.strLeagueAlternate && l.strLeagueAlternate.toLowerCase().includes(leagueName.toLowerCase()))
    );
    
    return league?.strBadge || null;
  } catch {
    return null;
  }
}
