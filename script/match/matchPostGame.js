import { Storage } from "../core/appStorage.js";
import { showCustomModal } from "../ui/uiModal.js";
import { getRatingColor } from "../ui/uiGraphics.js";
import { renderApp, switchMainView } from "../ui/uiMain.js";
import { simulateCurrentRound } from "../league/leagueMain.js";
import { renderLeagueData } from "../league/leagueRenderer.js";

export const handleMatchPostGame = async ({
  homeScore,
  awayScore,
  matchInfo,
  currentOpponent,
  homePlayedIds,
  homeScorersIds,
  homeCards,
  homeScorers,
  awayScorers,
  homeAssists,
  awayAssists,
  leagueData,
  currentMatchDate,
  homeInjuriesList,
  homeFitnessTracker,
  homeAssistsIds,
  homeTacklesIds,
  isLeagueMatch,
  isCupMatch,
  leagueMatch,
  cupMatch,
  continentalMatch,
  isHomeInLeague,
  isHomeInCup,
  isHomeInContinental,
  isContinentalMatch,
  awayActivePlayers,
  closeSimulationView,
  squad,
  applyMatchResults,
  registerMatchResult,
}) => {
  let homePlayerRatings = {};
  const isWin = homeScore > awayScore;
  const isDraw = homeScore === awayScore;

  let homePenScore = window.simPenalties ? window.simPenalties.home : null;
  let awayPenScore = window.simPenalties ? window.simPenalties.away : null;
  window.simPenalties = null;

  let bestPlayer = { name: "Nenhum", rating: 0 };
  let playersReport = [];

  homePlayedIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      let r = 6.0; // Nota Base
      if (isWin) r += 0.5;
      if (!isWin && !isDraw) r -= 0.5;

      let goals = homeScorersIds.filter((gId) => gId === id).length;
      r += goals * 1.5;

      let card = homeCards.find((c) => c.id === id);
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

      r += Math.random() * 1.5 - 0.75; // Fator de aleatoriedade (+/- 0.75)
      const finalRating = parseFloat(
        Math.max(3.0, Math.min(10.0, r)).toFixed(1),
      );
      homePlayerRatings[id] = finalRating;

      playersReport.push({ name: p.name, rating: finalRating });
      if (finalRating > bestPlayer.rating) {
        bestPlayer = { name: p.name, rating: finalRating };
      }
    }
  });

  playersReport.sort((a, b) => b.rating - a.rating);

  const homeScorersCount = homeScorers.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const awayScorersCount = awayScorers.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const homeAssistsCount = homeAssists.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const awayAssistsCount = awayAssists.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  let scoreDisplay = `${homeScore} x ${awayScore}`;
  if (homePenScore !== null && awayPenScore !== null) {
    scoreDisplay = `${homeScore} (${homePenScore}) - (${awayPenScore}) ${awayScore}`;
  }

  let scorersHTML =
    '<div style="display: flex; justify-content: space-around; font-size: 0.8rem; margin-bottom: 15px; text-align: left; background: #1a1a1a; padding: 10px; border-radius: 8px;">';
  scorersHTML += '<div><strong style="color: #fff;">Gols (Casa):</strong><br>';
  scorersHTML +=
    Object.keys(homeScorersCount).length > 0
      ? Object.entries(homeScorersCount)
          .map(([name, count]) => `⚽ ${name} ${count > 1 ? `(${count})` : ""}`)
          .join("<br>")
      : "Nenhum";
  scorersHTML +=
    '<br><br><strong style="color: #fff;">Assistências (Casa):</strong><br>';
  scorersHTML +=
    Object.keys(homeAssistsCount).length > 0
      ? Object.entries(homeAssistsCount)
          .map(([name, count]) => `👟 ${name} ${count > 1 ? `(${count})` : ""}`)
          .join("<br>")
      : "Nenhuma";
  scorersHTML += "</div>";

  scorersHTML += '<div><strong style="color: #fff;">Gols (Fora):</strong><br>';
  scorersHTML +=
    Object.keys(awayScorersCount).length > 0
      ? Object.entries(awayScorersCount)
          .map(([name, count]) => `⚽ ${name} ${count > 1 ? `(${count})` : ""}`)
          .join("<br>")
      : "Nenhum";
  scorersHTML +=
    '<br><br><strong style="color: #fff;">Assistências (Fora):</strong><br>';
  scorersHTML +=
    Object.keys(awayAssistsCount).length > 0
      ? Object.entries(awayAssistsCount)
          .map(([name, count]) => `👟 ${name} ${count > 1 ? `(${count})` : ""}`)
          .join("<br>")
      : "Nenhuma";
  scorersHTML += "</div></div>";

  let reportHTML = `<div style="text-align: center; margin-bottom: 15px;">
    <h3 style="color: var(--accent); margin: 0 0 5px 0;">Fim de Partida!</h3>
    <p style="font-size: 1.2rem; font-weight: bold; margin: 0;">${matchInfo.home || "Seu Time"} ${scoreDisplay} ${currentOpponent.name}</p>
  </div>
  <div style="text-align: center; margin-bottom: 15px; color: var(--warning); font-weight: bold;">
    🌟 MVP da Partida: ${bestPlayer.name} (${bestPlayer.rating.toFixed(1)})
  </div>
  ${scorersHTML}
  <div style="max-height: 350px; overflow-y: auto; text-align: left; background: #1a1a1a; padding: 10px; border-radius: 8px; font-size: 0.9rem;">`;

  playersReport.forEach((p) => {
    reportHTML += `<div style="display: flex; justify-content: space-between; padding: 8px 5px; border-bottom: 1px solid #333;">
      <span>${p.name}</span>
      <strong style="color: ${getRatingColor(p.rating)}">${p.rating.toFixed(1)}</strong>
  </div>`;
  });
  reportHTML += `</div>`;

  await showCustomModal(reportHTML, "alert", "btn-primary");

  let daysPassed = 7;
  if (leagueData) {
    const lastDate = leagueData.lastMatchDate || currentMatchDate - 7;
    daysPassed = currentMatchDate - lastDate;
    if (daysPassed < 1) daysPassed = 7;
    if (daysPassed > 14) daysPassed = 14;
    leagueData.lastMatchDate = currentMatchDate;
  }

  let compType = "league";
  if (isCupMatch) compType = "cup";
  if (isContinentalMatch) compType = "continental";

  applyMatchResults(
    homeScorersIds,
    homeCards,
    homeInjuriesList,
    homeFitnessTracker,
    homePlayerRatings,
    homeAssistsIds,
    daysPassed,
    homeTacklesIds,
    compType,
  );
  registerMatchResult(
    matchInfo.home || "Seu Time",
    currentOpponent.name,
    homeScore,
    awayScore,
  );

  if (isLeagueMatch) {
    leagueMatch.played = true;
    if (isHomeInLeague) {
      leagueMatch.homeScore = homeScore;
      leagueMatch.awayScore = awayScore;
    } else {
      leagueMatch.homeScore = awayScore;
      leagueMatch.awayScore = homeScore;
    }

    const getTeam = (id) => {
      if (leagueData.divisions) {
        for (let d of leagueData.divisions) {
          let t = d.table.find((x) => x.id === id);
          if (t) return t;
        }
      }
      return leagueData.table.find((x) => x.id === id);
    };

    const homeTeam = getTeam(leagueMatch.home);
    const awayTeam = getTeam(leagueMatch.away);

    if (homeTeam && awayTeam) {
      homeTeam.p++;
      homeTeam.gf += leagueMatch.homeScore;
      homeTeam.ga += leagueMatch.awayScore;
      homeTeam.gd = homeTeam.gf - homeTeam.ga;
      awayTeam.p++;
      awayTeam.gf += leagueMatch.awayScore;
      awayTeam.ga += leagueMatch.homeScore;
      awayTeam.gd = awayTeam.gf - awayTeam.ga;

      if (leagueMatch.homeScore > leagueMatch.awayScore) {
        homeTeam.w++;
        homeTeam.pts += 3;
        awayTeam.l++;
      } else if (leagueMatch.awayScore > leagueMatch.homeScore) {
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

    if (!leagueData.scorers) leagueData.scorers = {};
    const updateScorers = (scorersArr, teamName) => {
      scorersArr.forEach((name) => {
        const key = `${name} (${teamName})`;
        if (!leagueData.scorers[key])
          leagueData.scorers[key] = { name, team: teamName, goals: 0 };
        leagueData.scorers[key].goals++;
      });
    };
    updateScorers(isHomeInLeague ? homeScorers : awayScorers, homeTeam.name);
    updateScorers(isHomeInLeague ? awayScorers : homeScorers, awayTeam.name);

    if (!leagueData.assists) leagueData.assists = {};
    const updateAssists = (assistsArr, teamName) => {
      assistsArr.forEach((name) => {
        const key = `${name} (${teamName})`;
        if (!leagueData.assists[key])
          leagueData.assists[key] = {
            name,
            team: teamName,
            assists: 0,
          };
        leagueData.assists[key].assists++;
      });
    };
    updateAssists(isHomeInLeague ? homeAssists : awayAssists, homeTeam.name);
    updateAssists(isHomeInLeague ? awayAssists : homeAssists, awayTeam.name);

    if (!leagueData.ratings) leagueData.ratings = {};
    const updateRatings = (ratingsArr, teamName) => {
      ratingsArr.forEach((p) => {
        const key = `${p.name} (${teamName})`;
        if (!leagueData.ratings[key])
          leagueData.ratings[key] = {
            name: p.name,
            team: teamName,
            sumRatings: 0,
            matches: 0,
          };
        leagueData.ratings[key].sumRatings += p.rating;
        leagueData.ratings[key].matches++;
      });
    };
    updateRatings(playersReport, matchInfo.home || "Seu Time");
    const awayPlayersReport = awayActivePlayers.map((p) => {
      let r = 6.0 + (!isWin ? 0.5 : 0) + (!isWin && !isDraw ? 0.5 : 0);
      r += awayScorers.filter((n) => n === p.name).length * 1.5;
      return {
        name: p.name,
        rating: Math.max(3.0, Math.min(10.0, r + (Math.random() * 1.5 - 0.75))),
      };
    });
    updateRatings(awayPlayersReport, currentOpponent.name);

    await Storage.saveLeagueData(leagueData);

    const simRest = await showCustomModal(
      "Deseja simular automaticamente as outras partidas desta rodada da Liga?",
      "confirm",
      "btn-primary",
    );

    if (simRest) {
      await simulateCurrentRound(true);

      const updatedLeague = await Storage.getLeagueData();
      const updatedUserDiv =
        updatedLeague && updatedLeague.divisions
          ? updatedLeague.divisions.find((d) => d.table.some((t) => t.isUser))
          : updatedLeague;

      if (
        updatedLeague &&
        updatedUserDiv &&
        updatedUserDiv.rounds &&
        updatedLeague.currentRound <= updatedUserDiv.rounds.length
      ) {
        const playNext = await showCustomModal(
          "Rodada da Liga finalizada! Deseja ir para a Prancheta Tática se preparar para o PRÓXIMO JOGO?",
          "confirm",
          "btn-primary",
        );
        if (playNext) {
          closeSimulationView();
          switchMainView("pitch"); // Abre a prancheta para escalar o time
          return;
        }
      }

      closeSimulationView();
      switchMainView("league");
      renderLeagueData();
      showCustomModal(
        "Rodada finalizada com sucesso! A tabela da Liga foi atualizada.",
        "alert",
        "btn-primary",
      );
      return; // Termina a execução para não abrir o Dashboard
    }
  } else if (isCupMatch) {
    cupMatch.played = true;
    if (isHomeInCup) {
      cupMatch.homeScore = homeScore;
      cupMatch.awayScore = awayScore;
      if (homeScore === awayScore) {
        cupMatch.homePen = homePenScore;
        cupMatch.awayPen = awayPenScore;
      }
    } else {
      cupMatch.homeScore = awayScore;
      cupMatch.awayScore = homeScore;
      if (homeScore === awayScore) {
        cupMatch.homePen = awayPenScore;
        cupMatch.awayPen = homePenScore;
      }
    }
    await Storage.saveLeagueData(leagueData);

    const simRest = await showCustomModal(
      "Deseja simular automaticamente as outras partidas desta fase da Copa?",
      "confirm",
      "btn-primary",
    );
    if (simRest) {
      const phaseIdx = leagueData.cup.currentPhaseIndex;
      const matches = leagueData.cup.phases[phaseIdx];
      const isFinal = phaseIdx === 8;
      const isVolta = phaseIdx % 2 === 1 && !isFinal;
      const isIda = phaseIdx % 2 === 0 && !isFinal;

      const getTeamOvr = (id) => {
        const flat = leagueData.divisions
          ? leagueData.divisions.flatMap((d) => d.table)
          : leagueData.table || [];
        let t = flat.find((x) => x.id === id);
        return t ? t.ovr || 75 : 75;
      };

      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = getTeamOvr(m.home);
          const aOvr = getTeamOvr(m.away);
          let hScore = Math.floor(Math.random() * 3);
          let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1;
          if (aOvr > hOvr + 5) aScore += 1;
          let hPen = null,
            aPen = null;
          
          if (isFinal) {
            if (hScore === aScore) {
              hPen = Math.floor(Math.random() * 4) + 2;
              aPen = Math.floor(Math.random() * 4) + 2;
              if (hPen === aPen) hPen++;
            }
          } else if (isVolta) {
            const idaMatch = leagueData.cup.phases[phaseIdx - 1].find(
              (im) => im.home === m.away && im.away === m.home,
            );
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
        const voltaPhase = matches.map((m) => ({
          home: m.away,
          away: m.home,
          played: false,
          homeScore: null,
          awayScore: null,
          homePen: null,
          awayPen: null,
        }));
        leagueData.cup.phases.push(voltaPhase);
        leagueData.cup.currentPhaseIndex++;
      } else if (isVolta) {
        const winners = [];
        matches.forEach((m) => {
          const idaMatch = leagueData.cup.phases[phaseIdx - 1].find(
            (im) => im.home === m.away && im.away === m.home,
          );
          const aggHome = idaMatch.homeScore + m.awayScore;
          const aggAway = idaMatch.awayScore + m.homeScore;
          if (aggAway > aggHome || (aggAway === aggHome && m.homePen > m.awayPen))
            winners.push(m.home);
          else winners.push(m.away);
        });

        if (winners.length > 1) {
          const nextIda = [];
          for (let i = 0; i < winners.length; i += 2) {
            nextIda.push({
              home: winners[i],
              away: winners[i + 1],
              played: false,
              homeScore: null,
              awayScore: null,
              homePen: null,
              awayPen: null,
            });
          }
          leagueData.cup.phases.push(nextIda);
          leagueData.cup.currentPhaseIndex++;
        } else {
          leagueData.cup.currentPhaseIndex++; // Vai para a Final
        }
      } else if (isFinal) {
        const m = matches[0];
        leagueData.cup.winner =
          m.homeScore > m.awayScore || (m.homeScore === m.awayScore && m.homePen > m.awayPen)
            ? m.home
            : m.away;
        leagueData.cup.finished = true;
      }

      await Storage.saveLeagueData(leagueData);

      closeSimulationView();
      switchMainView("league");
      renderLeagueData();
      showCustomModal("Fase da Copa finalizada!", "alert", "btn-primary");
      return;
    }
  } else if (isContinentalMatch) {
    continentalMatch.played = true;
    if (isHomeInContinental) {
      continentalMatch.homeScore = homeScore;
      continentalMatch.awayScore = awayScore;
      if (homeScore === awayScore) {
        continentalMatch.homePen = homePenScore;
        continentalMatch.awayPen = awayPenScore;
      }
    } else {
      continentalMatch.homeScore = awayScore;
      continentalMatch.awayScore = homeScore;
      if (homeScore === awayScore) {
        continentalMatch.homePen = awayPenScore;
        continentalMatch.awayPen = homePenScore;
      }
    }
    await Storage.saveLeagueData(leagueData);

    const simRest = await showCustomModal(
      "Deseja simular automaticamente as outras partidas desta fase?",
      "confirm",
      "btn-primary",
    );
    if (simRest) {
      const phaseIdx = leagueData.continentalCup.currentPhaseIndex;
      const matches = leagueData.continentalCup.phases[phaseIdx];
      const winners = [];
      const getTeamOvr = (id) => {
        const flat = leagueData.divisions
          ? leagueData.divisions.flatMap((d) => d.table)
          : [];
        let t = flat.find((x) => x.id === id);
        return t ? t.ovr || 75 : 75;
      };
      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = getTeamOvr(m.home);
          const aOvr = getTeamOvr(m.away);
          let hScore = Math.floor(Math.random() * 3);
          let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1;
          if (aOvr > hOvr + 5) aScore += 1;
          let hPen = null,
            aPen = null;
          if (hScore === aScore) {
            hPen = Math.floor(Math.random() * 4) + 2;
            aPen = Math.floor(Math.random() * 4) + 2;
            if (hPen === aPen) hPen++;
          }
          m.homeScore = hScore;
          m.awayScore = aScore;
          m.homePen = hPen;
          m.awayPen = aPen;
          m.played = true;
        }
        winners.push(
          m.homeScore > m.awayScore ||
            (m.homeScore === m.awayScore && m.homePen > m.awayPen)
            ? m.home
            : m.away,
        );
      });
      if (phaseIdx < 3) {
        const nextPhase = [];
        for (let i = 0; i < winners.length; i += 2)
          nextPhase.push({
            home: winners[i],
            away: winners[i + 1],
            played: false,
            homeScore: null,
            awayScore: null,
            homePen: null,
            awayPen: null,
          });
        leagueData.continentalCup.phases.push(nextPhase);
        leagueData.continentalCup.currentPhaseIndex++;
      } else {
        leagueData.continentalCup.finished = true;
        leagueData.continentalCup.winner = winners[0];
      }
      await Storage.saveLeagueData(leagueData);
      closeSimulationView();
      switchMainView("league");
      renderLeagueData();
      showCustomModal("Fase Continental finalizada!", "alert", "btn-primary");
      return;
    }
  }

  closeSimulationView();
  renderApp();
};
