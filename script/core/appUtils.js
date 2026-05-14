export const normalizeStr = (str) => {
  return str
    ? str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";
};

/**
 * Calcula o valor de mercado baseado em OVR e Idade
 */
export const calculateMarketValue = (rating, age = 25) => {
  const r = parseFloat(rating) || 50;
  // Nova base: 80 OVR ~ 30M | 90 OVR ~ 150M | 95 OVR ~ 250M
  let base = Math.pow(r / 55, 6.5) * 1000000;
  
  // Fator Idade: Jovens valem muito mais, veteranos desvalorizam
  let ageFactor = 1;
  const parsedAge = parseInt(age) || 25;
  if (parsedAge <= 21) ageFactor = 1.6;
  else if (parsedAge <= 25) ageFactor = 1.3;
  else if (parsedAge >= 32) ageFactor = Math.max(0.1, 1 - (parsedAge - 32) * 0.15);
  
  return Math.round(base * ageFactor);
};

/**
 * Formata valores numéricos para moeda (Ex: € 150.5M)
 */
export const formatMoney = (value) => {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
  return `€${value}`;
};

/**
 * Define o orçamento inicial baseado no nível do time
 */
export const getStartingBudget = (teamOvr) => {
  const ovr = parseInt(teamOvr) || 75;
  if (ovr >= 85) return 250000000; // Real Madrid, Man City, etc
  if (ovr >= 80) return 80000000;  // Dortmund, Milan, etc
  if (ovr >= 75) return 25000000;  // Times médios
  return 5000000;  // Times pequenos
};

/**
 * Verifica se a janela de transferências está aberta baseado na liga e data
 * Brasil: Jan/Fev (Início) e Jul/Ago (Meio)
 * Europa: Jul/Ago (Início) e Jan (Meio)
 */
export const isTransferWindowOpen = (gameDate, leagueType = "br") => {
  const date = new Date(gameDate);
  const month = date.getMonth() + 1; // 1-12
  
  if (leagueType === "br") {
    return [1, 2, 7, 8].includes(month);
  } else {
    // Europa e outros (Jul/Ago e Jan)
    return [1, 7, 8].includes(month);
  }
};

/**
 * Retorna o número de dias em um mês específico
 */
export const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Formata a data do jogo para exibição
 */
export const formatGameDate = (gameDate) => {
  const date = new Date(gameDate);
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return `${months[date.getMonth()]} de ${date.getFullYear()}`;
};
