import { describe, expect, test } from 'vitest';

import {
  chooseItemKind,
  getLevel,
  getSpawnInterval,
  getSpeed,
  getTimeSpeedStep,
  isReceiverContact,
  resolveCatch,
} from './gameLogic';

describe('game logic', () => {
  test('five caught signals activate the x2 score multiplier', () => {
    expect(resolveCatch('signal', 4, 3)).toEqual({
      scoreDelta: 20,
      livesDelta: 0,
      nextCombo: 5,
    });
  });

  test('a glitch removes a life and resets the combo', () => {
    expect(resolveCatch('glitch', 7, 3)).toEqual({
      scoreDelta: 0,
      livesDelta: -1,
      nextCombo: 0,
    });
  });

  test('difficulty level and item ranges follow the config', () => {
    expect(getLevel(120)).toBe(3);
    expect(getSpawnInterval(60)).toBeLessThan(getSpawnInterval(0));
    expect(chooseItemKind(0.02)).toBe('core');
    expect(chooseItemKind(0.03)).toBe('glitch');
    expect(chooseItemKind(0.8)).toBe('signal');
  });

  test('an item is caught as soon as its lower edge touches the receiver antenna', () => {
    expect(isReceiverContact(75.99, 1, 1)).toBe(false);
    expect(isReceiverContact(76, 1, 1)).toBe(true);
    expect(isReceiverContact(76, 2, 1)).toBe(false);
  });

  test('speed increases linearly every ten seconds of active play', () => {
    expect(getTimeSpeedStep(9.99)).toBe(0);
    expect(getTimeSpeedStep(10)).toBe(1);
    expect(getSpeed(10)).toBe(getSpeed(0) + 4);
    expect(getSpeed(20)).toBe(getSpeed(0) + 8);
    expect(getSpeed(120)).toBe(43);
  });
});

