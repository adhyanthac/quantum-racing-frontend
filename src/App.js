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
      return () => ws.close();
    }
  }, [gameState]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!wsRef.current || gameState !== 'PLAYING') return;
      if (e.key.toLowerCase() === 'h') wsRef.current.send(JSON.stringify({action: 'hadamard'}));
      if (['a', 'd'].includes(e.key.toLowerCase())) wsRef.current.send(JSON.stringify({action: 'pauli_x', target: 'A'}));
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) wsRef.current.send(JSON.stringify({action: 'pauli_x', target: 'B'}));
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

  return (
    <div className="App">
      {gameState === 'MENU' ? (
        <div className="menu-screen">
          <div className="scanlines"></div>
          <h1 className="title">Q-RACING PRO</h1>
          <button className="start-btn" onClick={() => setGameState('PLAYING')}>INITIATE ENTANGLEMENT</button>
          <p className="credits">DR. XU GROUP | TEXAS A&M PHYSICS</p>
        </div>
      ) : (
        <div className={`game-area ${data?.quantum_vehicle.in_superposition ? 'split' : 'single'}`}>
          <div className="pane">
            <div className="divider"></div>
            {data?.lasers.filter(l => l.universe === 'A').map((l, i) => (
              <div key={i} className="laser" style={{ top: `${l.y}%`, left: l.lane === 0 ? '0' : '50%' }} />
            ))}
            <div className="car red" style={{ left: '25%', opacity: probs.a[0] }} />
            <div className="car red" style={{ left: '75%', opacity: probs.a[1] }} />
          </div>
          {data?.quantum_vehicle.in_superposition && (
            <div className="pane">
              <div className="divider"></div>
              {data?.lasers.filter(l => l.universe === 'B').map((l, i) => (
                <div key={i} className="laser" style={{ top: `${l.y}%`, left: l.lane === 0 ? '0' : '50%' }} />
              ))}
              <div className="car blue" style={{ left: '25%', opacity: probs.b[0] }} />
              <div className="car blue" style={{ left: '75%', opacity: probs.b[1] }} />
            </div>
          )}
          <div className="score-hud">SCORE: {data?.score}</div>
        </div>
      )}
    </div>
  );
}

export default App;