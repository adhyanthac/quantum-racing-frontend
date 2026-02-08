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

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    localStorage.setItem('quantumRacingSettings', JSON.stringify(newSettings));
  };

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

    gameEndedRef.current = false;
    scoreSavedRef.current = false;
    setGameEnded(false);
    setGameWon(false);
    setFinalScore(0);
    setFinalProgress(0);
    setData(null);

    // Use local for development, remote for production
    const wsUrl = window.location.hostname === 'localhost'
      ? `ws://localhost:8000/ws/${clientId}`
      : `wss://quantum-racing-backend.onrender.com/ws/${clientId}`;

    const ws = new WebSocket(wsUrl);
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

      // H = Enter superposition (Hadamard + CNOT)
      if (key === 'h') {
        wsRef.current.send(JSON.stringify({ action: 'hadamard' }));
      }
      // A or D = Switch lane in Universe A (Pauli-X on qubit A)
      else if (key === 'a' || key === 'd') {
        wsRef.current.send(JSON.stringify({ action: 'pauli_x_A' }));
      }
      // Arrow keys = Switch lane in Universe B (Pauli-X on qubit B)
      else if (key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault();
        wsRef.current.send(JSON.stringify({ action: 'pauli_x_B' }));
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
    gameEndedRef.current = false;
    scoreSavedRef.current = false;
    setData(null);
    setIsPaused(false);
    setGameEnded(false);
    setGameWon(false);
    setFinalScore(0);
    setFinalProgress(0);
    setGameState('MENU');
    setTimeout(() => setGameState('PLAYING'), 50);
  };

  const handleBackToMenu = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    gameEndedRef.current = false;
    scoreSavedRef.current = false;
    setData(null);
    setIsPaused(false);
    setGameEnded(false);
    setGameWon(false);
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
  const inSuperposition = data?.in_superposition ?? false;
  const carA = data?.car_A ?? { lane: 0, left_prob: 1, right_prob: 0 };
  const carB = data?.car_B ?? { lane: 0, left_prob: 1, right_prob: 0 };
  const lasers = data?.lasers ?? [];
  const progress = data?.progress ?? 0;

  return (
    <div className="App">
      {/* Quantum Guide Modal */}
      {showQuantumModal && (
        <div className="modal-overlay" onClick={() => setShowQuantumModal(false)}>
          <div className="modal quantum-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQuantumModal(false)}>✕</button>
            <h2>⚛️ Quantum Guide</h2>

            <div className="modal-section">
              <h3>🎮 Controls</h3>
              <div className="controls-list">
                <div className="control-item">
                  <span className="key-badge">H</span>
                  <span className="control-desc">Enter Superposition (creates entangled Universe B)</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">A / D</span>
                  <span className="control-desc">Switch lane in Universe α (Pauli-X gate)</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">← / →</span>
                  <span className="control-desc">Switch lane in Universe β (Pauli-X gate)</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>⚛️ Quantum Mechanics</h3>
              <div className="quantum-explanation">
                <div className="quantum-concept">
                  <h4>🌀 Superposition (H Gate)</h4>
                  <p className="readable-text">
                    Press <strong>H</strong> to apply a Hadamard gate + CNOT, creating an <strong>entangled Bell state</strong>.
                    Your car now exists in BOTH universes simultaneously!
                  </p>
                </div>
                <div className="quantum-concept">
                  <h4>🔗 Entanglement (CNOT)</h4>
                  <p className="readable-text">
                    The two cars are <strong>quantum entangled</strong>. Their fates are correlated -
                    what happens to one affects the probability of the other!
                  </p>
                </div>
                <div className="quantum-concept">
                  <h4>📉 Measurement (Born Rule)</h4>
                  <p className="readable-text">
                    When a laser reaches your car, it's a <strong>quantum measurement</strong>.
                    The probability of passing or crashing follows the <strong>Born rule</strong>!
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>🎯 Strategy</h3>
              <p className="readable-text">
                You <strong>MUST</strong> use superposition to survive! In classical mode, lasers are unavoidable.
                In superposition, manipulate both universes to maximize your survival probability!
              </p>
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
                <label className="setting-label">Player Name</label>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.playerName}
                  onChange={(e) => saveSettings({ ...settings, playerName: e.target.value })}
                  maxLength={20}
                  placeholder="Enter your name"
                />
              </div>
              <div className="setting-item">
                <label className="setting-label">Car Color</label>
                <div className="color-options">
                  {['red', 'blue', 'green', 'yellow', 'purple'].map(color => (
                    <button
                      key={color}
                      className={`color-btn ${color} ${settings.carColor === color ? 'selected' : ''}`}
                      onClick={() => saveSettings({ ...settings, carColor: color })}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div className="setting-item">
                <label className="setting-label">Game Speed</label>
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

          <h1 className="title">QUANTUM RACING</h1>

          <div className="bottom-menu">
            <div className="menu-icons">
              <div className="menu-icon-btn" onClick={() => setShowSettingsModal(true)}>
                <div className="icon icon-settings">⚙️</div>
                <span className="label">Settings</span>
              </div>
              <div className="menu-icon-btn" onClick={() => setShowQuantumModal(true)}>
                <div className="icon icon-quantum">⚛️</div>
                <span className="label">Guide</span>
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
                  <div className="stat-item">
                    <span className="stat-label">H Gate Uses</span>
                    <span className="stat-value">{data?.hadamard_uses || 0}</span>
                  </div>
                </div>
                <div className="game-over-btns">
                  <button className="restart-btn" onClick={handleRestart}>🔄 TRY AGAIN</button>
                  <button className="menu-btn" onClick={handleBackToMenu}>🏠 MENU</button>
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
                <button className="menu-btn" onClick={handleBackToMenu}>🏠 MENU</button>
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
              ⚛️ ENTANGLED STATE
            </div>
          )}

          {/* Game Area - Two Universes */}
          <div className={`game-area ${inSuperposition ? 'split' : ''}`}>
            {/* Universe A */}
            <div className="pane">
              <div className="universe-label universe-a">UNIVERSE α</div>
              <div className="controls-hint">A / D</div>

              <div className="lane-lines">
                <div className="lane-line left"></div>
                <div className="lane-line center"></div>
                <div className="lane-line right"></div>
              </div>

              <div className="divider"></div>

              {/* Universe A Lasers */}
              {lasers.filter(l => l.universe === 'A').map((laser) => (
                <div
                  key={laser.id}
                  className="laser"
                  style={{
                    top: `${laser.y}%`,
                    left: laser.lane === 0 ? '5%' : '55%',
                    width: '40%'
                  }}
                />
              ))}

              {/* Universe A Car */}
              <div
                className={`car-container ${inSuperposition ? 'superposition-car' : ''}`}
                style={{
                  left: carA.lane === 0 ? '25%' : '75%',
                  opacity: inSuperposition ? 0.6 : 1
                }}
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
                {inSuperposition && (
                  <div className="probability-badge">
                    {Math.round(carA.lane === 0 ? carA.left_prob * 100 : carA.right_prob * 100)}%
                  </div>
                )}
              </div>
            </div>

            {/* Universe B (only visible in superposition) */}
            {inSuperposition && (
              <div className="pane">
                <div className="universe-label universe-b">UNIVERSE β</div>
                <div className="controls-hint">← / →</div>

                <div className="lane-lines">
                  <div className="lane-line left"></div>
                  <div className="lane-line center"></div>
                  <div className="lane-line right"></div>
                </div>

                <div className="divider"></div>

                {/* Universe B Lasers */}
                {lasers.filter(l => l.universe === 'B').map((laser) => (
                  <div
                    key={laser.id}
                    className="laser"
                    style={{
                      top: `${laser.y}%`,
                      left: laser.lane === 0 ? '5%' : '55%',
                      width: '40%'
                    }}
                  />
                ))}

                {/* Universe B Car */}
                <div
                  className="car-container superposition-car"
                  style={{
                    left: carB.lane === 0 ? '25%' : '75%',
                    opacity: 0.6
                  }}
                >
                  <div className="car-body blue-car">
                    <div className="car-top"></div>
                    <div className="car-window"></div>
                    <div className="car-hood"></div>
                    <div className="car-wheel wheel-fl"></div>
                    <div className="car-wheel wheel-fr"></div>
                    <div className="car-wheel wheel-bl"></div>
                    <div className="car-wheel wheel-br"></div>
                  </div>
                  <div className="probability-badge">
                    {Math.round(carB.lane === 0 ? carB.left_prob * 100 : carB.right_prob * 100)}%
                  </div>
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
              <div className="control-key"><span>A/D</span> Universe α</div>
              {inSuperposition && <div className="control-key"><span>←/→</span> Universe β</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;