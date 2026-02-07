import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const CLIENT_ID = Math.random().toString(36).substring(7);
const GAME_URL = 'https://quantum-racing.vercel.app';

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [data, setData] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuantumModal, setShowQuantumModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [scores, setScores] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const wsRef = useRef(null);

  // Load scores from localStorage on mount
  useEffect(() => {
    const savedScores = localStorage.getItem('quantumRacingScores');
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }
  }, []);

  // Save score when game ends
  const saveScore = useCallback((score) => {
    const newScore = {
      score,
      date: new Date().toLocaleString(),
      id: Date.now()
    };
    const updatedScores = [newScore, ...scores].slice(0, 10); // Keep last 10
    setScores(updatedScores);
    localStorage.setItem('quantumRacingScores', JSON.stringify(updatedScores));
  }, [scores]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const ws = new WebSocket(`wss://quantum-racing-backend.onrender.com/ws/${CLIENT_ID}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        const gameData = msg.data;
        setData(gameData);
        setIsPaused(gameData.paused || false);

        // Save score when game ends
        if (msg.type === 'game_over' && gameData.score > 0) {
          saveScore(gameData.score);
        }
      };

      ws.onerror = (err) => console.error('WebSocket error:', err);
      return () => ws.close();
    }
  }, [gameState, saveScore]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!wsRef.current || gameState !== 'PLAYING') return;

      // Pause with Escape or P
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        wsRef.current.send(JSON.stringify({ action: 'pause' }));
        return;
      }

      // Don't process game controls if paused
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
  }, [gameState, isPaused]);

  const getProbs = () => {
    if (!data) return { a: [1, 0], b: [1, 0] };
    const p = data.quantum_vehicle.state_vector.map(c => Math.pow(c.real, 2) + Math.pow(c.imag, 2));
    return { a: [p[0] + p[1], p[2] + p[3]], b: [p[0] + p[2], p[1] + p[3]] };
  };

  const probs = getProbs();
  const inSuperposition = data?.quantum_vehicle?.in_superposition;

  const handlePause = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'pause' }));
    }
  };

  const handleRestart = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'restart' }));
      setData(null);
      setIsPaused(false);
    }
  };

  const handleBackToMenu = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setData(null);
    setIsPaused(false);
    setGameState('MENU');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(GAME_URL);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
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

  return (
    <div className="App">
      <div className="scanlines"></div>

      {/* ===== QUANTUM MODAL ===== */}
      {showQuantumModal && (
        <div className="modal-overlay" onClick={() => setShowQuantumModal(false)}>
          <div className="modal quantum-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQuantumModal(false)}>✕</button>
            <h2>⚛️ Quantum Racing Guide</h2>

            <div className="modal-section">
              <h3>🎮 How to Play</h3>
              <ul>
                <li><strong>H Key</strong> - Enter Superposition (split into 2 universes)</li>
                <li><strong>A/D Keys</strong> - Switch lanes in Universe α (red car)</li>
                <li><strong>←/→ Arrows</strong> - Switch lanes in Universe β (blue car)</li>
                <li><strong>P or Esc</strong> - Pause the game</li>
              </ul>
            </div>

            <div className="modal-section">
              <h3>🎯 Objective</h3>
              <p>Avoid the incoming lasers! Use quantum mechanics to your advantage by existing in multiple states simultaneously.</p>
            </div>

            <div className="modal-section">
              <h3>⚛️ The Quantum Physics</h3>
              <div className="quantum-explanation">
                <div className="quantum-concept">
                  <h4>🌀 Superposition</h4>
                  <p>Just like Schrödinger's cat, your car exists in <strong>multiple lanes simultaneously</strong> until observed (hit by a laser). Press H to enter this quantum state!</p>
                </div>

                <div className="quantum-concept">
                  <h4>🔗 Entanglement</h4>
                  <p>When in superposition, your car splits across <strong>two parallel universes</strong> (α and β). The cars are entangled - measuring one affects the other!</p>
                </div>

                <div className="quantum-concept">
                  <h4>🎲 Probability</h4>
                  <p>The <strong>opacity of each car</strong> shows its probability. When a laser approaches, there's a probabilistic chance of collision based on your quantum state.</p>
                </div>

                <div className="quantum-concept">
                  <h4>📉 Wave Function Collapse</h4>
                  <p>When you successfully dodge a laser, the quantum state <strong>collapses</strong> - your car returns to a single classical state in Universe α.</p>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>🧮 The Math Behind It</h3>
              <div className="quantum-math">
                <p><strong>State Vector:</strong> |ψ⟩ = α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩</p>
                <p><strong>Hadamard Gate (H):</strong> Creates superposition</p>
                <p><strong>Pauli-X Gate (A/D, ←/→):</strong> Flips lane position</p>
                <p><strong>CNOT Gate:</strong> Entangles the two universes</p>
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
                <p>No games played yet!</p>
                <p>Start playing to see your scores here.</p>
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
                    <span className="stat-label">Games Played</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)}</span>
                    <span className="stat-label">Average</span>
                  </div>
                </div>

                <h3>Recent Games</h3>
                <div className="scores-list">
                  {scores.map((s, i) => (
                    <div key={s.id} className={`score-item ${i === 0 ? 'latest' : ''}`}>
                      <span className="score-rank">#{i + 1}</span>
                      <span className="score-value">{s.score}</span>
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
            <img
              src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1920&q=80"
              alt="Racing Background"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <h1 className="title">Q-RACING PRO</h1>

          <div className="bottom-menu">
            <div className="menu-icons">
              <div className="menu-icon-btn" onClick={() => alert('Settings coming soon!')}>
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
                <div className="icon icon-share">
                  {copySuccess ? '✓' : '🔗'}
                </div>
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
        </div>
      ) : (
        <>
          {/* ===== PAUSE OVERLAY ===== */}
          {isPaused && data?.running && (
            <div className="pause-overlay">
              <h2>⏸️ PAUSED</h2>
              <p>Press P or Esc to resume</p>
              <div className="pause-buttons">
                <button className="resume-btn" onClick={handlePause}>Resume</button>
                <button className="menu-btn" onClick={handleBackToMenu}>Main Menu</button>
              </div>
            </div>
          )}

          {/* ===== GAME OVER ===== */}
          {data && !data.running && (
            <div className="game-over">
              <h2>GAME OVER</h2>
              <p className="game-over-score">FINAL SCORE: {data.score}</p>
              <div className="game-over-buttons">
                <button className="restart-btn" onClick={handleRestart}>
                  🔄 PLAY AGAIN
                </button>
                <button className="menu-btn-small" onClick={handleBackToMenu}>
                  Main Menu
                </button>
              </div>
            </div>
          )}

          {/* ===== GAME AREA ===== */}
          <div className={`game-area ${inSuperposition ? 'split' : 'single'}`}>
            {/* Pause Button */}
            <button className="pause-btn" onClick={handlePause}>
              {isPaused ? '▶' : '⏸'}
            </button>

            {inSuperposition && (
              <div className="superposition-active">⚛️ SUPERPOSITION</div>
            )}

            {/* Universe A */}
            <div className="pane">
              <div className="universe-label universe-a">UNIVERSE α</div>
              <div className="divider"></div>

              {data?.lasers.filter(l => l.universe === 'A').map((l, i) => (
                <div
                  key={`laser-a-${i}`}
                  className="laser"
                  style={{ top: `${l.y}%`, left: l.lane === 0 ? '1%' : '51%', width: '48%' }}
                />
              ))}

              <div className="car-container" style={{ left: '25%', opacity: probs.a[0] }}>
                <div className="car-body red-car">
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
                <div className="car-body red-car">
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

            <div className="controls-hud">
              <div className="control-key"><span>H</span> Hadamard</div>
              <div className="control-key"><span>A/D</span> α</div>
              <div className="control-key"><span>←/→</span> β</div>
              <div className="control-key"><span>P</span> Pause</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;