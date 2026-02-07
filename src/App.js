import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const GAME_URL = 'https://quantum-racing.vercel.app';

// Default settings
const DEFAULT_SETTINGS = {
  playerName: 'Quantum Racer',
  carColor: 'red',
  gameSpeed: 'normal', // slow, normal, fast
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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [clientId] = useState(() => Math.random().toString(36).substring(7));
  const wsRef = useRef(null);
  const gameEndedRef = useRef(false);

  // Load settings and scores from localStorage
  useEffect(() => {
    const savedScores = localStorage.getItem('quantumRacingScores');
    if (savedScores) setScores(JSON.parse(savedScores));

    const savedSettings = localStorage.getItem('quantumRacingSettings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save settings
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('quantumRacingSettings', JSON.stringify(newSettings));
  };

  // Save score when game ends
  const saveScore = useCallback((score, won) => {
    const newScore = {
      score,
      date: new Date().toLocaleString(),
      id: Date.now(),
      won,
      playerName: settings.playerName
    };
    const updatedScores = [newScore, ...scores].slice(0, 10);
    setScores(updatedScores);
    localStorage.setItem('quantumRacingScores', JSON.stringify(updatedScores));
  }, [scores, settings.playerName]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      setGameEnded(false);
      gameEndedRef.current = false;

      // Add speed parameter to WebSocket URL
      const speedParam = settings.gameSpeed;
      const ws = new WebSocket(`wss://quantum-racing-backend.onrender.com/ws/${clientId}?speed=${speedParam}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send settings to backend
        ws.send(JSON.stringify({
          action: 'set_speed',
          speed: settings.gameSpeed
        }));
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        const gameData = msg.data;
        setData(gameData);
        setIsPaused(gameData.paused || false);

        // Game ended - DON'T auto restart
        if ((msg.type === 'game_over' || msg.type === 'game_won') && !gameEndedRef.current) {
          gameEndedRef.current = true;
          setGameEnded(true);
          if (gameData.score > 0) {
            saveScore(gameData.score, msg.type === 'game_won');
          }
        }
      };

      ws.onerror = (err) => console.error('WebSocket error:', err);
      return () => ws.close();
    }
  }, [gameState, clientId, settings.gameSpeed, saveScore]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!wsRef.current || gameState !== 'PLAYING') return;

      // Don't process any keys if game has ended
      if (gameEnded || gameEndedRef.current) return;

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        wsRef.current.send(JSON.stringify({ action: 'pause' }));
        return;
      }

      if (isPaused) return;

      if (e.key.toLowerCase() === 'h') {
        wsRef.current.send(JSON.stringify({ action: 'hadamard' }));
      }
      if (['a', 'd'].includes(e.key.toLowerCase())) {
        wsRef.current.send(JSON.stringify({ action: 'pauli_x', target: 'A' }));
      }
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        wsRef.current.send(JSON.stringify({ action: 'pauli_x', target: 'B' }));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, isPaused, gameEnded]);

  const getProbs = () => {
    if (!data) return { a: [1, 0], b: [1, 0] };
    const p = data.quantum_vehicle.state_vector.map(c => Math.pow(c.real, 2) + Math.pow(c.imag, 2));
    return { a: [p[0] + p[1], p[2] + p[3]], b: [p[0] + p[2], p[1] + p[3]] };
  };

  const probs = getProbs();
  const inSuperposition = data?.quantum_vehicle?.in_superposition;
  const progress = data?.progress || 0;
  const gameWon = data?.game_won || false;

  const handlePause = () => {
    if (wsRef.current && !gameEnded) {
      wsRef.current.send(JSON.stringify({ action: 'pause' }));
    }
  };

  const handleRestart = () => {
    // Close current connection and start fresh
    if (wsRef.current) {
      wsRef.current.close();
    }
    setData(null);
    setIsPaused(false);
    setGameEnded(false);
    gameEndedRef.current = false;
    // Trigger reconnect by toggling state
    setGameState('MENU');
    setTimeout(() => setGameState('PLAYING'), 100);
  };

  const handleBackToMenu = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setData(null);
    setIsPaused(false);
    setGameEnded(false);
    gameEndedRef.current = false;
    setGameState('MENU');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(GAME_URL);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = GAME_URL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const clearScores = () => {
    setScores([]);
    localStorage.removeItem('quantumRacingScores');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get car color class based on settings
  const getCarColorClass = () => {
    return `${settings.carColor}-car`;
  };

  return (
    <div className="App">
      <div className="scanlines"></div>

      {/* ===== SETTINGS MODAL ===== */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
            <h2>⚙️ Settings</h2>

            <div className="settings-section">
              <h3>👤 Player Name</h3>
              <input
                type="text"
                className="settings-input"
                value={settings.playerName}
                onChange={(e) => saveSettings({ ...settings, playerName: e.target.value })}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            <div className="settings-section">
              <h3>🎨 Car Color (Universe α)</h3>
              <div className="color-options">
                {['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'].map(color => (
                  <button
                    key={color}
                    className={`color-btn ${color} ${settings.carColor === color ? 'selected' : ''}`}
                    onClick={() => saveSettings({ ...settings, carColor: color })}
                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                  />
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>⚡ Game Speed</h3>
              <div className="speed-options">
                <button
                  className={`speed-btn ${settings.gameSpeed === 'slow' ? 'selected' : ''}`}
                  onClick={() => saveSettings({ ...settings, gameSpeed: 'slow' })}
                >
                  🐢 Slow
                </button>
                <button
                  className={`speed-btn ${settings.gameSpeed === 'normal' ? 'selected' : ''}`}
                  onClick={() => saveSettings({ ...settings, gameSpeed: 'normal' })}
                >
                  🚗 Normal
                </button>
                <button
                  className={`speed-btn ${settings.gameSpeed === 'fast' ? 'selected' : ''}`}
                  onClick={() => saveSettings({ ...settings, gameSpeed: 'fast' })}
                >
                  🏎️ Fast
                </button>
              </div>
              <p className="speed-description">
                {settings.gameSpeed === 'slow' && 'Relaxed pace - great for learning quantum mechanics!'}
                {settings.gameSpeed === 'normal' && 'Balanced challenge - the standard experience.'}
                {settings.gameSpeed === 'fast' && 'Intense action - for quantum racing experts!'}
              </p>
            </div>

            <div className="settings-section">
              <h3>🔊 Sound</h3>
              <p className="coming-soon-text">Coming soon!</p>
            </div>

            <button className="modal-btn" onClick={() => setShowSettingsModal(false)}>Save & Close</button>
          </div>
        </div>
      )}

      {/* ===== QUANTUM MODAL ===== */}
      {showQuantumModal && (
        <div className="modal-overlay" onClick={() => setShowQuantumModal(false)}>
          <div className="modal quantum-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQuantumModal(false)}>✕</button>
            <h2>⚛️ Quantum Racing Guide</h2>

            <div className="modal-section">
              <h3>🎮 How to Play</h3>
              <div className="controls-list">
                <div className="control-item">
                  <span className="key-badge">H</span>
                  <span className="control-desc">Enter Superposition (split into 2 universes)</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">A / D</span>
                  <span className="control-desc">Switch lanes in Universe α</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">← / →</span>
                  <span className="control-desc">Switch lanes in Universe β</span>
                </div>
                <div className="control-item">
                  <span className="key-badge">P / Esc</span>
                  <span className="control-desc">Pause the game</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>🎯 Objective</h3>
              <p className="readable-text">Survive for <strong>60 seconds</strong> to complete the race! Avoid incoming lasers using quantum mechanics. The progress bar shows how far you've come.</p>
            </div>

            <div className="modal-section">
              <h3>⚛️ The Quantum Physics</h3>
              <div className="quantum-explanation">
                <div className="quantum-concept">
                  <h4>🌀 Superposition</h4>
                  <p className="readable-text">Just like Schrödinger's cat, your car exists in <strong>multiple lanes simultaneously</strong> until observed. Press H to enter this quantum state!</p>
                </div>
                <div className="quantum-concept">
                  <h4>🔗 Entanglement</h4>
                  <p className="readable-text">In superposition, your car splits across <strong>two parallel universes</strong> (α and β). The cars are quantum entangled - what happens to one affects the other!</p>
                </div>
                <div className="quantum-concept">
                  <h4>🎲 Probability</h4>
                  <p className="readable-text">The <strong>opacity of each car</strong> shows its probability of being there. When a laser approaches, collision is determined probabilistically based on your quantum state.</p>
                </div>
                <div className="quantum-concept">
                  <h4>📉 Wave Function Collapse</h4>
                  <p className="readable-text">When you dodge a laser, the quantum state <strong>collapses</strong> - your car returns to a single definite classical state in Universe α.</p>
                </div>
              </div>
            </div>

            <button className="modal-btn" onClick={() => setShowQuantumModal(false)}>Got it!</button>
          </div>
        </div>
      )}

      {/* ===== STATS MODAL ===== */}
      {showStatsModal && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal stats-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowStatsModal(false)}>✕</button>
            <h2>📊 Game Statistics</h2>

            {scores.length === 0 ? (
              <div className="no-scores">
                <p className="readable-text">No games played yet!</p>
                <p className="readable-text">Start playing to see your scores here.</p>
              </div>
            ) : (
              <>
                <div className="stats-summary">
                  <div className="stat-box">
                    <span className="stat-value">{Math.max(...scores.map(s => s.score))}</span>
                    <span className="stat-label">High Score</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{scores.length}</span>
                    <span className="stat-label">Games</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{scores.filter(s => s.won).length}</span>
                    <span className="stat-label">Wins</span>
                  </div>
                </div>

                <h3>Recent Games</h3>
                <div className="scores-list">
                  {scores.map((s, i) => (
                    <div key={s.id} className={`score-item ${s.won ? 'won' : ''}`}>
                      <span className="score-rank">#{i + 1}</span>
                      <span className="score-player">{s.playerName || 'Unknown'}</span>
                      <span className="score-value">{s.score}</span>
                      <span className="score-status">{s.won ? '🏆' : '💥'}</span>
                      <span className="score-date">{s.date}</span>
                    </div>
                  ))}
                </div>

                <button className="clear-scores-btn" onClick={clearScores}>Clear All Scores</button>
              </>
            )}

            <button className="modal-btn" onClick={() => setShowStatsModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ===== MENU SCREEN ===== */}
      {gameState === 'MENU' ? (
        <div className="menu-screen">
          <div className="menu-bg">
            {/* F1 Night Race Background */}
            <img
              src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1920&q=80"
              alt="Racing Background"
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
              <div className="start-btn-main">START</div>
              <div className="start-btn-stripes">
                <div className="stripe"></div>
                <div className="stripe"></div>
                <div className="stripe"></div>
              </div>
            </button>
          </div>

          <p className="credits">DR. XU GROUP | TEXAS A&M PHYSICS</p>
          {settings.playerName !== DEFAULT_SETTINGS.playerName && (
            <p className="player-greeting">Welcome, {settings.playerName}!</p>
          )}
        </div>
      ) : (
        <div className="game-wrapper">
          {/* Pause Overlay */}
          {isPaused && !gameEnded && (
            <div className="pause-overlay">
              <h2>⏸️ PAUSED</h2>
              <p>Press P or Esc to resume</p>
              <div className="pause-buttons">
                <button className="resume-btn" onClick={handlePause}>Resume</button>
                <button className="menu-btn" onClick={handleBackToMenu}>Main Menu</button>
              </div>
            </div>
          )}

          {/* Game Over Overlay - Shows game (crash) in background */}
          {gameEnded && (
            <div className="game-over-overlay">
              <div className="game-over-content">
                {gameWon ? (
                  <>
                    <h2 className="win-title">🏆 RACE COMPLETE!</h2>
                    <p className="game-over-player">{settings.playerName}</p>
                    <p className="game-over-score">FINAL SCORE: {data?.score}</p>
                    <p className="win-message">You survived the quantum gauntlet!</p>
                  </>
                ) : (
                  <>
                    <h2 className="lose-title">💥 GAME OVER</h2>
                    <p className="game-over-player">{settings.playerName}</p>
                    <p className="game-over-score">SCORE: {data?.score}</p>
                    <p className="progress-text">Progress: {Math.round(progress)}%</p>
                  </>
                )}
                <div className="game-over-buttons">
                  <button className="restart-btn" onClick={handleRestart}>
                    🔄 TRY AGAIN
                  </button>
                  <button className="menu-btn-alt" onClick={handleBackToMenu}>
                    🏠 MAIN MENU
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game Area - Visible in background when game over */}
          <div className={`game-area ${inSuperposition ? 'split' : 'single'} ${gameEnded ? 'crashed' : ''}`}>

            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <div className="progress-car" style={{ left: `${progress}%` }}>🏎️</div>
              </div>
              <div className="progress-labels">
                <span>START</span>
                <span className="time-display">{formatTime(data?.game_time_seconds || 0)} / 1:00</span>
                <span>FINISH 🏁</span>
              </div>
            </div>

            {/* Pause Button */}
            {!gameEnded && (
              <button className="pause-btn" onClick={handlePause}>
                {isPaused ? '▶' : '⏸'}
              </button>
            )}

            {inSuperposition && !gameEnded && (
              <div className="superposition-active">⚛️ SUPERPOSITION</div>
            )}

            {/* Universe A */}
            <div className="pane">
              <div className="universe-label universe-a">UNIVERSE α</div>

              <div className="lane-lines">
                <div className="lane-line left"></div>
                <div className="lane-line center"></div>
                <div className="lane-line right"></div>
              </div>

              <div className="divider"></div>

              {data?.lasers.filter(l => l.universe === 'A').map((l, i) => (
                <div
                  key={`laser-a-${i}`}
                  className="laser"
                  style={{ top: `${l.y}%`, left: l.lane === 0 ? '1%' : '51%', width: '48%' }}
                />
              ))}

              <div className="car-container" style={{ left: '25%', opacity: probs.a[0] }}>
                <div className={`car-body ${getCarColorClass()}`}>
                  <div className="car-top"></div>
                  <div className="car-window"></div>
                  <div className="car-hood"></div>
                  <div className="car-wheel wheel-fl"></div>
                  <div className="car-wheel wheel-fr"></div>
                  <div className="car-wheel wheel-bl"></div>
                  <div className="car-wheel wheel-br"></div>
                  <div className="car-headlight left"></div>
                  <div className="car-headlight right"></div>
                  <div className="car-taillight left"></div>
                  <div className="car-taillight right"></div>
                </div>
              </div>
              <div className="car-container" style={{ left: '75%', opacity: probs.a[1] }}>
                <div className={`car-body ${getCarColorClass()}`}>
                  <div className="car-top"></div>
                  <div className="car-window"></div>
                  <div className="car-hood"></div>
                  <div className="car-wheel wheel-fl"></div>
                  <div className="car-wheel wheel-fr"></div>
                  <div className="car-wheel wheel-bl"></div>
                  <div className="car-wheel wheel-br"></div>
                  <div className="car-headlight left"></div>
                  <div className="car-headlight right"></div>
                  <div className="car-taillight left"></div>
                  <div className="car-taillight right"></div>
                </div>
              </div>
            </div>

            {/* Universe B */}
            {inSuperposition && (
              <div className="pane">
                <div className="universe-label universe-b">UNIVERSE β</div>

                <div className="lane-lines">
                  <div className="lane-line left"></div>
                  <div className="lane-line center"></div>
                  <div className="lane-line right"></div>
                </div>

                <div className="divider"></div>

                {data?.lasers.filter(l => l.universe === 'B').map((l, i) => (
                  <div
                    key={`laser-b-${i}`}
                    className="laser"
                    style={{ top: `${l.y}%`, left: l.lane === 0 ? '1%' : '51%', width: '48%' }}
                  />
                ))}

                <div className="car-container" style={{ left: '25%', opacity: probs.b[0] }}>
                  <div className="car-body blue-car">
                    <div className="car-top"></div>
                    <div className="car-window"></div>
                    <div className="car-hood"></div>
                    <div className="car-wheel wheel-fl"></div>
                    <div className="car-wheel wheel-fr"></div>
                    <div className="car-wheel wheel-bl"></div>
                    <div className="car-wheel wheel-br"></div>
                    <div className="car-headlight left"></div>
                    <div className="car-headlight right"></div>
                    <div className="car-taillight left"></div>
                    <div className="car-taillight right"></div>
                  </div>
                </div>
                <div className="car-container" style={{ left: '75%', opacity: probs.b[1] }}>
                  <div className="car-body blue-car">
                    <div className="car-top"></div>
                    <div className="car-window"></div>
                    <div className="car-hood"></div>
                    <div className="car-wheel wheel-fl"></div>
                    <div className="car-wheel wheel-fr"></div>
                    <div className="car-wheel wheel-bl"></div>
                    <div className="car-wheel wheel-br"></div>
                    <div className="car-headlight left"></div>
                    <div className="car-headlight right"></div>
                    <div className="car-taillight left"></div>
                    <div className="car-taillight right"></div>
                  </div>
                </div>
              </div>
            )}

            <div className="score-hud">SCORE: {data?.score || 0}</div>

            {!gameEnded && (
              <div className="controls-hud">
                <div className="control-key"><span>H</span> Hadamard</div>
                <div className="control-key"><span>A/D</span> α</div>
                <div className="control-key"><span>←/→</span> β</div>
                <div className="control-key"><span>P</span> Pause</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;