import type { ItemKind } from './config';
import { GAME_CONFIG } from './config';

export type CatchResult = {
  scoreDelta: number;
  livesDelta: number;
  nextCombo: number;
};

export const getLevel = (score: number): number => Math.floor(score / GAME_CONFIG.levelScoreStep) + 1;

export const getTimeSpeedStep = (elapsedSeconds: number): number =>
  Math.floor(elapsedSeconds / GAME_CONFIG.timeSpeedIncreaseIntervalSeconds);

export const getSpeed = (score: number, elapsedSeconds = 0): number => {
  const scoreSpeed = GAME_CONFIG.startingSpeed + (getLevel(score) - 1) * GAME_CONFIG.speedStep;
  const timeMultiplier = (1 + GAME_CONFIG.timeSpeedIncreasePercent / 100) ** getTimeSpeedStep(elapsedSeconds);

  return Math.min(scoreSpeed * timeMultiplier, GAME_CONFIG.maxSpeed);
};

export const getSpawnInterval = (score: number): number =>
  Math.max(
    GAME_CONFIG.spawnInterval - (getLevel(score) - 1) * GAME_CONFIG.spawnIntervalStep,
    GAME_CONFIG.minSpawnInterval,
  );

export const isReceiverContact = (itemBottom: number, itemLane: number, receiverLane: number): boolean =>
  itemLane === receiverLane && itemBottom >= GAME_CONFIG.collisionStart && itemBottom <= GAME_CONFIG.collisionEnd;

export const resolveCatch = (kind: ItemKind, combo: number, lives: number): CatchResult => {
  if (kind === 'glitch') {
    return { scoreDelta: 0, livesDelta: -1, nextCombo: 0 };
  }

  if (kind === 'core') {
    return {
      scoreDelta: 25,
      livesDelta: lives < GAME_CONFIG.startingLives ? 1 : 0,
      nextCombo: combo + 1,
    };
  }

  const nextCombo = combo + 1;
  const multiplier = Math.min(1 + Math.floor(nextCombo / 5), 4);

  return { scoreDelta: 10 * multiplier, livesDelta: 0, nextCombo };
};

export const chooseItemKind = (roll: number): ItemKind => {
  if (roll < GAME_CONFIG.bonusChance) return 'core';
  if (roll < GAME_CONFIG.bonusChance + GAME_CONFIG.glitchChance) return 'glitch';
  return 'signal';
};
