import { matchInfo } from "../core/appCore.js";

export const REFEREES = [
  {
    name: "Anderson Daronco",
    varChance: 0.1,
    goalCancelRate: 0.2,
    cardCancelRate: 0.2,
  },
  {
    name: "Wilton P. Sampaio",
    varChance: 0.4,
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
          t = d.table.find((x) => x.id === selectedValue);
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
    const res = await fetch("data/teams/" + selectedValue, {
      cache: "no-store",
    });
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
            (sum, p) => sum + ((p.stats?.fin || 65) + (p.stats?.vel || 65)) / 2,
            0,
          ) / len,
        def:
          oppTitulares.reduce(
            (sum, p) => sum + ((p.stats?.def || 65) + (p.stats?.fis || 65)) / 2,
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
  const onPitch = activePlayers.filter((p) => !p.isExpelled);
  if (onPitch.length === 0) return 10;
  return (
    (onPitch.reduce((sum, p) => {
      const baseAtk = (p.stats?.fin || 50) * 0.6 + (p.stats?.vel || 50) * 0.4;
      const staminaMult = 0.5 + p.currentStamina / 200; // Mínimo 0.5, Máximo 1.0
      return sum + baseAtk * staminaMult;
    }, 0) /
      onPitch.length) *
    (onPitch.length / 11)
  );
}

export function getTeamDef(activePlayers) {
  const onPitch = activePlayers.filter((p) => !p.isExpelled);
  if (onPitch.length === 0) return 10;
  return (
    (onPitch.reduce((sum, p) => {
      const baseDef = (p.stats?.def || 50) * 0.7 + (p.stats?.fis || 50) * 0.3;
      const staminaMult = 0.5 + p.currentStamina / 200;
      return sum + baseDef * staminaMult;
    }, 0) /
      onPitch.length) *
    (onPitch.length / 11)
  );
}

export function degradeStamina(
  players,
  isHome,
  homeFitnessTracker,
  staminaDrainFactor = 1.0,
) {
  players
    .filter((p) => !p.isExpelled)
    .forEach((p) => {
      const isGK = p.aptitude && p.aptitude[0] === "GL";
      const sta = p.stats?.sta || p.stats?.stm || (isGK ? 50 : 75);

      // Perda de estamina: Jogadores com menos estamina perdem mais rápido
      let loss = ((100 - sta) * 0.05 + 0.6) * staminaDrainFactor;
      if (isGK) loss = loss * 0.05; // Reduzi de 0.15 para 0.05 para durar mais

      p.currentStamina = Math.max(5, p.currentStamina - loss);
      if (isHome && homeFitnessTracker)
        homeFitnessTracker[p.id] = p.currentStamina;
    });
}
