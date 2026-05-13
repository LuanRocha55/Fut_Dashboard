export function getTacticalPositions(formation) {
  const positions = {
    "3-1-4-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 25, pos: "ZE" },
      { x: 25, y: 50, pos: "ZE" },
      { x: 25, y: 75, pos: "ZD" },
      { x: 40, y: 50, pos: "VOL" },
      { x: 55, y: 15, pos: "ME" },
      { x: 55, y: 35, pos: "MC" },
      { x: 55, y: 65, pos: "MC" },
      { x: 55, y: 85, pos: "MD" },
      { x: 80, y: 38, pos: "CA" },
      { x: 80, y: 62, pos: "CA" },
    ],
    "3-4-1-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 25, pos: "ZE" },
      { x: 25, y: 50, pos: "ZE" },
      { x: 25, y: 75, pos: "ZD" },
      { x: 50, y: 15, pos: "ME" },
      { x: 50, y: 35, pos: "MC" },
      { x: 50, y: 65, pos: "MC" },
      { x: 50, y: 85, pos: "MD" },
      { x: 65, y: 50, pos: "MEI" },
      { x: 80, y: 38, pos: "CA" },
      { x: 80, y: 62, pos: "CA" },
    ],
    "3-4-2-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 25, pos: "ZE" },
      { x: 25, y: 50, pos: "ZE" },
      { x: 25, y: 75, pos: "ZD" },
      { x: 50, y: 15, pos: "ME" },
      { x: 50, y: 35, pos: "MC" },
      { x: 50, y: 65, pos: "MC" },
      { x: 50, y: 85, pos: "MD" },
      { x: 65, y: 35, pos: "SA" },
      { x: 65, y: 65, pos: "SA" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "4-1-2-1-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 40, y: 50, pos: "VOL" },
      { x: 55, y: 20, pos: "ME" },
      { x: 55, y: 80, pos: "MD" },
      { x: 68, y: 50, pos: "MEI" },
      { x: 82, y: 38, pos: "CA" },
      { x: 82, y: 62, pos: "CA" },
    ],
    "4-2-2-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 42, y: 35, pos: "VOL" },
      { x: 42, y: 65, pos: "VOL" },
      { x: 62, y: 25, pos: "MEI" },
      { x: 62, y: 75, pos: "MEI" },
      { x: 82, y: 38, pos: "CA" },
      { x: 82, y: 62, pos: "CA" },
    ],
    "4-2-4": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 50, y: 35, pos: "MC" },
      { x: 50, y: 65, pos: "MC" },
      { x: 75, y: 15, pos: "PE" },
      { x: 82, y: 38, pos: "CA" },
      { x: 82, y: 62, pos: "CA" },
      { x: 75, y: 85, pos: "PD" },
    ],
    "4-3-1-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 50, y: 25, pos: "MC" },
      { x: 50, y: 50, pos: "MC" },
      { x: 50, y: 75, pos: "MC" },
      { x: 65, y: 50, pos: "MEI" },
      { x: 82, y: 38, pos: "CA" },
      { x: 82, y: 62, pos: "CA" },
    ],
    "4-3-2-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 50, y: 25, pos: "MC" },
      { x: 50, y: 50, pos: "MC" },
      { x: 50, y: 75, pos: "MC" },
      { x: 68, y: 35, pos: "SA" },
      { x: 68, y: 65, pos: "SA" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "4-4-1-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 50, y: 15, pos: "ME" },
      { x: 50, y: 35, pos: "MC" },
      { x: 50, y: 65, pos: "MC" },
      { x: 50, y: 85, pos: "MD" },
      { x: 68, y: 50, pos: "SA" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "4-5-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 28, y: 12, pos: "LE" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 88, pos: "LD" },
      { x: 42, y: 50, pos: "VOL" },
      { x: 55, y: 15, pos: "ME" },
      { x: 55, y: 35, pos: "MC" },
      { x: 55, y: 65, pos: "MC" },
      { x: 55, y: 85, pos: "MD" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "5-2-1-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 12, pos: "LE" },
      { x: 22, y: 30, pos: "ZE" },
      { x: 22, y: 50, pos: "ZE" },
      { x: 22, y: 70, pos: "ZD" },
      { x: 25, y: 88, pos: "LD" },
      { x: 45, y: 35, pos: "MC" },
      { x: 45, y: 65, pos: "MC" },
      { x: 60, y: 50, pos: "MEI" },
      { x: 80, y: 38, pos: "CA" },
      { x: 80, y: 62, pos: "CA" },
    ],
    "4-3-3": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 30, y: 12, pos: "LE" },
      { x: 30, y: 88, pos: "LD" },
      { x: 45, y: 50, pos: "MC" },
      { x: 55, y: 28, pos: "MC" },
      { x: 55, y: 72, pos: "MC" },
      { x: 75, y: 18, pos: "PE" },
      { x: 82, y: 50, pos: "CA" },
      { x: 75, y: 82, pos: "PD" },
    ],
    "4-4-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 12, pos: "LE" },
      { x: 28, y: 88, pos: "LD" },
      { x: 50, y: 35, pos: "MC" },
      { x: 50, y: 65, pos: "MC" },
      { x: 50, y: 15, pos: "ME" },
      { x: 50, y: 85, pos: "MD" },
      { x: 80, y: 40, pos: "CA" },
      { x: 80, y: 60, pos: "CA" },
    ],
    "4-2-3-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 12, pos: "LE" },
      { x: 28, y: 88, pos: "LD" },
      { x: 42, y: 35, pos: "VOL" },
      { x: 42, y: 65, pos: "VOL" },
      { x: 62, y: 50, pos: "MEI" },
      { x: 60, y: 18, pos: "ME" },
      { x: 60, y: 82, pos: "MD" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "3-5-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 25, pos: "ZE" },
      { x: 25, y: 50, pos: "ZE" },
      { x: 25, y: 75, pos: "ZD" },
      { x: 45, y: 12, pos: "LE" },
      { x: 45, y: 88, pos: "LD" },
      { x: 45, y: 50, pos: "MC" },
      { x: 55, y: 35, pos: "MC" },
      { x: 55, y: 65, pos: "MC" },
      { x: 80, y: 38, pos: "CA" },
      { x: 80, y: 62, pos: "CA" },
    ],
    "5-4-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 12, pos: "LE" },
      { x: 22, y: 30, pos: "ZE" },
      { x: 22, y: 50, pos: "ZE" },
      { x: 22, y: 70, pos: "ZD" },
      { x: 25, y: 88, pos: "LD" },
      { x: 45, y: 25, pos: "MC" },
      { x: 45, y: 45, pos: "MC" },
      { x: 45, y: 65, pos: "MC" },
      { x: 45, y: 85, pos: "MC" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "4-1-4-1": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 35, pos: "ZE" },
      { x: 25, y: 65, pos: "ZD" },
      { x: 28, y: 12, pos: "LE" },
      { x: 28, y: 88, pos: "LD" },
      { x: 40, y: 50, pos: "VOL" },
      { x: 55, y: 35, pos: "MC" },
      { x: 55, y: 65, pos: "MC" },
      { x: 55, y: 15, pos: "ME" },
      { x: 55, y: 85, pos: "MD" },
      { x: 82, y: 50, pos: "CA" },
    ],
    "3-4-3": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 25, pos: "ZE" },
      { x: 25, y: 50, pos: "ZE" },
      { x: 25, y: 75, pos: "ZD" },
      { x: 50, y: 15, pos: "ME" },
      { x: 50, y: 38, pos: "MC" },
      { x: 50, y: 62, pos: "MC" },
      { x: 50, y: 85, pos: "MD" },
      { x: 75, y: 20, pos: "PE" },
      { x: 82, y: 50, pos: "CA" },
      { x: 75, y: 80, pos: "PD" },
    ],
    "5-3-2": [
      { x: 8, y: 50, pos: "GL" },
      { x: 25, y: 12, pos: "LE" },
      { x: 22, y: 30, pos: "ZE" },
      { x: 22, y: 50, pos: "ZE" },
      { x: 22, y: 70, pos: "ZD" },
      { x: 25, y: 88, pos: "LD" },
      { x: 50, y: 25, pos: "MC" },
      { x: 45, y: 50, pos: "MC" },
      { x: 50, y: 75, pos: "MC" },
      { x: 80, y: 38, pos: "CA" },
      { x: 80, y: 62, pos: "CA" },
    ],
  };
  return positions[formation] || positions["4-4-2"];
}

export function smartAssignToSlots(players, formation) {
  const tacticalPos = getTacticalPositions(formation);
  const assigned = new Array(11).fill(null);
  const unassigned = [...players];

  const getRole = (pos) => {
    if (["GL", "GOL", "ZE", "ZD", "LE", "LD"].includes(pos)) return "def";
    if (["VOL", "MC", "MEI", "ME", "MD"].includes(pos)) return "mid";
    if (["CA", "SA", "PE", "PD"].includes(pos)) return "atk";
    return "mid";
  };

  const extractBestPlayer = (preferredPosList) => {
    let bestIdx = -1;
    let bestRating = -1;

    for (let i = 0; i < unassigned.length; i++) {
      const p = unassigned[i];
      const mainPos = p.aptitude?.[0] || "MC";
      let matchScore = -1;

      const posIdx = preferredPosList.indexOf(mainPos);
      if (posIdx !== -1) {
        matchScore = preferredPosList.length - posIdx;
      } else if (p.aptitude?.some((ap) => preferredPosList.includes(ap))) {
        matchScore = 0;
      }

      if (matchScore >= 0) {
        const score = matchScore * 1000 + (p.rating || 0); // Prioriza compatibilidade, depois OVR
        if (score > bestRating) {
          bestRating = score;
          bestIdx = i;
        }
      }
    }

    if (bestIdx !== -1) {
      return unassigned.splice(bestIdx, 1)[0];
    }
    return null;
  };

  // Fase 1: Preenchimento Específico de Posições (Match exato e correlatas fortes)
  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;

    const fallbackMap = {
      GL: ["GL", "GOL"],
      ZE: ["ZE", "ZD", "VOL"],
      ZD: ["ZD", "ZE", "LD"],
      LE: ["LE", "ME", "PE"],
      LD: ["LD", "MD", "PD"],
      VOL: ["VOL", "MC", "ZE", "ZD"],
      MC: ["MC", "VOL", "MEI", "ME", "MD"],
      ME: ["ME", "LE", "PE", "MC"],
      MD: ["MD", "LD", "PD", "MC"],
      MEI: ["MEI", "MC", "SA", "PE", "PD"],
      PE: ["PE", "ME", "SA", "PD"],
      PD: ["PD", "MD", "SA", "PE"],
      SA: ["SA", "CA", "MEI", "PE", "PD"],
      CA: ["CA", "SA", "PE", "PD"],
    };

    const preferred = fallbackMap[slot.pos] || [slot.pos];
    const bestPlayer = extractBestPlayer(preferred);
    if (bestPlayer) {
      assigned[sIdx] = bestPlayer;
    }
  });

  // Fase 2: Preenchimento por Papel Defensivo/Ofensivo (Caso não tenha ngm apto)
  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    const slotRole = getRole(slot.pos);

    let bestIdx = -1;
    let bestRating = -1;

    for (let i = 0; i < unassigned.length; i++) {
      const p = unassigned[i];
      const pRole = getRole(p.aptitude?.[0] || "MC");
      if (pRole === slotRole) {
        if ((p.rating || 0) > bestRating) {
          bestRating = p.rating || 0;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) {
      assigned[sIdx] = unassigned.splice(bestIdx, 1)[0];
    }
  });

  // Fase 3: Preencher com os melhores OVR que sobraram (Improviso total)
  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    unassigned.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (unassigned.length > 0) {
      assigned[sIdx] = unassigned.splice(0, 1)[0];
    }
  });

  return assigned.filter((p) => p !== null);
}

export function calculateMatchPowers(homeActivePlayers, currentFormation, currentPlaystyle) {
  const onPitch = homeActivePlayers.filter((p) => !p.isExpelled);
  const tacticalPos = getTacticalPositions(currentFormation);

  let totalAtk = 0;
  let totalDef = 0;
  let controlPoints = 0;
  let speedSum = 0;
  let counts = { def: 0, mid: 0, atk: 0, vol: 0 };

  const getRole = (pos) => {
    if (["GL", "GOL", "ZE", "ZD", "LE", "LD"].includes(pos)) return "def";
    if (["VOL", "MC", "MEI", "ME", "MD"].includes(pos)) return "mid";
    if (["CA", "SA", "PE", "PD"].includes(pos)) return "atk";
    return "mid";
  };

  onPitch.forEach((p, i) => {
    const slot = tacticalPos[i] || { pos: "MC" };
    const slotRole = getRole(slot.pos);
    const playerRole = getRole(p.aptitude?.[0] || "MC");

    // Calcula eficiência respeitando as posições secundárias
    let efficiency = 1.0;
    if (p.aptitude && p.aptitude.includes(slot.pos)) {
      efficiency = 1.0; // Posição exata (primária ou secundária)
    } else if (slotRole === playerRole) {
      efficiency = 0.8; // Mesmo papel (ex: ZC -> LE), mas não é apto
    } else {
      efficiency = 0.6; // Totalmente improvisado
    }

    const baseFin = p.stats?.fin || p.stats?.sho || 50;
    const baseDef = p.stats?.def || p.stats?.mar || 50;
    const basePass = p.stats?.pas || 50;
    const baseSpd = p.stats?.spd || p.stats?.vel || 50;
    const staminaFactor = 0.5 + p.currentStamina / 200;

    if (slotRole === "def") {
      totalDef += baseDef * staminaFactor * efficiency;
      if (slot.pos === "GL") totalDef += (p.stats?.ref || 50) * 0.4;
      counts.def++;
    } else if (slotRole === "mid") {
      controlPoints += basePass * staminaFactor * efficiency;
      totalAtk += baseFin * 0.2 * staminaFactor * efficiency;
      totalDef += baseDef * 0.2 * staminaFactor * efficiency;
      counts.mid++;
      if (slot.pos === "VOL") counts.vol++;
    } else if (slotRole === "atk") {
      totalAtk += baseFin * staminaFactor * efficiency;
      speedSum += baseSpd * staminaFactor * efficiency;
      counts.atk++;
    }
  });

  let chanceMod = 1.0;
  let awayChanceMod = 1.0;

  if (currentPlaystyle === "retranca") {
    totalDef *= 1.35;
    awayChanceMod = 1.3;
    chanceMod = 0.4;
  } else if (currentPlaystyle === "ataque total") {
    totalAtk *= 1.45;
    totalDef *= 0.7;
    chanceMod = 1.5;
  } else if (currentPlaystyle === "possession") {
    controlPoints *= 1.6;
    chanceMod = 0.75;
    awayChanceMod = 0.75;
  } else if (currentPlaystyle === "contra ataque") {
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
    awayChanceMod,
  };
}