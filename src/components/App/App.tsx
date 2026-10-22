import classNames from 'classnames';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ItemKind } from '../../game/config';
import { GAME_CONFIG, ITEM_LABELS } from '../../game/config';
import {
  chooseItemKind,
  getLevel,
  getSpawnInterval,
  getSpeed,
  isReceiverContact,
  resolveCatch,
} from '../../game/gameLogic';

import style from './App.module.less';

type GameStatus = 'start' | 'playing' | 'paused' | 'gameover';

type FallingItem = {
  id: number;
  kind: ItemKind;
  lane: number;
  y: number;
};

const getStoredBestScore = (): number => {
  const parsedScore = Number(window.localStorage.getItem('orbita-84-best'));
  return Number.isFinite(parsedScore) ? parsedScore : 0;
};

const useLatestValue = <T,>(value: T) => {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  return valueRef;
};

const useGameRefs = (score: number, lives: number, combo: number, playerLane: number) => {
  const itemId = useRef(0);
  const scoreRef = useLatestValue(score);
  const livesRef = useLatestValue(lives);
  const comboRef = useLatestValue(combo);
  const playerLaneRef = useLatestValue(playerLane);
  const audioContextRef = useRef<AudioContext | null>(null);

  return { audioContextRef, comboRef, itemId, livesRef, playerLaneRef, scoreRef };
};

export const App = () => {
  const [status, setStatus] = useState<GameStatus>('start');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(getStoredBestScore);
  const [lives, setLives] = useState(GAME_CONFIG.startingLives);
  const [combo, setCombo] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [message, setMessage] = useState('Система готова');
  const { audioContextRef, comboRef, itemId, livesRef, playerLaneRef, scoreRef } = useGameRefs(
    score,
    lives,
    combo,
    playerLane,
  );

  const playTone = useCallback(
    (frequency: number, duration = 0.07) => {
      if (!soundEnabled) return;
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;

      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.04, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    },
    [soundEnabled],
  );

  const movePlayer = useCallback(
    (direction: -1 | 1) => {
      if (status !== 'playing') return;
      setPlayerLane((currentLane) => {
        const nextLane = Math.max(0, Math.min(GAME_CONFIG.laneCount - 1, currentLane + direction));
        playerLaneRef.current = nextLane;
        return nextLane;
      });
      playTone(150 + (direction === 1 ? 30 : 0), 0.035);
    },
    [playTone, status],
  );

  const finishGame = useCallback(
    (finalScore: number) => {
      setStatus('gameover');
      setMessage('Связь потеряна');
      setBestScore((currentBest) => {
        const nextBest = Math.max(currentBest, finalScore);
        window.localStorage.setItem('orbita-84-best', String(nextBest));
        return nextBest;
      });
      playTone(74, 0.4);
    },
    [playTone],
  );

  const applyScoreDelta = useCallback(
    (scoreDelta: number): number | null => {
      if (scoreDelta === 0) return null;

      const previousLevel = getLevel(scoreRef.current);
      scoreRef.current += scoreDelta;
      setScore(scoreRef.current);
      const nextLevel = getLevel(scoreRef.current);

      return nextLevel > previousLevel ? nextLevel : null;
    },
    [scoreRef],
  );

  const startGame = useCallback(() => {
    setScore(0);
    scoreRef.current = 0;
    setLives(GAME_CONFIG.startingLives);
    livesRef.current = GAME_CONFIG.startingLives;
    setCombo(0);
    comboRef.current = 0;
    setPlayerLane(1);
    playerLaneRef.current = 1;
    setItems([]);
    setMessage('Приём сигнала');
    setStatus('playing');
    playTone(440, 0.08);
  }, [playTone]);

  const togglePause = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus === 'playing') {
        setMessage('Пауза');
        return 'paused';
      }
      if (currentStatus === 'paused') {
        setMessage('Приём сигнала');
        return 'playing';
      }
      return currentStatus;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((GAME_CONFIG.keys.left as readonly string[]).includes(event.code)) {
        event.preventDefault();
        movePlayer(-1);
      }
      if ((GAME_CONFIG.keys.right as readonly string[]).includes(event.code)) {
        event.preventDefault();
        movePlayer(1);
      }
      if ((GAME_CONFIG.keys.pause as readonly string[]).includes(event.code)) {
        event.preventDefault();
        togglePause();
      }
      if (event.code === 'Enter' && (status === 'start' || status === 'gameover')) {
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, startGame, status, togglePause]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden && status === 'playing') {
        setStatus('paused');
        setMessage('Пауза');
      }
    };

    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [status]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const spawnTimer = window.setInterval(() => {
      const nextItem: FallingItem = {
        id: itemId.current,
        kind: chooseItemKind(Math.random()),
        lane: Math.floor(Math.random() * GAME_CONFIG.laneCount),
        y: -12,
      };
      itemId.current += 1;
      setItems((currentItems) => [...currentItems, nextItem]);
    }, getSpawnInterval(score));

    return () => window.clearInterval(spawnTimer);
  }, [score, status]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    let animationFrame = 0;
    let previousTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.05);
      previousTime = currentTime;

      setItems((currentItems) => {
        let scoreDelta = 0;
        let livesDelta = 0;
        let nextCombo = comboRef.current;
        const caught = { signal: false, glitch: false, core: false };

        const remainingItems = currentItems.reduce<FallingItem[]>((remaining, item) => {
          const nextY = item.y + getSpeed(scoreRef.current) * deltaSeconds;
          const canCollide = isReceiverContact(nextY, item.lane, playerLaneRef.current);

          if (canCollide) {
            const result = resolveCatch(item.kind, nextCombo, livesRef.current + livesDelta);
            scoreDelta += result.scoreDelta;
            livesDelta += result.livesDelta;
            nextCombo = result.nextCombo;
            caught.signal = caught.signal || item.kind === 'signal';
            caught.glitch = caught.glitch || item.kind === 'glitch';
            caught.core = caught.core || item.kind === 'core';
            return remaining;
          }
          if (nextY <= GAME_CONFIG.despawnAt) remaining.push({ ...item, y: nextY });
          return remaining;
        }, []);

        const leveledUpTo = applyScoreDelta(scoreDelta);
        if (nextCombo !== comboRef.current) {
          comboRef.current = nextCombo;
          setCombo(nextCombo);
        }
        if (livesDelta !== 0) {
          const nextLives = Math.max(0, livesRef.current + livesDelta);
          livesRef.current = nextLives;
          setLives(nextLives);
          if (nextLives === 0) finishGame(scoreRef.current);
        }

        if (leveledUpTo !== null) {
          setMessage(`Уровень ${String(leveledUpTo).padStart(2, '0')} · скорость ↑`);
          playTone(760, 0.15);
        } else if (caught.core) {
          setMessage('Энергия +1');
          playTone(660, 0.12);
        } else if (caught.glitch) {
          setMessage('Сбой системы');
          playTone(92, 0.16);
        } else if (caught.signal) {
          setMessage(nextCombo > 0 && nextCombo % 5 === 0 ? 'Множитель!' : 'Сигнал принят');
          playTone(320 + Math.min(nextCombo, 10) * 18);
        }
        return remainingItems;
      });

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [applyScoreDelta, finishGame, playTone, status]);

  return (
    <main className={style.app}>
      <div className={style.starField} aria-hidden="true" />
      <header className={style.topBar}>
        <a className={style.brand} href="#game" aria-label="К игре Орбита-84">
          <span className={style.brandMark}>O</span>
          <span>VOIDWORKS / 1984</span>
        </a>
        <span className={style.issue}>PORTABLE SIGNAL SYSTEM · № 084</span>
      </header>

      <section className={style.hero}>
        <aside className={style.briefing} aria-label="Описание миссии">
          <span className={style.eyebrow}>АРХИВНАЯ МИССИЯ</span>
          <h1>
            Удержите связь
            <br />с орбитой.
          </h1>
          <p>Ловите сигналы ◆, собирайте энергоблоки ✦ и не подпускайте помехи × к приёмнику.</p>
          <div className={style.legend}>
            <span>
              <i aria-hidden="true">◆</i> сигнал +10
            </span>
            <span>
              <i aria-hidden="true">✦</i> энергия +25
            </span>
            <span>
              <i aria-hidden="true">×</i> помеха −1
            </span>
          </div>
        </aside>

        <div className={style.deviceWrap} id="game">
          <div className={style.device}>
            <div className={style.deviceTop}>
              <span>ЭЛЕКТРОНИКА</span>
              <span>ИМ-84</span>
            </div>
            <div className={style.screenFrame}>
              <div className={style.screen}>
                <div className={style.screenGrid} aria-hidden="true" />
                <div className={style.hud}>
                  <span>
                    SCORE <strong>{String(score).padStart(4, '0')}</strong>
                  </span>
                  <span>LV {String(getLevel(score)).padStart(2, '0')}</span>
                  <span className={style.lives} aria-label={`Энергия: ${lives}`}>
                    {Array.from({ length: GAME_CONFIG.startingLives }, (_, index) => (
                      <i key={index} className={classNames(index < lives && style.lifeActive)} />
                    ))}
                  </span>
                </div>

                <div className={style.playfield}>
                  {Array.from({ length: GAME_CONFIG.laneCount }, (_, lane) => (
                    <div className={style.lane} key={lane} aria-hidden="true" />
                  ))}
                  {items.map((item) => (
                    <div
                      aria-label={ITEM_LABELS[item.kind]}
                      className={classNames(style.item, style[item.kind])}
                      key={item.id}
                      style={{
                        left: `${(item.lane + 0.5) * (100 / GAME_CONFIG.laneCount)}%`,
                        top: `${item.y}%`,
                      }}
                    >
                      {item.kind === 'signal' && <span>◆</span>}
                      {item.kind === 'core' && <span>✦</span>}
                      {item.kind === 'glitch' && <span>×</span>}
                    </div>
                  ))}
                  <div
                    className={style.ship}
                    style={{ left: `${(playerLane + 0.5) * 25}%`, top: `${GAME_CONFIG.collisionStart}%` }}
                    aria-label="Приёмник"
                  >
                    <i />
                    <span />
                  </div>

                  {status !== 'playing' && (
                    <div className={style.overlay}>
                      {status === 'start' && (
                        <>
                          <span className={style.overlayCode}>Готово к запуску</span>
                          <h2>ОРБИТА-84</h2>
                          <p className={style.startDescription}>
                            <span>Ловите сигналы ◆</span>
                            <span>Избегайте помех ×</span>
                          </p>
                          <div className={style.startGuide}>
                            <span>Движение</span>
                            <span>3 жизни</span>
                          </div>
                          <button type="button" className={style.startButton} onClick={startGame}>
                            Играть
                          </button>
                          <small className={style.startShortcut}>Enter или кнопка «Играть»</small>
                        </>
                      )}
                      {status === 'paused' && (
                        <>
                          <span className={style.overlayCode}>Приём приостановлен</span>
                          <h2>Пауза</h2>
                          <button type="button" onClick={togglePause}>
                            Продолжить
                          </button>
                        </>
                      )}
                      {status === 'gameover' && (
                        <>
                          <span className={style.overlayCode}>Миссия завершена</span>
                          <h2>{String(score).padStart(4, '0')}</h2>
                          <p>Лучший сигнал: {String(bestScore).padStart(4, '0')}</p>
                          <button type="button" onClick={startGame}>
                            Ещё раз
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className={style.ticker} aria-live="polite">
                  <span>{message}</span>
                  <span>Серия {String(combo).padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            <div className={style.deviceInfo}>
              <span>Космическая связь</span>
              <strong>{GAME_CONFIG.title}</strong>
              <span>ЖК-экран</span>
            </div>
            <div className={style.controls}>
              <button
                type="button"
                className={classNames(style.switchButton, style.pauseButton)}
                onClick={togglePause}
                disabled={status === 'start' || status === 'gameover'}
              >
                Пауза
              </button>
              <div className={style.moveControls} aria-label="Управление движением">
                <div className={style.moveControl}>
                  <button
                    type="button"
                    className={style.roundButton}
                    onPointerDown={() => movePlayer(-1)}
                    aria-label="Двигаться влево"
                  >
                    <span>←</span>
                  </button>
                  <small>A / ←</small>
                </div>
                <div className={style.moveControl}>
                  <button
                    type="button"
                    className={style.roundButton}
                    onPointerDown={() => movePlayer(1)}
                    aria-label="Двигаться вправо"
                  >
                    <span>→</span>
                  </button>
                  <small>D / →</small>
                </div>
              </div>
              <button
                type="button"
                className={classNames(style.switchButton, style.soundButton, soundEnabled && style.switchActive)}
                onClick={() => setSoundEnabled((current) => !current)}
                aria-pressed={soundEnabled}
              >
                Звук {soundEnabled ? 'вкл' : 'выкл'}
              </button>
            </div>
            <div className={style.speaker} aria-hidden="true">
              {Array.from({ length: 15 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
          <div className={style.deviceShadow} aria-hidden="true" />
        </div>

        <aside className={style.manual} aria-label="Управление">
          <div className={style.manualNumber} aria-hidden="true">
            <small>МОДЕЛЬ</small>
            84
          </div>
          <div className={style.missionScore} aria-live="polite">
            <div>
              <span>ТЕКУЩИЙ СЧЁТ</span>
              <strong>{String(score).padStart(4, '0')}</strong>
            </div>
            <div>
              <span>УРОВЕНЬ</span>
              <strong>{String(getLevel(score)).padStart(2, '0')}</strong>
            </div>
          </div>
          <h2>
            ПАНЕЛЬ
            <br />
            ПИЛОТА
          </h2>
          <p className={style.archiveNote}>
            <b>ОРБИТА-84</b> — модель портативного космического приёмника из альтернативного 1984 года.
          </p>
          <ol>
            <li>
              <span>01</span>
              <p>
                Перемещайте приёмник клавишами <b>A / D</b> или стрелками.
              </p>
            </li>
            <li>
              <span>02</span>
              <p>Каждые 5 сигналов включают множитель очков.</p>
            </li>
            <li>
              <span>03</span>
              <p>
                Нажмите <b>P</b> или пробел, чтобы поставить игру на паузу.
              </p>
            </li>
          </ol>
          <div className={style.achievements}>
            <span className={style.achievementsTitle}>ЗНАКИ МИССИИ</span>
            <div className={classNames(score >= 10 && style.achievementUnlocked)}>
              <i>01</i>
              <span>ПЕРВЫЙ КОНТАКТ</span>
              <b>10</b>
            </div>
            <div className={classNames(score >= 60 && style.achievementUnlocked)}>
              <i>02</i>
              <span>ЧИСТАЯ ЧАСТОТА</span>
              <b>60</b>
            </div>
            <div className={classNames(score >= 120 && style.achievementUnlocked)}>
              <i>03</i>
              <span>ГЛУБОКИЙ КОСМОС</span>
              <b>120</b>
            </div>
          </div>
          <div className={style.bestScore}>
            <span>ЛИЧНЫЙ РЕКОРД</span>
            <strong>{String(bestScore).padStart(4, '0')}</strong>
          </div>
        </aside>
      </section>
      <footer>
        <span>СДЕЛАНО НА ЗЕМЛЕ · 2026</span>
        <span>КЛАВИАТУРА · МЫШЬ · TOUCH</span>
      </footer>
    </main>
  );
};
