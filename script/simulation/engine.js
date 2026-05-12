import { ALL_POSITIONS } from "../core.js";

/**
 * Determina o papel tático (def, mid, atk) de uma posição.
 */
export const getRole = (pos) => {
  if (["GL", "ZE", "ZD", "LE", "LD"].includes(pos)) return "def";
  if (["VOL", "MC", "MEI", "ME", "MD"].includes(pos)) return "mid";
  if (["CA", "SA", "PE", "PD"].includes(pos)) return "atk";
  return "mid";
};

/**
 * Retorna as coordenadas X/Y e a posição tática para cada slot de uma formação.
 */
export const getTacticalPositions = (formation) => {
  const positions = {
    "4-4-2": [
      { x: 10, y: 50, pos: "GL" },
      { x: 30, y: 35, pos: "ZE" }, { x: 30, y: 65, pos: "ZD" },
      { x: 25, y: 15, pos: "LE" }, { x: 25, y: 85, pos: "LD" },
      { x: 55, y: 35, pos: "MC" }, { x: 55, y: 65, pos: "MC" },
      { x: 50, y: 15, pos: "ME" }, { x: 50, y: 85, pos: "MD" },
      { x: 85, y: 35, pos: "CA" }, { x: 85, y: 65, pos: "CA" }
    ],
    "4-3-3": [
      { x: 10, y: 50, pos: "GL" },
      { x: 30, y: 30, pos: "ZE" }, { x: 30, y: 70, pos: "ZD" },
      { x: 25, y: 15, pos: "LE" }, { x: 25, y: 85, pos: "LD" },
      { x: 50, y: 50, pos: "MC" }, { x: 50, y: 25, pos: "MC" }, { x: 50, y: 75, pos: "MC" },
      { x: 80, y: 15, pos: "PE" }, { x: 85, y: 50, pos: "CA" }, { x: 80, y: 85, pos: "PD" }
    ],
    "4-3-3 Ofensivo": [
      { x: 10, y: 50, pos: "GL" },
      { x: 30, y: 30, pos: "ZE" }, { x: 30, y: 70, pos: "ZD" },
      { x: 25, y: 15, pos: "LE" }, { x: 25, y: 85, pos: "LD" },
      { x: 45, y: 50, pos: "VOL" }, { x: 60, y: 30, pos: "MEI" }, { x: 60, y: 70, pos: "MEI" },
      { x: 80, y: 15, pos: "PE" }, { x: 85, y: 50, pos: "CA" }, { x: 80, y: 85, pos: "PD" }
    ],
    "3-5-2": [
      { x: 10, y: 50, pos: "GL" },
      { x: 30, y: 20, pos: "ZE" }, { x: 30, y: 50, pos: "ZE" }, { x: 30, y: 80, pos: "ZD" },
      { x: 55, y: 15, pos: "ME" }, { x: 55, y: 35, pos: "MC" }, { x: 55, y: 65, pos: "MC" }, { x: 55, y: 85, pos: "MD" },
      { x: 85, y: 20, pos: "PE" }, { x: 85, y: 50, pos: "CA" }, { x: 85, y: 80, pos: "PD" }
    ],
    "5-3-2": [
      { x: 10, y: 50, pos: "GL" },
      { x: 25, y: 10, pos: "LE" }, { x: 30, y: 30, pos: "ZE" }, { x: 30, y: 50, pos: "ZE" }, { x: 30, y: 70, pos: "ZD" }, { x: 25, y: 90, pos: "LD" },
      { x: 55, y: 25, pos: "MC" }, { x: 55, y: 50, pos: "MC" }, { x: 55, y: 75, pos: "MC" },
      { x: 85, y: 35, pos: "CA" }, { x: 85, y: 65, pos: "CA" }
    ]
  };
  return positions[formation] || positions["4-4-2"];
};

/**
 * Mapeia os jogadores nos slots da formação de forma inteligente.
 */
export const smartAssignToSlots = (players, formation) => {
  const tacticalPos = getTacticalPositions(formation);
  const assigned = new Array(11).fill(null);
  const unassigned = [...players];

  // Pass 1: Goleiro
  const glSlotIdx = tacticalPos.findIndex(s => s.pos === "GL");
  if (glSlotIdx !== -1) {
    const gkIdx = unassigned.findIndex(p => p.aptitude?.includes("GOL") || p.aptitude?.includes("GL"));
    if (gkIdx !== -1) assigned[glSlotIdx] = unassigned.splice(gkIdx, 1)[0];
  }

  // Pass 2: Match exato
  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    const pIdx = unassigned.findIndex(p => p.aptitude?.includes(slot.pos));
    if (pIdx !== -1) assigned[sIdx] = unassigned.splice(pIdx, 1)[0];
  });

  // Pass 3: Match por papel (Role)
  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    const slotRole = getRole(slot.pos);
    const pIdx = unassigned.findIndex(p => {
      const apt = p.aptitude?.[0] || "MC";
      return getRole(apt) === slotRole;
    });
    if (pIdx !== -1) assigned[sIdx] = unassigned.splice(pIdx, 1)[0];
  });

  // Pass 4: Preencher o resto
  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    if (unassigned.length > 0) assigned[sIdx] = unassigned.splice(0, 1)[0];
  });

  return assigned.filter(p => p !== null);
};

/**
 * Calcula os poderes de ataque, defesa e controle de meio-campo.
 */
export const calculateMatchPowers = (homeActivePlayers, currentFormation, currentPlaystyle) => {
  const onPitch = homeActivePlayers.filter(p => !p.isExpelled);
  const tacticalPos = getTacticalPositions(currentFormation);

  let totalAtk = 0;
  let totalDef = 0;
  let controlPoints = 0;
  let speedSum = 0;
  let counts = { def: 0, mid: 0, atk: 0, vol: 0 };

  onPitch.forEach((p, i) => {
    const slot = tacticalPos[i] || { pos: "MC" };
    const slotRole = getRole(slot.pos);
    const playerRole = getRole(p.aptitude?.[0] || "MC");

    let efficiency = (slotRole !== playerRole) ? 0.6 : 1.0;
    const staminaFactor = 0.5 + (p.currentStamina / 200);

    const baseFin = p.stats?.fin || p.stats?.sho || 50;
    const baseDef = p.stats?.def || 50;
    const basePass = p.stats?.pas || 50;
    const baseSpd = p.stats?.spd || p.stats?.vel || 50;

    if (slotRole === "def") {
      totalDef += baseDef * staminaFactor * efficiency;
      counts.def++;
    } else if (slotRole === "mid") {
      controlPoints += basePass * staminaFactor * efficiency;
      totalDef += baseDef * 0.3 * staminaFactor * efficiency;
      totalAtk += baseFin * 0.2 * staminaFactor * efficiency;
      counts.mid++;
      if (slot.pos === "VOL") counts.vol++;
    } else if (slotRole === "atk") {
      totalAtk += baseFin * staminaFactor * efficiency;
      speedSum += baseSpd;
      counts.atk++;
    }
  });

  let chanceMod = 1.0;
  let awayChanceMod = 1.0;

  if (currentPlaystyle === "bus") {
    totalDef *= 1.35;
    awayChanceMod = 1.3;
    chanceMod = 0.5;
  } else if (currentPlaystyle === "attack") {
    totalAtk *= 1.45;
    totalDef *= 0.7;
    chanceMod = 1.5;
  } else if (currentPlaystyle === "possession") {
    controlPoints *= 1.6;
    chanceMod = 0.75;
    awayChanceMod = 0.75;
  } else if (currentPlaystyle === "counter") {
    const avgSpeed = speedSum / (counts.atk || 1);
    if (avgSpeed > 75) chanceMod = 1.4;
    totalDef *= 1.2;
  }

  if (counts.vol >= 2) totalDef *= 1.15;
  if (counts.atk >= 3) chanceMod *= 1.1;
  if (counts.mid >= 4) controlPoints *= 1.2;

  return {
    atk: totalAtk / 11,
    def: totalDef / 11,
    control: controlPoints / 11,
    chanceMod,
    awayChanceMod
  };
};
