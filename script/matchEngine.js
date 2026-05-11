import { matchInfo } from "./core.js";

export const REFEREES = [
  {
    name: "Anderson Daronco",
    varChance: 0.1,
    goalCancelRate: 0.3,
    cardCancelRate: 0.2,
  },
  {
    name: "Wilton P. Sampaio",
    varChance: 0.35,
    goalCancelRate: 0.6,
    cardCancelRate: 0.5,
  },
  {
    name: "Raphael Claus",
    varChance: 0.25,
    goalCancelRate: 0.5,
    cardCancelRate: 0.4,
  },
  {
    name: "Bráulio Machado",
    varChance: 0.2,
    goalCancelRate: 0.4,
    cardCancelRate: 0.6,
  },
  {
    name: "Edina Alves Batista",
    varChance: 0.15,
    goalCancelRate: 0.4,
    cardCancelRate: 0.3,
  },
];

export function getRandomReferee() {
  return REFEREES[Math.floor(Math.random() * REFEREES.length)];
}

export async function loadOpponentData(selectedValue, leagueData = null) {
  if (selectedValue.startsWith("abs_")) {
    let teamName = "Adversário Genérico";
    let ovr = 75;
    if (leagueData) {
      let t = null;
      if (leagueData.divisions) {
          for (let d of leagueData.divisions) {
              t = d.table.find(x => x.id === selectedValue);
              if (t) break;
          }
      } else {
          t = leagueData.table.find((x) => x.id === selectedValue);
      }
      if (t) {
        teamName = t.name;
        ovr = t.ovr || 75;
      }
    }
    return { name: teamName, atk: ovr, def: ovr, squad: [], fullSquad: [] };
  }
  if (selectedValue === "generic") {
    return {
      name: matchInfo.away || "Adversário Genérico",
      atk: 65,
      def: 65,
      squad: [],
    };
  }
  try {
    const res = await fetch("data/teams/" + selectedValue, { cache: "no-store" });
    if (res.ok) {
      const oppData = await res.json();
      const oppTitulares = (oppData.squad || []).filter(
        (p) => p.status === "titular",
      );
      const len = oppTitulares.length > 0 ? oppTitulares.length : 11;
      return {
        name:
          oppData.matchInfo?.home ||
          oppData.matchInfo?.away ||
          "Adversário Desconhecido",
        atk:
          oppTitulares.reduce(
            (sum, p) =>
              sum +
              ((p.stats?.fin || p.stats?.sho || 65) +
                (p.stats?.vel || p.stats?.pac || 65)) /
                2,
            0,
          ) / len,
        def:
          oppTitulares.reduce(
            (sum, p) =>
              sum +
              ((p.stats?.def || 65) + (p.stats?.fis || p.stats?.phy || 65)) / 2,
            0,
          ) / len,
        squad: oppTitulares,
        fullSquad: oppData.squad || [],
      };
    }
  } catch (e) {
    console.error("Erro ao carregar o arquivo:", e);
  }
  return {
    name: "Adversário (Erro de Leitura)",
    atk: 65,
    def: 65,
    squad: [],
    fullSquad: [],
  };
}

export function getTeamAtk(activePlayers) {
  if (activePlayers.length === 0) return 10;
  return (
    (activePlayers.reduce(
      (sum, p) =>
        sum +
        (((p.stats?.fin || p.stats?.sho || 50) +
          (p.stats?.vel || p.stats?.pac || 50)) /
          2) *
          (p.currentStamina / 100),
      0,
    ) /
      activePlayers.length) *
    (activePlayers.length / 11)
  );
}

export function getTeamDef(activePlayers) {
  if (activePlayers.length === 0) return 10;
  return (
    (activePlayers.reduce(
      (sum, p) =>
        sum +
        (((p.stats?.def || 50) + (p.stats?.fis || p.stats?.phy || 50)) / 2) *
          (p.currentStamina / 100),
      0,
    ) /
      activePlayers.length) *
    (activePlayers.length / 11)
  );
}

export function degradeStamina(players, isHome, homeFitnessTracker) {
  players.forEach((p) => {
    const isGK = p.aptitude && p.aptitude[0] === "GL";
    const sta = p.stats?.sta || p.stats?.stm || (isGK ? 50 : 75);

    let loss = (100 - sta) * 0.04 + 0.5;
    if (isGK) loss = loss * 0.1;

    p.currentStamina = Math.max(10, p.currentStamina - loss);
    if (isHome && homeFitnessTracker)
      homeFitnessTracker[p.id] = p.currentStamina;
  });
}

export function calculatePlayerRatings(
  playedIds,
  squad,
  homeScore,
  awayScore,
  scorersIds,
  cards,
) {
  let ratings = {};
  const isWin = homeScore > awayScore;
  const isDraw = homeScore === awayScore;

  playedIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      let r = 6.0;
      if (isWin) r += 0.5;
      if (!isWin && !isDraw) r -= 0.5;

      let goals = scorersIds.filter((gId) => gId === id).length;
      r += goals * 1.5;

      let card = cards.find((c) => c.id === id);
      if (card) {
        if (card.type === "yellow") r -= 0.5;
        if (card.type === "red") r -= 1.5;
      }

      const isDef =
        p.aptitude &&
        ["GL", "ZE", "ZD", "LE", "LD", "VOL"].includes(p.aptitude[0]);
      if (isDef) {
        if (awayScore === 0) r += 1.0;
        else r -= awayScore * 0.3;
      }

      r += Math.random() * 1.5 - 0.75;
      ratings[id] = parseFloat(Math.max(3.0, Math.min(10.0, r)).toFixed(1));
    }
  });

  return ratings;
}
