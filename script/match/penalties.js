export const startPenaltyShootout = async ({
  homeActivePlayers,
  awayActivePlayers,
  matchInfo,
  currentOpponentName,
  homeScore,
  awayScore,
  isSimulationActive,
  addLog,
  delay,
  playSound,
  soundGoal,
  soundMiss,
  soundWhistle,
  scoreEl,
  showFinalizeButton,
}) => {
  addLog(
    "🎯 O juiz aponta para a marca da cal! Vamos para a emocionante DISPUTA DE PÊNALTIS!",
    "log-chance",
  );

  let homePenScore = 0;
  let awayPenScore = 0;
  let homeKicks = 0;
  let awayKicks = 0;
  let isHomeTurn = true;

  const homeKickers = [...homeActivePlayers].sort(
    (a, b) => (b.stats?.fin || 50) - (a.stats?.fin || 50),
  );
  const awayKickers = [...awayActivePlayers].sort(
    (a, b) => (b.stats?.fin || 50) - (a.stats?.fin || 50),
  );

  const homeGK =
    homeActivePlayers.find((p) => p.aptitude?.[0] === "GL") ||
    homeActivePlayers[0];
  const awayGK =
    awayActivePlayers.find((p) => p.aptitude?.[0] === "GL") ||
    awayActivePlayers[0];

  const executePenalty = async () => {
    if (!isSimulationActive) return;

    const isHome = isHomeTurn;
    const teamName = isHome
      ? matchInfo.home || "Seu Time"
      : currentOpponentName;
    const kicker = isHome
      ? homeKickers[homeKicks % homeKickers.length]
      : awayKickers[awayKicks % awayKickers.length];
    const gk = isHome ? awayGK : homeGK;

    addLog(
      `🚶‍♂️ Vai para a cobrança ${kicker.name} pelo ${teamName}...`,
      "log-neutral",
    );
    await delay(2000);
    if (!isSimulationActive) return;

    const fin = kicker.stats?.fin || kicker.stats?.sho || 50;
    const ref = gk.stats?.ref || 50;

    const chance = 75 + (fin - ref) * 0.5;
    const goal = Math.random() * 100 < chance;

    if (goal) {
      playSound(soundGoal);
      addLog(
        `⚽ GOOOOOOOL! ${kicker.name} bate com categoria e estufa a rede!`,
        "log-goal",
      );
      if (isHome) homePenScore++;
      else awayPenScore++;
    } else {
      playSound(soundMiss);
      if (Math.random() > 0.5) {
        addLog(
          `🧤 DEFENDEU ${gk.name}! O paredão vai buscar no cantinho!`,
          "log-foul",
        );
      } else {
        addLog(`❌ PRA FORAAAAA! ${kicker.name} isola a cobrança!`, "log-foul");
      }
    }

    if (isHome) homeKicks++;
    else awayKicks++;

    scoreEl.innerText = `${homeScore} (${homePenScore}) x (${awayPenScore}) ${awayScore}`;

    let diff = homePenScore - awayPenScore;
    let homeRem = 5 - homeKicks;
    let awayRem = 5 - awayKicks;

    let finished = false;

    if (homeKicks <= 5 && awayKicks <= 5) {
      if (isHomeTurn && diff > awayRem) finished = true;
      if (!isHomeTurn && -diff > homeRem) finished = true;
      if (homeKicks === 5 && awayKicks === 5 && diff !== 0) finished = true;
    } else if (homeKicks === awayKicks && diff !== 0) {
      finished = true;
    }

    if (finished) {
      await delay(2000);
      const winner =
        diff > 0 ? matchInfo.home || "Seu Time" : currentOpponentName;
      addLog(
        `🏆 FIM DAS COBRANÇAS! O ${winner} VENCE A DISPUTA DE PÊNALTIS!`,
        "log-goal",
      );
      playSound(soundWhistle);
      window.simPenalties = { home: homePenScore, away: awayPenScore };
      showFinalizeButton();
    } else {
      isHomeTurn = !isHomeTurn;
      setTimeout(executePenalty, 2500);
    }
  };

  setTimeout(executePenalty, 2500);
};
