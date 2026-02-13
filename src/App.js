import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const GAME_URL = 'https://quantum-racing.vercel.app';

const DEFAULT_SETTINGS = {
  playerName: 'Quantum Racer',
  carColor: 'red',
  avatar: 'kart',
  gameSpeed: 'normal',
};

const AVATARS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00FF00', // Green
  '#FFFF00', // Yellow
  '#800080', // Purple
  '#FFC0CB', // Pink
  '#00FFFF', // Cyan
  '#FFA500'  // Orange
];

const NeonKart = ({ color }) => (
  <svg viewBox="0 0 100 100" className="neon-kart" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
    <defs>
      <filter id={`glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Kart Base/Body - Front Wing */}
    <path d="M20,20 L80,20 L75,30 L25,30 Z"
      fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

    {/* Wheels - Front */}
    <rect x="10" y="15" width="10" height="20" rx="3"
      fill="none" stroke={color} strokeWidth="3" />
    <rect x="80" y="15" width="10" height="20" rx="3"
      fill="none" stroke={color} strokeWidth="3" />

    {/* Main Body Shape */}
    <path d="M35,30 L65,30 L70,60 L30,60 Z"
      fill="none" stroke={color} strokeWidth="3" />

    {/* Driver Head/Helmet - Circle */}
    <circle cx="50" cy="50" r="10"
      fill="none" stroke={color} strokeWidth="3" />

    {/* Spoiler/Rear Wing */}
    <path d="M25,85 L75,85 L80,75 L20,75 Z"
      fill="none" stroke={color} strokeWidth="3" />

    {/* Wheels - Rear */}
    <rect x="5" y="65" width="15" height="25" rx="4"
      fill="none" stroke={color} strokeWidth="3" />
    <rect x="80" y="65" width="15" height="25" rx="4"
      fill="none" stroke={color} strokeWidth="3" />

    {/* Engine/Exhaust Pipes */}
    <line x1="40" y1="85" x2="40" y2="95" stroke={color} strokeWidth="2" />
    <line x1="60" y1="85" x2="60" y2="95" stroke={color} strokeWidth="2" />

    {/* Energy Trail Effect (Simulated in SVG) */}
    <path d="M42,95 L38,105 M58,95 L62,105" stroke={color} strokeWidth="1" opacity="0.6" />
  </svg>
);

const FLOATING_MESSAGES = ['NICE!', 'WOOSH!', 'DODGE!', 'SICK!', 'RADICAL!'];
const QUANTUM_MESSAGES = ['QUANTUM TUNNEL!', 'SUPERPOSITION!', 'ENTANGLED!', 'PURE MATH!', 'GHOST MODE!'];

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

  // New "Juice" States
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [combo, setCombo] = useState(0);


  const wsRef = useRef(null);
  const gameEndedRef = useRef(false);
  const scoreSavedRef = useRef(false);
  const prevLasersPassedRef = useRef(0);
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

        // Detect Laser Pass (Scored point/survived)
        if (gameData.lasers_passed > prevLasersPassedRef.current) {
          const isQuantum = gameData.in_superposition;

          if (isQuantum) {
            // ONLY increment combo in Quantum Mode
            const texts = QUANTUM_MESSAGES;
            const text = texts[Math.floor(Math.random() * texts.length)];
            addFloatingText(text, 'gold');
            setCombo(prev => prev + 1);
          } else {
            // Reset combo if passing classically
            if (combo > 0) {
              addFloatingText("STREAK LOST!", "#ff4444");
              setCombo(0);
            } else {
              // Optional: Standard message for classical pass
              const texts = FLOATING_MESSAGES;
              const text = texts[Math.floor(Math.random() * texts.length)];
              addFloatingText(text, 'white');
            }
          }
        }
        prevLasersPassedRef.current = gameData.lasers_passed;
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
  }, [gameState, clientId, saveScoreToStorage, combo]);

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
      // L = Switch Laser Universe
      else if (key === 'l') {
        wsRef.current.send(JSON.stringify({ action: 'laser_switch' }));
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
    setGameWon(false);
    setFinalScore(0);
    setFinalProgress(0);
    setCombo(0);
    setFloatingTexts([]);
    prevLasersPassedRef.current = 0;
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

  // Mobile touch controls
  const handleHadamard = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !gameEndedRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'hadamard' }));
    }
  };

  const handlePauliA = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !gameEndedRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'pauli_x_A' }));
    }
  };

  const handleLaserSwitch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !gameEndedRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'laser_switch' }));
    }
  };

  const addFloatingText = (text, color) => {
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, text, color, x: 50 + (Math.random() * 20 - 10), y: 40 }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  const getCarRender = (isGhost = false, opacity = 1) => {
    return (
      <div
        className={`car-avatar ${isGhost ? 'ghost-effect' : ''} trail-${settings.carColor}`}
        style={{ opacity }}
      >
        <NeonKart color={settings.carColor === 'default' ? '#00FFFF' : settings.carColor} />
      </div>
    );
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
            <h2>🚀 HOW TO PLAY</h2>

            <div className="modal-section">
              <h3>🎯 Goal</h3>
              <p className="readable-text goal-text">
                <strong>Survive for 60 seconds!</strong> Dodge deadly lasers by switching lanes and using
                <span className="highlight-text"> QUANTUM POWERS</span> to exist in two places at once!
              </p>
            </div>

            <div className="modal-section">
              <h3>🎮 Controls</h3>
              <div className="controls-list">
                <div className="control-item primary-control">
                  <span className="key-badge big-badge">H</span>
                  <div className="control-info">
                    <span className="control-title">QUANTUM MODE 🌀</span>
                    <span className="control-desc">Split into 2 universes! Your car exists in BOTH lanes with different chances of survival.</span>
                  </div>
                </div>
                <div className="control-item">
                  <span className="key-badge">A / D</span>
                  <div className="control-info">
                    <span className="control-title">Switch Lanes</span>
                    <span className="control-desc">Move left/right to dodge lasers. In quantum mode, this shifts your probabilities!</span>
                  </div>
                </div>
                <div className="control-item">
                  <span className="key-badge">← / →</span>
                  <div className="control-info">
                    <span className="control-title">Universe β Control</span>
                    <span className="control-desc">In quantum mode, control your second universe's car independently!</span>
                  </div>
                </div>
                <div className="control-item">
                  <span className="key-badge">L</span>
                  <div className="control-info">
                    <span className="control-title">Switch Laser</span>
                    <span className="control-desc">Move the incoming laser to the other universe! (Tactical choice)</span>
                  </div>
                </div>
                <div className="control-item">
                  <span className="key-badge">P</span>
                  <div className="control-info">
                    <span className="control-title">Pause</span>
                    <span className="control-desc">Take a breather when things get intense!</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>💡 Pro Tips</h3>
              <div className="tips-list">
                <div className="tip-item">
                  <span className="tip-emoji">⚡</span>
                  <span className="tip-text">Press <strong>H</strong> when a laser is coming - quantum mode gives you a chance to "tunnel" through!</span>
                </div>
                <div className="tip-item">
                  <span className="tip-emoji">👀</span>
                  <span className="tip-text">Watch the <strong>probability percentages</strong> - higher % = better chance of surviving in that lane!</span>
                </div>
                <div className="tip-item">
                  <span className="tip-emoji">🎲</span>
                  <span className="tip-text">Each quantum mode gives you <strong>random probabilities</strong> - adapt your strategy!</span>
                </div>
                <div className="tip-item">
                  <span className="tip-emoji">🔄</span>
                  <span className="tip-text">After surviving a laser in quantum mode, you <strong>collapse back</strong> - hit H again!</span>
                </div>
              </div>
            </div>

            <div className="modal-section physics-section">
              <h3>⚛️ The Quantum Physics (For Nerds! 🤓)</h3>
              <div className="quantum-explanation collapsed-section">
                <div className="quantum-concept mini">
                  <strong>Superposition:</strong> Pressing H applies a Hadamard gate, creating a quantum superposition where your car exists in multiple states simultaneously.
                </div>
                <div className="quantum-concept mini">
                  <strong>Entanglement:</strong> The two universe cars are quantum entangled via a CNOT gate - their fates are correlated!
                </div>
                <div className="quantum-concept mini">
                  <strong>Born Rule:</strong> When a laser hits, it "measures" your quantum state. Survival probability follows |ψ|² - real quantum mechanics!
                </div>
                <div className="quantum-concept mini">
                  <strong>Wave Function Collapse:</strong> Passing through a laser collapses the superposition back to a definite classical state.
                </div>
              </div>
            </div>

            <button className="modal-btn play-btn" onClick={() => setShowQuantumModal(false)}>🎮 LET'S RACE!</button>
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
            </div>
            <div className="setting-item">
              <label className="setting-label">Choose Your Racer</label>
              <div className="avatar-options">
                {AVATARS.map(color => (
                  <button
                    key={color}
                    className={`avatar-btn ${settings.carColor === color ? 'selected' : ''}`}
                    onClick={() => saveSettings({ ...settings, carColor: color, avatar: 'kart' })}
                    style={{ borderColor: color }}
                  >
                    <NeonKart color={color} />
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-item">
              <label className="setting-label">Car Color (Trail)</label>
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
            <button className="modal-btn" onClick={() => setShowSettingsModal(false)}>Save</button>
          </div>
        </div>
      )
      }

      {/* Stats Modal */}
      {
        showStatsModal && (
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
        )
      }

      {/* Menu Screen */}
      {
        gameState === 'MENU' ? (
          <div className="menu-screen">
            <div className="menu-bg">
              <img
                src="https://images.unsplash.com/photo-1635331735953-b2582877e8be?q=80&w=2070&auto=format&fit=crop"
                alt="Mario Kart Style Track"
                className="menu-bg-img"
              />
              <div className="menu-bg-overlay"></div>
            </div>

            <h1 className="title">QUANTUM MARIO KART 🏎️</h1>

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
                  {gameWon ? (
                    <div className="win-message">🎉 AMAZING RACE! 🎉</div>
                  ) : (
                    <div className="crash-message">💥 CRASHED! 💥</div>
                  )}
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

            {/* Rocket Progress Bar */}
            <div className="rocket-progress-container">
              <div className="rocket-track">
                <div
                  className="rocket-icon"
                  style={{ left: `${progress}%` }}
                >
                  🚀
                </div>
                <div className="planet-icon">🪐</div>
              </div>
              <div className="progress-fill-bar" style={{ width: `${progress}%` }}></div>
            </div>

            {
              combo > 1 && (
                <div className="combo-meter">
                  <span className="combo-count">{combo}x</span>
                  <span className="combo-label">QUANTUM STREAK! 🔥</span>
                </div>
              )
            }



            {/* Floating Texts */}
            {
              floatingTexts.map(ft => (
                <div
                  key={ft.id}
                  className="floating-text"
                  style={{ left: `${ft.x}%`, top: `${ft.y}%`, color: ft.color }}
                >
                  {ft.text}
                </div>
              ))
            }

            {/* Pause Button */}
            {
              !gameEnded && (
                <button className="pause-btn" onClick={handlePause}>
                  {isPaused ? '▶' : '⏸'}
                </button>
              )
            }

            {/* Superposition Indicator */}
            {
              inSuperposition && !gameEnded && (
                <div className="superposition-active">
                  ⚛️ ENTANGLED STATE
                </div>
              )
            }

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

                {/* Universe A Cars - Show BOTH positions in superposition! */}
                {inSuperposition ? (
                  <>
                    {/* Left Ghost Car */}
                    <div
                      className="car-container superposition-car"
                      style={{
                        left: '25%',
                        opacity: Math.max(0.2, carA.left_prob)
                      }}
                    >
                      {getCarRender(true, Math.max(0.4, carA.left_prob))}
                    </div>

                    {/* Right Ghost Car */}
                    <div
                      className="car-container superposition-car"
                      style={{
                        left: '75%',
                        opacity: Math.max(0.2, carA.right_prob)
                      }}
                    >
                      {getCarRender(true, Math.max(0.4, carA.right_prob))}
                    </div>
                  </>
                ) : (
                  /* Classical Car A */
                  <div
                    className="car-container"
                    style={{
                      left: carA.lane === 0 ? '25%' : '75%',
                      opacity: 1
                    }}
                  >
                    {getCarRender(false, 1)}
                  </div>
                )}

                {/* Probability Display for Universe A */}
                {inSuperposition && (
                  <div className="probability-display">
                    <div className={`prob-item prob-left ${data?.prob_A_left > data?.prob_A_right ? 'highlight-prob' : ''}`}>
                      <span className="prob-label">L</span>
                      <span className="prob-value">{data?.prob_A_left || 0}%</span>
                    </div>
                    <div className={`prob-item prob-right ${data?.prob_A_right > data?.prob_A_left ? 'highlight-prob' : ''}`}>
                      <span className="prob-label">R</span>
                      <span className="prob-value">{data?.prob_A_right || 0}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Universe B (only visible in superposition) */}
              {
                inSuperposition && (
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

                    {/* Universe B Cars - Show BOTH positions! */}
                    {/* Left Ghost Car B */}
                    <div
                      className="car-container superposition-car"
                      style={{
                        left: '25%',
                        opacity: Math.max(0.2, carB.left_prob)
                      }}
                    >
                      {getCarRender(true, Math.max(0.4, carB.left_prob))}
                    </div>

                    {/* Right Ghost Car B */}
                    <div
                      className="car-container superposition-car"
                      style={{
                        left: '75%',
                        opacity: Math.max(0.2, carB.right_prob)
                      }}
                    >
                      {getCarRender(true, Math.max(0.4, carB.right_prob))}
                    </div>

                    {/* Probability Display for Universe B */}
                    <div className="probability-display">
                      <div className={`prob-item prob-left ${data?.prob_B_left > data?.prob_B_right ? 'highlight-prob' : ''}`}>
                        <span className="prob-label">L</span>
                        <span className="prob-value">{data?.prob_B_left || 0}%</span>
                      </div>
                      <div className={`prob-item prob-right ${data?.prob_B_right > data?.prob_B_left ? 'highlight-prob' : ''}`}>
                        <span className="prob-label">R</span>
                        <span className="prob-value">{data?.prob_B_right || 0}%</span>
                      </div>
                    </div>
                  </div>
                )
              }
            </div>

            {/* Score HUD */}
            < div className="score-hud" > SCORE: {data?.score || 0}</div >

            {/* Controls HUD */}
            {
              !gameEnded && (
                <div className="controls-hud">
                  <div className="control-key"><span>H</span> Superposition</div>
                  <div className="control-key"><span>L</span> Move Laser</div>
                  <div className="control-key"><span>A/D</span> Universe α</div>
                  {inSuperposition && <div className="control-key"><span>←/→</span> Universe β</div>}
                </div>
              )
            }

            {/* Mobile Touch Controls */}
            {
              !gameEnded && (
                <div className="mobile-controls">
                  <button
                    className={`mobile-btn hadamard-btn ${inSuperposition ? 'active' : ''}`}
                    onClick={handleHadamard}
                  >
                    H
                    <span className="btn-label">Superposition</span>
                  </button>

                  <div className="swap-controls">
                    <button
                      className="mobile-btn swap-btn"
                      onClick={handlePauliA}
                    >
                      ⟷
                      <span className="btn-label">SWAP</span>
                    </button>
                    <button
                      className="mobile-btn laser-btn"
                      onClick={handleLaserSwitch}
                    >
                      ⚡
                      <span className="btn-label">LASER</span>
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        )
      }
    </div >
  );
}

export default App;