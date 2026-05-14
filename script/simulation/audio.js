export const soundWhistle = new Audio("assets/sounds/referee_whistle.ogg");
export const soundGoal = new Audio("assets/sounds/stadium_crowd_cheering.ogg");
export const soundMiss = new Audio("assets/sounds/crowd_groan.ogg");
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
