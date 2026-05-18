/**
 * fifaCalendar.js - Módulo de gerenciamento de Datas FIFA e Torneios de Seleções
 */

export function getSeasonWeek(currentDateStr, calendarType = "europe") {
  if (!currentDateStr) return 1;
  const d = new Date(currentDateStr);
  const year = d.getFullYear();
  let startYear = year;
  
  let startDate;
  const isSouthAm = calendarType === "brazil" || calendarType === "southam";
  
  if (isSouthAm) {
    // Sul-americano: temporada começa em 1º de Janeiro do ano atual
    startDate = new Date(year, 0, 1);
  } else {
    // Europeu: temporada começa em 1º de Julho do ano atual/anterior
    if (d.getMonth() < 6) {
      startYear = year - 1;
    }
    startDate = new Date(startYear, 6, 1);
  }
  
  const diffTime = Math.abs(d - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(52, Math.max(1, week));
}

export function getFIFAEvent(currentDateStr, calendarType = "europe") {
  const week = getSeasonWeek(currentDateStr, calendarType);
  const isSouthAm = calendarType === "brazil" || calendarType === "southam";
  
  if (isSouthAm) {
    // Calendário Sul-Americano
    if (week === 12) {
      return {
        week,
        type: "short",
        name: "Eliminatórias de Seleções (Data FIFA)",
        desc: "O calendário de clubes está pausado. As seleções nacionais disputarão 2 jogos oficiais esta semana."
      };
    }
    if (week >= 23 && week <= 25) {
      return {
        week,
        type: "tournament",
        name: "Copa Internacional de Seleções",
        desc: "O principal torneio internacional do continente! Jogos de alto nível disputados a cada 3-4 dias pelas maiores seleções do planeta."
      };
    }
    if (week === 36 || week === 41 || week === 46) {
      return {
        week,
        type: "short",
        name: "Amistosos Internacionais (Data FIFA)",
        desc: "O calendário de clubes está pausado. As seleções disputarão 2 jogos preparatórios esta semana."
      };
    }
  } else {
    // Calendário Europeu
    if (week === 10) {
      return {
        week,
        type: "short",
        name: "Eliminatórias Euro (Data FIFA)",
        desc: "O calendário de clubes está pausado. As seleções nacionais disputarão 2 jogos oficiais esta semana."
      };
    }
    if (week === 15 || week === 20 || week === 38) {
      return {
        week,
        type: "short",
        name: "Qualificações Internacionais (Data FIFA)",
        desc: "O calendário de clubes está pausado. As seleções nacionais disputarão 2 jogos decisivos esta semana."
      };
    }
    if (week >= 49 && week <= 51) {
      return {
        week,
        type: "tournament",
        name: "Copa Internacional de Seleções",
        desc: "O principal torneio internacional do continente! Jogos de alto nível disputados pelas maiores seleções do planeta."
      };
    }
  }
  
  return null;
}

export function generateFIFAMatches(type) {
  const potencies = [
    "Brasil", "Argentina", "França", "Inglaterra", 
    "Alemanha", "Espanha", "Portugal", "Itália", 
    "Holanda", "Bélgica", "Uruguai", "Colômbia", 
    "Croácia", "Marrocos", "Senegal", "Japão"
  ];
  
  if (type === "short") {
    // Gera 2 rodadas de confrontos de seleções
    const round1 = [];
    const round2 = [];
    const shuffled = [...potencies].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < 8; i++) {
      round1.push({
        home: shuffled[i * 2],
        away: shuffled[i * 2 + 1],
        played: false,
        score: null,
        dayOffset: 3 // Jogados no 3º dia da semana (ex: Quarta)
      });
    }
    
    // Rotacionar adversários para a rodada 2
    const rotated = [shuffled[0], ...shuffled.slice(2), shuffled[1]];
    for (let i = 0; i < 8; i++) {
      round2.push({
        home: rotated[i * 2],
        away: rotated[i * 2 + 1],
        played: false,
        score: null,
        dayOffset: 6 // Jogados no 6º dia da semana (ex: Sábado)
      });
    }
    
    return [round1, round2];
  } else {
    // Torneio Grande (Copa de Seleções) - 16 times em formato Eliminatória Direta (4 rodadas)
    // Atende a restrição de no mínimo 2 dias livres de descanso (rodadas a cada 4 dias)
    const phases = [];
    const shuffled = [...potencies].sort(() => 0.5 - Math.random());
    
    // Oitavas (Rodada 1)
    const oitavas = [];
    for (let i = 0; i < 8; i++) {
      oitavas.push({
        home: shuffled[i * 2],
        away: shuffled[i * 2 + 1],
        played: false,
        score: null,
        dayOffset: 2 // Dia 2 do torneio
      });
    }
    phases.push({ name: "Oitavas de Final", matches: oitavas });
    
    // Quartas (Rodada 2)
    const quartas = [];
    for (let i = 0; i < 4; i++) {
      quartas.push({
        home: `Vencedor Oitavas ${i * 2 + 1}`,
        away: `Vencedor Oitavas ${i * 2 + 2}`,
        played: false,
        score: null,
        dayOffset: 6 // Dia 6 do torneio (3 dias livres de descanso)
      });
    }
    phases.push({ name: "Quartas de Final", matches: quartas });
    
    // Semifinal (Rodada 3)
    const semi = [];
    for (let i = 0; i < 2; i++) {
      semi.push({
        home: `Vencedor Quartas ${i * 2 + 1}`,
        away: `Vencedor Quartas ${i * 2 + 2}`,
        played: false,
        score: null,
        dayOffset: 10 // Dia 10 do torneio (3 dias livres de descanso)
      });
    }
    phases.push({ name: "Semifinal", matches: semi });
    
    // Final (Rodada 4)
    const finalMatch = {
      home: "Vencedor Semifinal 1",
      away: "Vencedor Semifinal 2",
      played: false,
      score: null,
      dayOffset: 14 // Dia 14 do torneio (3 dias livres de descanso)
    };
    phases.push({ name: "Grande Final", matches: [finalMatch] });
    
    return phases;
  }
}
