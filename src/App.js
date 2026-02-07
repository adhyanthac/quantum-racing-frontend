import React, { useState, useEffect, useRef } from 'react'; // Fixed: useEffect is now used
import './App.css';

const CLIENT_ID = Math.random().toString(36).substring(7);

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [quantumData, setQuantumData] = useState({
    state_vector: [{real: 1, imag: 0}, {real: 0, imag: 0}, {real: 0, imag: 0}, {real: 0, imag: 0}],
    in_superposition: false
  });
  const [lasers, setLasers] = useState([]);
  const wsRef = useRef(null);

  // Connection Logic - Now using useEffect and wsRef properly
  useEffect(() => {
    if (gameState === 'PLAYING') {
      const ws = new WebSocket(`wss://quantum-racing-backend.onrender.com/ws/${CLIENT_ID}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'game_state') {
          setQuantumData(message.data.quantum_vehicle);
          setLasers(message.data.lasers);
        }
      };

      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [gameState]);

  // Handle Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!wsRef.current || gameState !== 'PLAYING') return;
      
      if (e.key === 'h' || e.key === 'H') {
        wsRef.current.send(JSON.stringify({ action: 'hadamard' }));
      } else if (e.key === 'a' || e.key === 'd') {
        wsRef.current.send(JSON.stringify({ action: 'pauli_x', target: 'A' }));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        wsRef.current.send(JSON.stringify({ action: 'pauli_x', target: 'B' }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const calculateLanes = () => {
    const v = quantumData.state_vector;
    const p = v.map(c => Math.pow(c.real, 2) + Math.pow(c.imag, 2));
    return {
      univA: [p[0] + p[1], p[2] + p[3]],
      univB: [p[0] + p[2], p[1] + p[3]]
    };
  };

  const { univA, univB } = calculateLanes();

  return (
    <div className="App">
      {gameState === 'MENU' && (
        <div className="menu-screen-y2k">
          <div className="scanlines"></div>
          <h1 className="glitch-title">Q-RACING PRO</h1>
          <div className="hero-car">
             <div className="red-car-top large"></div>
          </div>
          <button className="neon-start-btn" onClick={() => setGameState('PLAYING')}>
            INITIATE ENTANGLEMENT
          </button>
          <div className="tech-specs">
            <p>DR. XU GROUP | TEXAS A&M PHYSICS</p>
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className={`game-viewport ${quantumData.in_superposition ? 'split' : 'single'}`}>
          <div className="universe-pane pane-a">
            <div className="lane-line"></div>
            {lasers.filter(l => l.universe === 'A').map((l, i) => (
              <div key={i} className="laser-beam" style={{ top: `${l.y}%`, left: l.lane === 0 ? '0' : '50%' }} />
            ))}
            {univA[0] > 0.01 && <div className="red-car-top" style={{ left: '25%', opacity: univA[0] }} />}
            {univA[1] > 0.01 && <div className="red-car-top" style={{ left: '75%', opacity: univA[1] }} />}
          </div>

          {quantumData.in_superposition && (
            <div className="universe-pane pane-b">
              <div className="lane-line"></div>
              {lasers.filter(l => l.universe === 'B').map((l, i) => (
                <div key={i} className="laser-beam" style={{ top: `${l.y}%`, left: l.lane === 0 ? '0' : '50%' }} />
              ))}
              {univB[0] > 0.01 && <div className="red-car-top blue-glow" style={{ left: '25%', opacity: univB[0] }} />}
              {univB[1] > 0.01 && <div className="red-car-top blue-glow" style={{ left: '75%', opacity: univB[1] }} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;