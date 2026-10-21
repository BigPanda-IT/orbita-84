import { describe, expect, test } from 'vitest';

import { chooseItemKind, getLevel, resolveCatch } from './gameLogic';

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
    expect(getLevel(160)).toBe(3);
    expect(chooseItemKind(0.02)).toBe('core');
    expect(chooseItemKind(0.2)).toBe('glitch');
    expect(chooseItemKind(0.8)).toBe('signal');
  });
});
