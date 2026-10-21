export const GAME_CONFIG = {
  title: 'ОРБИТА-84',
  laneCount: 4,
  startingLives: 3,
  startingSpeed: 20,
  speedStep: 2.6,
  maxSpeed: 38,
  spawnInterval: 920,
  minSpawnInterval: 440,
  levelScoreStep: 80,
  collisionStart: 76,
  collisionEnd: 91,
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
