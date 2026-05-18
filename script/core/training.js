import { calculateOVR } from "./appCore.js";
import { calculateMarketValue } from "./appUtils.js";

/**
 * Retorna a categoria de potencial de desenvolvimento do jogador com base na idade
 * @param {number} age
 * @returns {string}
 */
export function getEvolutionPotential(age) {
  const a = parseInt(age) || 25;
  if (a <= 21) return "Jovem Promessa";
  if (a <= 28) return "Auge Técnico";
  if (a <= 32) return "Experiente";
  return "Veterano";
}

/**
 * Calcula o multiplicador de velocidade de evolução de um jogador
 * @param {Object} player Atleta a ser analisado
 * @param {Array} squad Elenco completo
 * @returns {number} Multiplicador final de probabilidade
 */
export function getEvolutionSpeedMultiplier(player, squad) {
  const age = parseInt(player.age) || 25;

  // 1. Multiplicador Base por Idade
  let ageMult = 1.0;
  if (age <= 21) {
    ageMult = 1.0; // Jovens evoluem a todo vapor
  } else if (age <= 28) {
    ageMult = 0.55; // Auge tático cresce de forma regular
  } else if (age <= 32) {
    ageMult = 0.18; // Experientes crescem lentamente
  } else {
    ageMult = 0.04; // Veteranos raramente evoluem atributos, focam em manutenção
  }

  // 2. Modificador por Nota Média (Desempenho)
  let ratingMult = 1.0;
  const avgRating = player.avgRating || 6.0;
  const played = player.matchesPlayed || 0;

  if (played > 0) {
    if (avgRating >= 7.5) {
      ratingMult = 1.30; // Desempenho excelente (+30% de boost)
    } else if (avgRating >= 7.0) {
      ratingMult = 1.15; // Desempenho ótimo (+15% de boost)
    } else if (avgRating < 6.0) {
      ratingMult = 0.70; // Desempenho ruim (-30% de penalidade)
    }
  }

  // 3. Modificador por Frequência de Jogos (Ritmo)
  let freqMult = 1.0;
  const maxMatches = Math.max(...squad.map((pl) => pl.matchesPlayed || 0), 1);
  const freq = played / maxMatches;

  if (played === 0) {
    freqMult = 0.30; // Sem ritmo nenhum de jogo (-70% de penalidade)
  } else if (freq >= 0.7) {
    freqMult = 1.25; // Titular absoluto (+25% de boost)
  } else if (freq < 0.3) {
    freqMult = 0.60; // Pouquíssimo aproveitado (-40% de penalidade)
  }

  return ageMult * ratingMult * freqMult;
}

/**
 * Executa o treinamento de um único jogador
 * @param {Object} player Jogador a treinar
 * @param {string} focus Foco de treino ('ataque', 'meio', 'defesa', 'goleiro', 'fisico')
 * @param {Array} squad Elenco total para cálculo de ritmo
 * @returns {Array} Lista de atributos que aumentaram: [{ attr, label, oldVal, newVal }]
 */
export function trainPlayer(player, focus, squad) {
  const isGK = player.aptitude && player.aptitude[0] === "GOL";
  let targetStats = [];

  // Mapeamento dos Focos
  const focusLower = (focus || "fisico").toLowerCase();
  if (isGK) {
    // Para goleiros, qualquer foco tático padrão reverte para habilidades de goleiro
    if (focusLower === "fisico") {
      targetStats = ["sta", "fis", "vel"];
    } else {
      targetStats = ["ref", "pos", "alc"]; // Foco principal de goleiro
    }
  } else {
    if (focusLower === "ataque") {
      targetStats = ["vel", "fin", "dri"];
    } else if (focusLower === "meio") {
      targetStats = ["pas", "dri", "fis"];
    } else if (focusLower === "defesa") {
      targetStats = ["def", "fis", "sta"];
    } else if (focusLower === "goleiro") {
      // Se for de linha e treinar goleiro por engano, redireciona ao físico
      targetStats = ["sta", "fis", "vel"];
    } else {
      // fisico
      targetStats = ["sta", "fis", "vel"];
    }
  }

  const baseChance = 0.40; // 40% de chance base semanal por atributo
  const speedMult = getEvolutionSpeedMultiplier(player, squad);
  const finalChance = baseChance * speedMult;

  const upgrades = [];
  const stats = player.stats || {};

  const statLabels = {
    vel: "Velocidade",
    fin: "Finalização",
    pas: "Passe",
    dri: "Drible",
    def: "Defesa",
    fis: "Físico",
    sta: "Estamina",
    ref: "Reflexos",
    pos: "Posicionamento",
    alc: "Alcance",
    seg: "Segurança",
    esp: "Espalmada",
  };

  targetStats.forEach((attr) => {
    if (stats[attr] !== undefined && stats[attr] < 99) {
      if (Math.random() < finalChance) {
        const oldVal = stats[attr];
        stats[attr]++;
        upgrades.push({
          attr,
          label: statLabels[attr] || attr.toUpperCase(),
          oldVal,
          newVal: stats[attr],
        });
      }
    }
  });

  if (upgrades.length > 0) {
    // Atualizar OVR
    const oldOvr = player.rating || player.ovr || 75;
    player.rating = calculateOVR(
      player.stats,
      player.form || 0,
      isGK,
      player.aptitude ? player.aptitude[0] : null
    );
    player.ovr = Math.round(player.rating);

    // Atualizar Valor de Mercado
    player.marketValue = calculateMarketValue(player.rating, player.age || 25);
  }

  return upgrades;
}

/**
 * Executa a sessão semanal de treinamento
 * @param {Array} squad Elenco de jogadores
 * @param {Array} slots Slots de treinamento [{ playerId, focus }]
 * @returns {Array} Log de evolução: [{ playerName, upgrades: [...] }]
 */
export function runWeeklyTraining(squad, slots) {
  const evolutionLogs = [];

  slots.forEach((slot) => {
    if (!slot || !slot.playerId) return;
    const player = squad.find((p) => p.id === parseInt(slot.playerId, 10));
    if (!player) return;

    const upgrades = trainPlayer(player, slot.focus, squad);
    if (upgrades.length > 0) {
      evolutionLogs.push({
        playerName: player.name,
        playerId: player.id,
        upgrades,
      });
    }
  });

  return evolutionLogs;
}
