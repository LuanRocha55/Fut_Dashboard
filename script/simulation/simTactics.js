export function getTacticalPositions(formation) {
  const positions = {
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
    if (["GL", "ZE", "ZD", "LE", "LD"].includes(pos)) return "def";
    if (["VOL", "MC", "MEI", "ME", "MD"].includes(pos)) return "mid";
    if (["CA", "SA", "PE", "PD"].includes(pos)) return "atk";
    return "mid";
  };

  const glSlotIdx = tacticalPos.findIndex((s) => s.pos === "GL");
  if (glSlotIdx !== -1) {
    const gkIdx = unassigned.findIndex((p) => p.aptitude?.includes("GOL") || p.aptitude?.includes("GL"));
    if (gkIdx !== -1) assigned[glSlotIdx] = unassigned.splice(gkIdx, 1)[0];
  }

  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    const pIdx = unassigned.findIndex((p) => p.aptitude?.includes(slot.pos));
    if (pIdx !== -1) assigned[sIdx] = unassigned.splice(pIdx, 1)[0];
  });

  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    const slotRole = getRole(slot.pos);
    const pIdx = unassigned.findIndex((p) => getRole(p.aptitude?.[0]) === slotRole);
    if (pIdx !== -1) assigned[sIdx] = unassigned.splice(pIdx, 1)[0];
  });

  tacticalPos.forEach((slot, sIdx) => {
    if (assigned[sIdx]) return;
    if (unassigned.length > 0) assigned[sIdx] = unassigned.splice(0, 1)[0];
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
    if (["GL", "ZE", "ZD", "LE", "LD"].includes(pos)) return "def";
    if (["VOL", "MC", "MEI", "ME", "MD"].includes(pos)) return "mid";
    if (["CA", "SA", "PE", "PD"].includes(pos)) return "atk";
    return "mid";
  };

  onPitch.forEach((p, i) => {
    const slot = tacticalPos[i] || { pos: "MC" };
    const slotRole = getRole(slot.pos);
    const playerRole = getRole(p.aptitude?.[0] || "MC");
    let efficiency = slotRole !== playerRole ? 0.6 : 1.0;

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