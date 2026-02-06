import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Generate unique client ID
const CLIENT_ID = Math.random().toString(36).substring(7);

function App() {
  const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, GAMEOVER
  const [vehicleData, setVehicleData] = useState(null);
  const [obstaclesA, setObstaclesA] = useState([]);
  const [obstaclesB, setObstaclesB] = useState([]);
  const [distance, setDistance] = useState(10000);
  const [paused, setPaused] = useState(false);
  const wsRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    if (gameState === 'PLAYING') {
      // Connect to backend - CHANGE THIS URL to your deployed backend
      const ws = new WebSocket(`wss://quantum-racing-backend.onrender.com/ws/${CLIENT_ID}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to game server');
        ws.send(JSON.stringify({ action: 'start' }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'game_state') {
          const data = message.data;
          setVehicleData(data.vehicle);
          setObstaclesA(data.obstacles_A);
          setObstaclesB(data.obstacles_B);
          setDistance(data.distance_to_finish);
          setPaused(data.paused);
          
          // Check if game is over
          if (!data.running && data.vehicle) {
            setGameState('GAMEOVER');
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        ws.close();
      };
    }
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!wsRef.current || gameState !== 'PLAYING') return;

      const ws = wsRef.current;
      
      if (e.key === 'Escape' || e.key === 'p') {
        ws.send(JSON.stringify({ action: 'pause' }));
      } else if (!paused) {
        if (e.key === 'h' || e.key === 'H') {
          ws.send(JSON.stringify({ action: 'hadamard' }));
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
          ws.send(JSON.stringify({ action: 'shift_left' }));
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
          ws.send(JSON.stringify({ action: 'shift_right' }));
        } else if (e.key === 'm' || e.key === 'M') {
          ws.send(JSON.stringify({ action: 'measure' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, paused]);

  const startGame = () => {
    setGameState('PLAYING');
  };

  const backToMenu = () => {
    setGameState('MENU');
  };

  // Calculate progress
  const progress = vehicleData ? ((10000 - distance) / 10000) * 100 : 0;

  return (
    <div className="App">
      {gameState === 'MENU' && (
        <div className="menu-screen">
          <div className="menu-content">
            <h1 className="title">Q-RACING</h1>
            <p className="subtitle">Quantum Superposition & Entanglement Simulator</p>
            
            <div className="concepts">
              <div className="concept">
                <span className="icon">🌀</span>
                <p>SUPERPOSITION: Your vehicle exists in multiple lanes simultaneously</p>
              </div>
              <div className="concept">
                <span className="icon">⚛️</span>
                <p>ENTANGLEMENT: Two universes connected - actions affect both instantly</p>
              </div>
            </div>

            <div className="controls-info">
              <h3>Controls</h3>
              <p><kbd>H</kbd> - Hadamard Gate (create superposition)</p>
              <p><kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> - Shift quantum state</p>
              <p><kbd>M</kbd> - Measure and collapse to definite state</p>
              <p><kbd>ESC</kbd> or <kbd>P</kbd> - Pause game</p>
            </div>

            <button className="start-btn" onClick={startGame}>
              START GAME
            </button>

            <p className="footer">Dr. Shenglong Xu's Research Group - Texas A&M University</p>
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && vehicleData && (
        <div className="game-screen">
          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>

          {/* Game Area */}
          <div className="universes-container">
            
            {/* Universe A */}
            <div className="universe universe-a">
              <h2 className="universe-label">UNIVERSE A</h2>
              
              <div className="game-canvas">
                {/* Obstacles */}
                {obstaclesA.map((obs, idx) => (
                  obs.lanes.map(lane => (
                    <div
                      key={`a-${idx}-${lane}`}
                      className="obstacle obstacle-a"
                      style={{
                        left: `${lane * 25}%`,
                        top: `${(obs.y / 800) * 100}%`
                      }}
                    />
                  ))
                ))}

                {/* Vehicle (with superposition visualization) */}
                {vehicleData.alive && vehicleData.amplitudes.map((amp, lane) => {
                  const prob = amp * amp;
                  if (prob < 0.01) return null;
                  return (
                    <div
                      key={`vehicle-a-${lane}`}
                      className="vehicle vehicle-a"
                      style={{
                        left: `${lane * 25}%`,
                        top: '62.5%',
                        opacity: prob
                      }}
                    />
                  );
                })}

                {!vehicleData.alive && (
                  <div className="crash-msg">COLLAPSE</div>
                )}
              </div>

              {/* Probability Bars */}
              <div className="probability-bars">
                {vehicleData.amplitudes.map((amp, idx) => (
                  <div key={`prob-a-${idx}`} className="prob-bar-container">
                    <div 
                      className="prob-bar prob-bar-a"
                      style={{ height: `${(amp * amp) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Universe B */}
            <div className="universe universe-b">
              <h2 className="universe-label">UNIVERSE B</h2>
              
              <div className="game-canvas">
                {/* Obstacles */}
                {obstaclesB.map((obs, idx) => (
                  obs.lanes.map(lane => (
                    <div
                      key={`b-${idx}-${lane}`}
                      className="obstacle obstacle-b"
                      style={{
                        left: `${lane * 25}%`,
                        top: `${(obs.y / 800) * 100}%`
                      }}
                    />
                  ))
                ))}

                {/* Vehicle (entangled - same quantum state) */}
                {vehicleData.alive && vehicleData.amplitudes.map((amp, lane) => {
                  const prob = amp * amp;
                  if (prob < 0.01) return null;
                  return (
                    <div
                      key={`vehicle-b-${lane}`}
                      className="vehicle vehicle-b"
                      style={{
                        left: `${lane * 25}%`,
                        top: '62.5%',
                        opacity: prob
                      }}
                    />
                  );
                })}

                {!vehicleData.alive && (
                  <div className="crash-msg">COLLAPSE</div>
                )}
              </div>

              {/* Probability Bars */}
              <div className="probability-bars">
                {vehicleData.amplitudes.map((amp, idx) => (
                  <div key={`prob-b-${idx}`} className="prob-bar-container">
                    <div 
                      className="prob-bar prob-bar-b"
                      style={{ height: `${(amp * amp) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HUD */}
          <div className="hud">
            <div className="entanglement-indicator">⚛ ENTANGLED SUPERPOSITION ⚛</div>
            <div className="score">SCORE: {vehicleData.score}</div>
            <div className="controls-reminder">
              H: Hadamard | ←→: Shift | M: Measure | ESC: Pause
            </div>
          </div>

          {/* Pause Overlay */}
          {paused && (
            <div className="pause-overlay">
              <h1>PAUSED</h1>
              <p>Press ESC or P to resume</p>
            </div>
          )}
        </div>
      )}

      {gameState === 'GAMEOVER' && vehicleData && (
        <div className="gameover-screen">
          <div className="gameover-content">
            <h1 className={vehicleData.score > 800 ? 'success' : 'failure'}>
              {vehicleData.score > 800 ? 'QUANTUM SUCCESS!' : 'WAVEFUNCTION COLLAPSED'}
            </h1>
            <p className="gameover-message">
              {vehicleData.score > 800 
                ? 'You navigated both entangled universes!' 
                : 'Your quantum state was measured by an obstacle'}
            </p>

            <div className="final-score">FINAL SCORE: {vehicleData.score}</div>

            <div className="stats">
              <p>Hadamard Gates Used: {vehicleData.hadamard_uses}</p>
              <p>Successful Measurements: {vehicleData.successful_measures}</p>
              <p>Time Survived: {Math.floor(vehicleData.frames_alive / 60)}s</p>
            </div>

            <div className="education">
              <p>Superposition: Quantum particles exist in multiple states simultaneously</p>
              <p>Entanglement: Particles connected across space, changing together instantly</p>
            </div>

            <button className="menu-btn" onClick={backToMenu}>
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;