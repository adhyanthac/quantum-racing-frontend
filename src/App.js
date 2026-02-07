import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const GAME_URL = 'https://quantum-racing.vercel.app';

const DEFAULT_SETTINGS = {
  playerName: 'Quantum Racer',
  carColor: 'red',
  gameSpeed: 'normal',
};

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [data, setData] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuantumModal, setShowQuantumModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [scores, setScores] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalProgress, setFinalProgress] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [clientId] = useState(() => Math.random().toString(36).substring(7));

  const wsRef = useRef(null);
  const gameEndedRef = useRef(false);
  const scoreSavedRef = useRef(false);
  const settingsRef = useRef(settings);

  // Keep settingsRef in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load settings and scores from localStorage
  useEffect(() => {
    const savedScores = localStorage.getItem('quantumRacingScores');
    if (savedScores) setScores(JSON.parse(savedScores));

    const savedSettings = localStorage.getItem('quantumRacingSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      settingsRef.current = parsed;
    }
  }, []);

  // Save settings
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    localStorage.setItem('quantumRacingSettings', JSON.stringify(newSettings));
  };

  // Save score using ref to avoid dependency issues
  const saveScoreToStorage = useCallback((score, won, playerName) => {
    const newScore = {
      score,
      date: new Date().toLocaleString(),
      id: Date.now(),
      won,
      playerName
    };
    setScores(prev => {
      const updatedScores = [newScore, ...prev].slice(0, 10);
      localStorage.setItem('quantumRacingScores', JSON.stringify(updatedScores));
      return updatedScores;
    });
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    // Reset state
    gameEndedRef.current = false;
    scoreSavedRef.current = false;
    setGameEnded(false);
    setGameWon(false);
    setFinalScore(0);
    setFinalProgress(0);
    setData(null);

    const ws = new WebSocket(`wss://quantum-racing-backend.onrender.com/ws/${clientId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        action: 'set_speed',
        speed: settingsRef.current.gameSpeed
      }));
    };

    ws.onmessage = (e) => {
      if (gameEndedRef.current) return;

      const msg = JSON.parse(e.data);
      const gameData = msg.data;

      if (msg.type === 'game_state') {
        setData(gameData);
        setIsPaused(gameData.paused || false);
      }

      if (msg.type === 'game_over' || msg.type === 'game_won') {
        gameEndedRef.current = true;
        setFinalScore(gameData.score);
        setFinalProgress(gameData.progress);
        setGameWon(msg.type === 'game_won');
        setGameEnded(true);
        setData(gameData);

        if (!scoreSavedRef.current && gameData.score > 0) {
          scoreSavedRef.current = true;
          saveScoreToStorage(gameData.score, msg.type === 'game_won', settingsRef.current.playerName);
        }

        console.log('Game ended, closing WebSocket');
        ws.close();
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => console.log('WebSocket closed');

    return () => {
      gameEndedRef.current = true;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [gameState, clientId, saveScoreToStorage]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (gameState !== 'PLAYING' || gameEndedRef.current) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const key = e.key.toLowerCase();

      // H = Enter superposition
      if (key === 'h') {
        wsRef.current.send(JSON.stringify({ action: 'superposition' }));
      }
      // A = Collapse to lane 0 (left)
      else if (key === 'a') {
        wsRef.current.send(JSON.stringify({ action: 'collapse_left' }));
      }
      // D = Collapse to lane 1 (right)
      else if (key === 'd') {
        wsRef.current.send(JSON.stringify({ action: 'collapse_right' }));
      }
      // Arrow keys = Switch lane (classical mode)
      else if (key === 'arrowleft' || key === 'arrowright') {
        wsRef.current.send(JSON.stringify({ action: 'switch' }));
      }
      // Pause
      else if (key === 'p' || key === 'escape') {
        wsRef.current.send(JSON.stringify({ action: 'pause' }));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const handlePause = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !gameEndedRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'pause' }));
    }
  };

  const handleRestart = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setData(null);
    setIsPaused(false);
    setGameEnded(false);
    setGameWon(false);
    setFinalScore(0);
    setFinalProgress(0);
    gameEndedRef.current = false;
    scoreSavedRef.current = false;
    setGameState('MENU');
    setTimeout(() => setGameState('PLAYING'), 50);
  };

  const handleBackToMenu = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setData(null);
    setIsPaused(false);
    setGameEnded(false);
    setGameWon(false);
    gameEndedRef.current = false;
    scoreSavedRef.current = false;
    setGameState('MENU');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(GAME_URL);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.log('Failed to copy');
    }
  };

  const getCarColorClass = () => {
    const colorMap = {
      'red': 'red-car',
      'blue': 'blue-car',
      'green': 'green-car',
      'yellow': 'yellow-car',
      'purple': 'purple-car',
    };
    return colorMap[settings.carColor] || 'red-car';
  };

  // Game data
  const currentLane = data?.lane ?? 0;
  const inSuperposition = data?.in_superposition ?? false;
  const lasers = data?.lasers ?? [];
  const progress = data?.progress ?? 0;

  return (
    <div className="App">
      {/* Quantum Guide Modal */}
      {showQuantumModal && (
        <div className="modal-overlay" onClick={() => setShowQuantumModal(false)}>
          <div className="modal quantum-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQuantumModal(false)}>✕</button>
            <h2>⚛️ Quantum Racing Guide</h2>

            <div className="modal-section">
              <h3>🎮 Controls</h3>
              <div className="controls-list">
                <div className="control-item">
                  <span className="key-badge">H</span>
                  <span className="control-desc">Enter Superposition (be in BOTH lanes!)</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">A</span>
                  <span className="control-desc">Collapse to LEFT lane</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">D</span>
                  <span className="control-desc">Collapse to RIGHT lane</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">← / →</span>
                  <span className="control-desc">Switch lanes (when classical)</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">P / Esc</span>
                  <span className="control-desc">Pause the game</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>🎯 How to Win</h3>
              <p className="readable-text">
                <strong>Survive 60 seconds!</strong> Dodge incoming lasers by switching lanes or using quantum superposition strategically.
              </p>
            </div>

            <div className="modal-section">
              <h3>⚛️ The Real Physics</h3>
              <div className="quantum-explanation">
                <div className="quantum-concept">
                  <h4>🌀 Superposition</h4>
                  <p className="readable-text">
                    Press <strong>H</strong> to enter superposition. Your car exists in <strong>BOTH lanes</strong> simultaneously with 50% probability each.
                    This is real quantum mechanics - particles can be in multiple states at once!
                  </p>
                </div>
                <div className="quantum-concept">
                  <h4>📉 Measurement (Collapse)</h4>
                  <p className="readable-text">
                    Press <strong>A or D</strong> to "measure" your position and collapse to that lane.
                    <strong>WARNING:</strong> If a laser reaches you while in superposition, you collapse randomly (50/50 chance)!
                  </p>
                </div>
                <div className="quantum-concept">
                  <h4>🧠 Strategy</h4>
                  <p className="readable-text">
                    Enter superposition when you see a laser, then <strong>collapse to the safe lane</strong> before it hits.
                    This teaches: quantum states are uncertain until measured!
                  </p>
                </div>
              </div>
            </div>

            <button className="modal-btn" onClick={() => setShowQuantumModal(false)}>Got it!</button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
            <h2>⚙️ Settings</h2>
            <div className="settings-content">
              <div className="setting-item">
                <label>Player Name</label>
                <input
                  type="text"
                  value={settings.playerName}
                  onChange={(e) => saveSettings({ ...settings, playerName: e.target.value })}
                  maxLength={20}
                />
              </div>
              <div className="setting-item">
                <label>Car Color</label>
                <div className="color-options">
                  {['red', 'blue', 'green', 'yellow', 'purple'].map(color => (
                    <button
                      key={color}
                      className={`color-btn ${color} ${settings.carColor === color ? 'selected' : ''}`}
                      onClick={() => saveSettings({ ...settings, carColor: color })}
                    />
                  ))}
                </div>
              </div>
              <div className="setting-item">
                <label>Game Speed</label>
                <div className="speed-options">
                  {['slow', 'normal', 'fast'].map(speed => (
                    <button
                      key={speed}
                      className={`speed-btn ${settings.gameSpeed === speed ? 'selected' : ''}`}
                      onClick={() => saveSettings({ ...settings, gameSpeed: speed })}
                    >
                      {speed.charAt(0).toUpperCase() + speed.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="modal-btn" onClick={() => setShowSettingsModal(false)}>Save</button>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal stats-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowStatsModal(false)}>✕</button>
            <h2>📊 High Scores</h2>
            {scores.length === 0 ? (
              <p className="no-scores readable-text">No scores yet. Play to set records!</p>
            ) : (
              <div className="scores-list">
                {scores.map((s, i) => (
                  <div key={s.id} className={`score-item ${s.won ? 'won' : ''}`}>
                    <span className="rank">#{i + 1}</span>
                    <span className="score-value">{s.score}</span>
                    <span className="score-date">{s.date}</span>
                    {s.won && <span className="win-badge">🏆</span>}
                  </div>
                ))}
              </div>
            )}
            <button className="modal-btn" onClick={() => setShowStatsModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Menu Screen */}
      {gameState === 'MENU' ? (
        <div className="menu-screen">
          <div className="menu-bg">
            <img
              src="https://4kwallpapers.com/images/wallpapers/f1-cars-race-track-2880x1800-13489.jpg"
              alt="F1 Night Race"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="menu-bg-overlay"></div>
          </div>

          <h1 className="title">Q-RACING PRO</h1>
          <p className="subtitle">QUANTUM PHYSICS RACING</p>

          <div className="bottom-menu">
            <div className="menu-icons">
              <div className="menu-icon-btn" onClick={() => setShowSettingsModal(true)}>
                <div className="icon icon-settings">⚙️</div>
                <span className="label">Setting</span>
              </div>
              <div className="menu-icon-btn" onClick={() => setShowQuantumModal(true)}>
                <div className="icon icon-quantum">⚛️</div>
                <span className="label">Quantum</span>
              </div>
              <div className="menu-icon-btn" onClick={() => setShowStatsModal(true)}>
                <div className="icon icon-more">📊</div>
                <span className="label">Stats</span>
              </div>
              <div className="menu-icon-btn" onClick={handleShare}>
                <div className="icon icon-share">{copySuccess ? '✓' : '🔗'}</div>
                <span className="label">{copySuccess ? 'Copied!' : 'Share'}</span>
              </div>
            </div>

            <button className="start-btn" onClick={() => setGameState('PLAYING')}>
              START
            </button>
          </div>
        </div>
      ) : (
        /* Game Screen */
        <div className="game-container">
          {/* Game Over Overlay */}
          {gameEnded && (
            <div className="game-over-overlay">
              <div className="game-over-content">
                <h2 className={gameWon ? 'win-title' : 'lose-title'}>
                  {gameWon ? '🏆 RACE COMPLETE!' : '💥 GAME OVER'}
                </h2>
                <div className="final-stats">
                  <div className="stat-item">
                    <span className="stat-label">Score</span>
                    <span className="stat-value">{finalScore}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Progress</span>
                    <span className="stat-value">{Math.round(finalProgress)}%</span>
                  </div>
                </div>
                <div className="game-over-btns">
                  <button className="restart-btn" onClick={handleRestart}>🔄 TRY AGAIN</button>
                  <button className="menu-btn" onClick={handleBackToMenu}>🏠 MAIN MENU</button>
                </div>
              </div>
            </div>
          )}

          {/* Pause Overlay */}
          {isPaused && !gameEnded && (
            <div className="pause-overlay">
              <div className="pause-content">
                <h2>⏸️ PAUSED</h2>
                <button className="resume-btn" onClick={handlePause}>▶️ RESUME</button>
                <button className="menu-btn" onClick={handleBackToMenu}>🏠 MAIN MENU</button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>

          {/* Pause Button */}
          {!gameEnded && (
            <button className="pause-btn" onClick={handlePause}>
              {isPaused ? '▶' : '⏸'}
            </button>
          )}

          {/* Superposition Indicator */}
          {inSuperposition && !gameEnded && (
            <div className="superposition-active">
              ⚛️ SUPERPOSITION - Choose A or D!
            </div>
          )}

          {/* Game Track */}
          <div className="track">
            <div className="lane-divider"></div>

            {/* Lasers */}
            {lasers.map((laser) => (
              <div
                key={laser.id}
                className="laser"
                style={{
                  top: `${laser.y}%`,
                  left: laser.lane === 0 ? '10%' : '60%',
                  width: '30%'
                }}
              />
            ))}

            {/* Car(s) */}
            {inSuperposition ? (
              /* Superposition: Show ghost cars in BOTH lanes */
              <>
                <div
                  className="car-container superposition-car"
                  style={{ left: '25%', opacity: 0.5 }}
                >
                  <div className={`car-body ${getCarColorClass()}`}>
                    <div className="car-top"></div>
                    <div className="car-window"></div>
                    <div className="car-hood"></div>
                    <div className="car-wheel wheel-fl"></div>
                    <div className="car-wheel wheel-fr"></div>
                    <div className="car-wheel wheel-bl"></div>
                    <div className="car-wheel wheel-br"></div>
                  </div>
                  <div className="lane-label">A - LEFT</div>
                </div>
                <div
                  className="car-container superposition-car"
                  style={{ left: '75%', opacity: 0.5 }}
                >
                  <div className={`car-body ${getCarColorClass()}`}>
                    <div className="car-top"></div>
                    <div className="car-window"></div>
                    <div className="car-hood"></div>
                    <div className="car-wheel wheel-fl"></div>
                    <div className="car-wheel wheel-fr"></div>
                    <div className="car-wheel wheel-bl"></div>
                    <div className="car-wheel wheel-br"></div>
                  </div>
                  <div className="lane-label">D - RIGHT</div>
                </div>
              </>
            ) : (
              /* Classical: One solid car */
              <div
                className="car-container"
                style={{ left: currentLane === 0 ? '25%' : '75%' }}
              >
                <div className={`car-body ${getCarColorClass()}`}>
                  <div className="car-top"></div>
                  <div className="car-window"></div>
                  <div className="car-hood"></div>
                  <div className="car-wheel wheel-fl"></div>
                  <div className="car-wheel wheel-fr"></div>
                  <div className="car-wheel wheel-bl"></div>
                  <div className="car-wheel wheel-br"></div>
                </div>
              </div>
            )}
          </div>

          {/* Score HUD */}
          <div className="score-hud">SCORE: {data?.score || 0}</div>

          {/* Controls HUD */}
          {!gameEnded && (
            <div className="controls-hud">
              <div className="control-key"><span>H</span> Superposition</div>
              <div className="control-key"><span>A/D</span> Collapse</div>
              <div className="control-key"><span>←/→</span> Switch</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;