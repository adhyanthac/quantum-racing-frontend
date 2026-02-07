import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [quantumData, setQuantumData] = useState({
    state_vector: [{real: 1, imag: 0}, {real: 0, imag: 0}, {real: 0, imag: 0}, {real: 0, imag: 0}],
    in_superposition: false
  });
  const [lasers, setLasers] = useState([]);
  const wsRef = useRef(null);

  // ... WebSocket connection logic (omitted for brevity, same as previous)

  const calculateLanes = () => {
    const v = quantumData.state_vector;
    const p = v.map(c => Math.pow(c.real, 2) + Math.pow(c.imag, 2));
    
    return {
      univA: [p[0] + p[1], p[2] + p[3]], // Probabilities for Lane 0 and 1
      univB: [p[0] + p[2], p[1] + p[3]]  // Probabilities for Lane 0 and 1
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
          
          {/* Universe A */}
          <div className="universe-pane pane-a">
            <div className="lane-line"></div>
            {lasers.filter(l => l.universe === 'A').map(l => (
              <div className="laser-beam" style={{ top: `${l.y}%`, left: l.lane === 0 ? '0' : '50%' }} />
            ))}
            {/* Render two "ghost" cars based on probability */}
            {univA[0] > 0.01 && <div className="red-car-top" style={{ left: '25%', opacity: univA[0] }} />}
            {univA[1] > 0.01 && <div className="red-car-top" style={{ left: '75%', opacity: univA[1] }} />}
          </div>

          {/* Universe B (Conditioned on Superposition) */}
          {quantumData.in_superposition && (
            <div className="universe-pane pane-b">
              <div className="lane-line"></div>
              {lasers.filter(l => l.universe === 'B').map(l => (
                <div className="laser-beam" style={{ top: `${l.y}%`, left: l.lane === 0 ? '0' : '50%' }} />
              ))}
              {univB[0] > 0.01 && <div className="red-car-top blue-glow" style={{ left: '25%', opacity: univB[0] }} />}
              {univB[1] > 0.01 && <div className="red-car-top blue-glow" style={{ left: '75%', opacity: univB[1] }} />}
            </div>
          )}

          <div className="hud-overlay">
            <div className="state-display">
              |ψ⟩ = {quantumData.state_vector[0].real.toFixed(2)}|00⟩ + ...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;