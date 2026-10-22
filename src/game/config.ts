export const GAME_CONFIG = {
  title: 'ОРБИТА-84',
  laneCount: 4,
  startingLives: 3,
  startingSpeed: 19,
  speedStep: 4,
  maxSpeed: 43,
  spawnInterval: 960,
  spawnIntervalStep: 90,
  minSpawnInterval: 420,
  levelScoreStep: 60,
  collisionStart: 76,
  collisionEnd: 94,
  despawnAt: 106,
  bonusChance: 0.09,
  glitchChance: 0.28,
  keys: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    pause: ['KeyP', 'Space'],
  },
} as const;

export type ItemKind = 'signal' | 'glitch' | 'core';

export const ITEM_LABELS: Record<ItemKind, string> = {
  signal: 'Сигнал',
  glitch: 'Помеха',
  core: 'Энергоблок',
};
