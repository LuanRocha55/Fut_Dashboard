// Dicionário Dinâmico de Narração Esportiva - Versão Premium
const goalPhrases = [
  "GOOOOOOOOOOOOOOOOOOOL! É NOSSO! Uma pintura de {player}! Bateu na bola com um carinho enorme e estufou a rede adversária! Que golaço!",
  "GOOOOOOOL! {player} manda um foguete de fora da área e a coruja dorme! Golaço espetacular!",
  "GOOOOOOOL! Cruzamento na medida e {player} sobe mais que a zaga para testar pro fundo do gol!",
  "GOOOOOOOL! Sobrou o rebote na pequena área e o matador {player} não perdoa!",
  "GOOOOOOOL! Linda jogada coletiva, a bola chega limpa e {player} só tem o trabalho de empurrar pro fundo do gol!",
  "GOOOOOOOL! {player} limpa a marcação com frieza e toca na saída do goleiro! Que categoria!",
  "GOOOOOOOL! {player} solta uma bomba que ainda desvia na zaga antes de entrar! Sorte de campeão!",
  "GOOOOOOOL! Cobrança de falta magistral de {player}! A bola faz a curva e entra no ângulo!",
];

const goalWithDisadvantagePhrases = [
  "GOOOOOOOOOOOOOOOOOOOL! É NOSSO! MESMO COM UM A MENOS! {player} tira um coelho da cartola e incendeia a torcida!",
  "GOL HERÓICO! GOOOOOOOL! O time se supera com um a menos e {player} guarda no fundo das redes!",
  "CONTRA TUDO E CONTRA TODOS! GOOOOOL! {player} marca um gol que vale por dois!",
];

const goalWithAdvantagePhrases = [
  "GOOOOOOOOOOOOOOOOOOOL! É NOSSO! Aproveitando a vantagem numérica, {player} acha espaço e não perdoa!",
  "GOOOOOOOL! Com um homem a mais fica fácil! {player} bota a bola na casinha!",
  "MASSACRE! {player} aproveita o buraco na zaga e marca mais um!",
];

const missPhrases = [
  "Peeeeeeeeerdeu! {player} recebe em excelente condição, prepara o canhão, mas a bola passa tirando tinta da trave!",
  "Uuuuh! {player} faz linda jogada individual, chuta cruzado e a bola raspa a trave!",
  "Inacreditável! {player} na cara do gol, tentou encobrir o goleiro e mandou pra fora!",
  "Que perigo! {player} solta uma bomba e a bola passa assustando o goleiro!",
  "Isolou! {player} pegou muito embaixo na bola e mandou lá na arquibancada!",
  "NA TRAAAAAAAAVE! {player} solta o grito de gol, mas o poste salvou o adversário!",
];

const savePhrases = [
  "ESPAAAAAAAAAAAAAAALMA {goleiro}! {oppAttacker} apareceu cara a cara, mandou o petardo e o nosso camisa 1 voa bonito!",
  "MILAGRE DE {goleiro}! Reflexo de gato para defender a cabeçada à queima-roupa de {oppAttacker}!",
  "GIGANTE {goleiro}! Fechou o ângulo e bloqueou o chute venenoso de {oppAttacker}!",
  "Defesaça! {goleiro} se estica todo e vai buscar a bola no cantinho após o chute de {oppAttacker}!",
  "O NOME DELE É {goleiro}! Uma defesa que vale como um gol em cima de {oppAttacker}!",
];

const awayGoalPhrases = [
  "GOOOOOOOOOOOOOOOOOOOL! É do {awayTeam}! Cochilo da nossa defesa e {oppAttacker} não perdoa!",
  "GOOOOOOOL... Que ducha de água fria. {oppAttacker} ganha na corrida e chuta cruzado pra marcar.",
  "GOOOOOOOL! Falha na marcação e {oppAttacker} sobe sozinho no escanteio para balançar a nossa rede.",
  "GOOOOOOOL! Um balaço de {oppAttacker} de muito longe, sem chances para o nosso goleiro.",
  "SILÊNCIO NO ESTÁDIO! {oppAttacker} marca um belo gol para o {awayTeam}.",
];

const awayGoalWithDisadvantagePhrases = [
  "GOOOOOOOOOOOOOOOOOOOL! É do {awayTeam}! Mesmo com um a menos, eles encontram um contra-ataque mortal!",
  "Inacreditável... Tomamos gol de um time com jogador a menos. {oppAttacker} marca para o {awayTeam}.",
];

const awayGoalWithAdvantagePhrases = [
  "GOOOOOOOOOOOOOOOOOOOL! O {awayTeam} aproveita nossa desvantagem numérica e {oppAttacker} marca.",
  "A pressão de ter um a menos pesou... {oppAttacker} bota pra dentro. É gol do {awayTeam}.",
];

const tacklePhrases = [
  "🛡️ DESARME PRECISO! {defender} dá o bote na hora certa e rouba a bola de {attacker}!",
  "🛡️ PAREDE INTRANSPONÍVEL! {defender} não cai na finta de {attacker} e recupera a posse.",
  "🛡️ CORTE PROVIDENCIAL! {attacker} ia saindo de cara pro gol, mas {defender} aparece de carrinho rasgando tudo!",
  "🛡️ ROUBADA DE BOLA! {defender} antecipa o passe e sai jogando com estilo.",
];

const oppSavePhrases = [
  "DEFENDEU {goleiro}! {player} finaliza bem, mas o paredão adversário faz grande defesa!",
  "MILAGRE DE {goleiro}! {player} tinha o gol aberto, mas o arqueiro operou um milagre!",
  "ESPALMA {goleiro}! Chute forte de {player} e a bola vai pra escanteio.",
  "GIGANTE {goleiro}! O camisa 1 sai fechando o ângulo e impede o gol de {player}!",
];

const foulPhrases = [
  "🚩 FALTA! {player} chega atrasado e derruba {opponent}. O clima esquenta!",
  "🚩 FALTA DURA! {player} entra com força excessiva e o juizão já está de olho.",
  "🚩 INFRAÇÃO! {player} para o contra-ataque com uma falta tática.",
];

export const getRandomPhrase = (arr, vars) => {
  let phrase = arr[Math.floor(Math.random() * arr.length)];
  for (const [key, value] of Object.entries(vars)) {
    phrase = phrase.replace(`{${key}}`, value);
  }
  return phrase;
};

export const getHomeGoalPhrase = (playerName, homeReds, awayReds) => {
  if (homeReds > awayReds) return getRandomPhrase(goalWithDisadvantagePhrases, { player: playerName });
  if (homeReds < awayReds) return getRandomPhrase(goalWithAdvantagePhrases, { player: playerName });
  return getRandomPhrase(goalPhrases, { player: playerName });
};

export const getAwayGoalPhrase = (awayTeamName, oppAttackerName, awayReds, homeReds) => {
  if (awayReds > homeReds) return getRandomPhrase(awayGoalWithDisadvantagePhrases, { awayTeam: awayTeamName, oppAttacker: oppAttackerName });
  if (awayReds < homeReds) return getRandomPhrase(awayGoalWithAdvantagePhrases, { awayTeam: awayTeamName, oppAttacker: oppAttackerName });
  return getRandomPhrase(awayGoalPhrases, { awayTeam: awayTeamName, oppAttacker: oppAttackerName });
};

export const getTacklePhrase = (defenderName, attackerName) => getRandomPhrase(tacklePhrases, { defender: defenderName, attacker: attackerName });
export const getOppSavePhrase = (playerName, goleiroName) => getRandomPhrase(oppSavePhrases, { player: playerName, goleiro: goleiroName });
export const getMissPhrase = (playerName) => getRandomPhrase(missPhrases, { player: playerName });
export const getSavePhrase = (goleiroName, oppAttackerName) => getRandomPhrase(savePhrases, { goleiro: goleiroName, oppAttacker: oppAttackerName });
export const getFoulPhrase = (playerName, opponentName) => getRandomPhrase(foulPhrases, { player: playerName, opponent: opponentName });
