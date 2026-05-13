export const soundWhistle = new Audio(
  "https://actions.google.com/sounds/v1/sports/referee_whistle.ogg",
);
export const soundGoal = new Audio(
  "https://actions.google.com/sounds/v1/crowds/stadium_crowd_cheering.ogg",
);
export const soundMiss = new Audio(
  "https://actions.google.com/sounds/v1/crowds/crowd_groan.ogg",
);
soundWhistle.volume = 0.3;
soundGoal.volume = 0.4;
soundMiss.volume = 0.5;

export const playSound = (audio) => {
  if (!audio) return;
  const tempAudio = new Audio(audio.src);
  tempAudio.volume = audio.volume;
  tempAudio
    .play()
    .catch((e) => console.warn("Áudio bloqueado pelo navegador", e));
};
