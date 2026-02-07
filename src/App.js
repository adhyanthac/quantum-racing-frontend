import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const CLIENT_ID = Math.random().toString(36).substring(7);

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [data, setData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const ws = new WebSocket(`wss://quantum-racing-backend.onrender.com/ws/${CLIENT_ID}`);
      wsRef.current = ws;
      ws.onmessage = (e) => setData(JSON.parse(e.data).data);
      ws.onerror = (err) => console.error('WebSocket error:', err);
      return () => ws.close();
    }
  }, [gameState]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!wsRef.current || gameState !== 'PLAYING') return;
      if (e.key.toLowerCase() === 'h') wsRef.current.send(JSON.stringify({ action: 'hadamard' }));
      if (['a', 'd'].includes(e.key.toLowerCase())) wsRef.current.send(JSON.stringify({ action: 'pauli_x', target: 'A' }));
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) wsRef.current.send(JSON.stringify({ action: 'pauli_x', target: 'B' }));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const getProbs = () => {
    if (!data) return { a: [1, 0], b: [1, 0] };
    const p = data.quantum_vehicle.state_vector.map(c => Math.pow(c.real, 2) + Math.pow(c.imag, 2));
    return { a: [p[0] + p[1], p[2] + p[3]], b: [p[0] + p[2], p[1] + p[3]] };
  };

  const probs = getProbs();
  const inSuperposition = data?.quantum_vehicle.in_superposition;

  const handleRestart = () => {
    setData(null);
    setGameState('MENU');
  };

  return (
    <div className="App">
      {/* Subtle Scanlines */}
      <div className="scanlines"></div>

      {gameState === 'MENU' ? (
        <div className="menu-screen">
          {/* Background */}
          <div className="menu-bg">
            <img
              src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1920&q=80"
              alt="Racing Background"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Title */}
          <h1 className="title">Q-RACING PRO</h1>

          {/* Bottom Menu Bar */}
          <div className="bottom-menu">
            {/* Left side icons */}
            <div className="menu-icons">
              <div className="menu-icon-btn">
                <div className="icon icon-settings">⚙️</div>
                <span className="label">Setting</span>
              </div>
              <div className="menu-icon-btn">
                <div className="icon icon-quantum">⚛️</div>
                <span className="label">Quantum</span>
              </div>
              <div className="menu-icon-btn">
                <div className="icon icon-more">📊</div>
                <span className="label">Stats</span>
              </div>
              <div className="menu-icon-btn">
                <div className="icon icon-share">🔗</div>
                <span className="label">Share</span>
              </div>
            </div>

            {/* Start Button */}
            <button className="start-btn" onClick={() => setGameState('PLAYING')}>
              <div className="start-btn-main">START</div>
              <div className="start-btn-stripes">
                <div className="stripe"></div>
                <div className="stripe"></div>
                <div className="stripe"></div>
              </div>
            </button>
          </div>

          {/* Credits */}
          <p className="credits">DR. XU GROUP | TEXAS A&M PHYSICS</p>
        </div>
      ) : (
        <>
          {/* Game Over Screen */}
          {data && !data.running && (
            <div className="game-over">
              <h2>GAME OVER</h2>
              <p className="game-over-score">FINAL SCORE: {data.score}</p>
              <button className="restart-btn" onClick={handleRestart}>
                PLAY AGAIN
              </button>
            </div>
          )}

          {/* Game Area */}
          <div className={`game-area ${inSuperposition ? 'split' : 'single'}`}>
            {/* Superposition Indicator */}
            {inSuperposition && (
              <div className="superposition-active">
                ⚛️ SUPERPOSITION
              </div>
            )}

            {/* Universe A Pane */}
            <div className="pane">
              <div className="universe-label universe-a">UNIVERSE α</div>
              <div className="divider"></div>

              {/* Lasers in Universe A */}
              {data?.lasers.filter(l => l.universe === 'A').map((l, i) => (
                <div
                  key={`laser-a-${i}`}
                  className="laser"
                  style={{
                    top: `${l.y}%`,
                    left: l.lane === 0 ? '1%' : '51%',
                    width: '48%'
                  }}
                />
              ))}

              {/* Cars in Universe A */}
              <div
                className="car red"
                style={{
                  left: '25%',
                  opacity: probs.a[0],
                  transform: `translateX(-50%) scale(${0.85 + probs.a[0] * 0.15})`
                }}
              />
              <div
                className="car red"
                style={{
                  left: '75%',
                  opacity: probs.a[1],
                  transform: `translateX(-50%) scale(${0.85 + probs.a[1] * 0.15})`
                }}
              />
            </div>

            {/* Universe B Pane (only in superposition) */}
            {inSuperposition && (
              <div className="pane">
                <div className="universe-label universe-b">UNIVERSE β</div>
                <div className="divider"></div>

                {/* Lasers in Universe B */}
                {data?.lasers.filter(l => l.universe === 'B').map((l, i) => (
                  <div
                    key={`laser-b-${i}`}
                    className="laser"
                    style={{
                      top: `${l.y}%`,
                      left: l.lane === 0 ? '1%' : '51%',
                      width: '48%'
                    }}
                  />
                ))}

                {/* Cars in Universe B */}
                <div
                  className="car blue"
                  style={{
                    left: '25%',
                    opacity: probs.b[0],
                    transform: `translateX(-50%) scale(${0.85 + probs.b[0] * 0.15})`
                  }}
                />
                <div
                  className="car blue"
                  style={{
                    left: '75%',
                    opacity: probs.b[1],
                    transform: `translateX(-50%) scale(${0.85 + probs.b[1] * 0.15})`
                  }}
                />
              </div>
            )}

            {/* Score HUD */}
            <div className="score-hud">SCORE: {data?.score || 0}</div>

            {/* Controls HUD */}
            <div className="controls-hud">
              <div className="control-key">
                <span>H</span> Hadamard
              </div>
              <div className="control-key">
                <span>A/D</span> Universe α
              </div>
              <div className="control-key">
                <span>←/→</span> Universe β
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;