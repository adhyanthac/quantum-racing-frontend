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
      {/* Global Scanlines Effect */}
      <div className="scanlines"></div>

      {gameState === 'MENU' ? (
        <div className="menu-screen">
          <h1 className="title">Q-RACING PRO</h1>
          <button className="start-btn" onClick={() => setGameState('PLAYING')}>
            ⚡ INITIATE ENTANGLEMENT ⚡
          </button>
          <p className="credits">✦ DR. XU GROUP | TEXAS A&M PHYSICS ✦</p>

          {/* Controls Info */}
          <div className="controls-hud" style={{ marginTop: '40px' }}>
            <div className="control-key">
              <span style={{ color: '#ff00ff' }}>H</span> = HADAMARD
            </div>
            <div className="control-key">
              <span style={{ color: '#ff0066' }}>A/D</span> = UNIVERSE A
            </div>
            <div className="control-key">
              <span style={{ color: '#0099ff' }}>←/→</span> = UNIVERSE B
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Game Over Screen */}
          {data && !data.running && (
            <div className="game-over">
              <h2>⚠️ QUANTUM COLLAPSE ⚠️</h2>
              <p style={{
                color: '#00d4ff',
                fontSize: '2rem',
                margin: '20px 0',
                fontFamily: 'Orbitron, sans-serif'
              }}>
                FINAL SCORE: {data.score}
              </p>
              <button
                className="start-btn"
                onClick={handleRestart}
                style={{ marginTop: '20px' }}
              >
                🔄 RESTART SIMULATION
              </button>
            </div>
          )}

          {/* Game Area */}
          <div className={`game-area ${inSuperposition ? 'split' : 'single'}`}>
            {/* Superposition Indicator */}
            {inSuperposition && (
              <div className="superposition-active">
                ⚛️ SUPERPOSITION ACTIVE
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
                  transform: `translateX(-50%) scale(${0.8 + probs.a[0] * 0.2})`
                }}
              />
              <div
                className="car red"
                style={{
                  left: '75%',
                  opacity: probs.a[1],
                  transform: `translateX(-50%) scale(${0.8 + probs.a[1] * 0.2})`
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
                    transform: `translateX(-50%) scale(${0.8 + probs.b[0] * 0.2})`
                  }}
                />
                <div
                  className="car blue"
                  style={{
                    left: '75%',
                    opacity: probs.b[1],
                    transform: `translateX(-50%) scale(${0.8 + probs.b[1] * 0.2})`
                  }}
                />
              </div>
            )}

            {/* Score HUD */}
            <div className="score-hud">SCORE: {data?.score || 0}</div>

            {/* Controls HUD */}
            <div className="controls-hud">
              <div className="control-key">
                <span style={{ color: '#ff00ff' }}>H</span> HADAMARD
              </div>
              <div className="control-key">
                <span style={{ color: '#ff0066' }}>A/D</span> α
              </div>
              <div className="control-key">
                <span style={{ color: '#0099ff' }}>←/→</span> β
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;