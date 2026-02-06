import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const CLIENT_ID = Math.random().toString(36).substring(7);

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [vehicleData, setVehicleData] = useState(null);
  const [obstaclesA, setObstaclesA] = useState([]);
  const [obstaclesB, setObstaclesB] = useState([]);
  const [distance, setDistance] = useState(10000);
  const [paused, setPaused] = useState(false);
  const [crashState, setCrashState] = useState(null); // Store crash state
  const wsRef = useRef(null);

  useEffect(() => {
    if (gameState === 'PLAYING') {
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
          
          if (!data.running && data.vehicle && !data.vehicle.alive) {
            // Game over - save the crash state
            setCrashState({
              vehicle: data.vehicle,
              obstaclesA: data.obstacles_A,
              obstaclesB: data.obstacles_B
            });
            setGameState('GAMEOVER');
          } else if (!data.running) {
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, paused]);

  const startGame = () => {
    setCrashState(null);
    setGameState('PLAYING');
  };

  const backToMenu = () => {
    setCrashState(null);
    setGameState('MENU');
  };

  const progress = vehicleData ? ((10000 - distance) / 10000) * 100 : 0;

  // Use crash state if game is over, otherwise use live state
  const displayVehicle = crashState ? crashState.vehicle : vehicleData;
  const displayObstaclesA = crashState ? crashState.obstaclesA : obstaclesA;
  const displayObstaclesB = crashState ? crashState.obstaclesB : obstaclesB;

  return (
    <div className="App">
      {gameState === 'MENU' && (
        <div className="menu-screen">
          <div className="menu-content">
            <h1 className="title">Q-RACING</h1>
            <p className="subtitle">Quantum Mechanics Racing Simulator</p>
            
            <div className="concepts">
              <div className="concept">
                <p><strong>SUPERPOSITION:</strong> Your vehicle exists in multiple lanes simultaneously</p>
              </div>
              <div className="concept">
                <p><strong>ENTANGLEMENT:</strong> Two universes connected - actions affect both instantly</p>
              </div>
            </div>

            <div className="controls-info">
              <h3>Controls</h3>
              <p><kbd>H</kbd> - Hadamard Gate (enter superposition - 50% survival chance if you hit obstacle)</p>
              <p><kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> - Move left/right</p>
              <p><kbd>ESC</kbd> or <kbd>P</kbd> - Pause game</p>
            </div>

            <div className="strategy-info">
              <h3>Strategy</h3>
              <p>Classical state (normal): Hitting any obstacle = instant death</p>
              <p>Superposition state (H key): Hitting obstacle = 50% chance to survive</p>
              <p>Use Hadamard wisely to gamble your way through tough spots!</p>
            </div>

            <button className="start-btn" onClick={startGame}>
              START GAME
            </button>

            <p className="footer">Dr. Shenglong Xu's Research Group - Texas A&M University</p>
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && displayVehicle && (
        <div className="game-screen">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="universes-container">
            
            {/* Universe A */}
            <div className="universe universe-a">
              <h2 className="universe-label">UNIVERSE A</h2>
              
              <div className="game-canvas">
                {displayObstaclesA.map((obs, idx) => (
                  obs.lanes.map(lane => (
                    <div
                      key={`a-${idx}-${lane}`}
                      className={`obstacle ${obs.is_measure ? 'measure-obstacle' : ''}`}
                      style={{
                        left: `${lane * 25}%`,
                        top: `${(obs.y / 800) * 100}%`
                      }}
                    />
                  ))
                ))}

                {displayVehicle.alive && displayVehicle.amplitudes.map((amp, lane) => {
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

                {!displayVehicle.alive && (
                  <div className="crash-msg">WAVEFUNCTION COLLAPSED</div>
                )}
              </div>

              <div className="probability-bars">
                {displayVehicle.amplitudes.map((amp, idx) => (
                  <div key={`prob-a-${idx}`} className="prob-bar-container">
                    <div 
                      className="prob-bar prob-bar-a"
                      style={{ height: `${(amp * amp) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="divider"></div>

            {/* Universe B */}
            <div className="universe universe-b">
              <h2 className="universe-label">UNIVERSE B</h2>
              
              <div className="game-canvas">
                {displayObstaclesB.map((obs, idx) => (
                  obs.lanes.map(lane => (
                    <div
                      key={`b-${idx}-${lane}`}
                      className={`obstacle ${obs.is_measure ? 'measure-obstacle' : ''}`}
                      style={{
                        left: `${lane * 25}%`,
                        top: `${(obs.y / 800) * 100}%`
                      }}
                    />
                  ))
                ))}

                {displayVehicle.alive && displayVehicle.amplitudes.map((amp, lane) => {
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

                {!displayVehicle.alive && (
                  <div className="crash-msg">WAVEFUNCTION COLLAPSED</div>
                )}
              </div>

              <div className="probability-bars">
                {displayVehicle.amplitudes.map((amp, idx) => (
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

          <div className="hud">
            <div className="entanglement-indicator">ENTANGLED SUPERPOSITION</div>
            <div className="score">SCORE: {displayVehicle.score}</div>
            <div className="controls-reminder">
              H: Hadamard (50% survival) | ←→: Move | ESC: Pause
            </div>
          </div>

          {paused && (
            <div className="pause-overlay">
              <h1>PAUSED</h1>
              <p>Press ESC or P to resume</p>
            </div>
          )}

          {!displayVehicle.alive && gameState === 'PLAYING' && (
            <div className="gameover-overlay">
              <h1>GAME OVER</h1>
              <div className="final-score">SCORE: {displayVehicle.score}</div>
              <button className="retry-btn" onClick={startGame}>RETRY</button>
              <button className="menu-btn" onClick={backToMenu}>MAIN MENU</button>
            </div>
          )}
        </div>
      )}

      {gameState === 'GAMEOVER' && displayVehicle && (
        <div className="gameover-screen">
          <div className="gameover-content">
            <h1 className={displayVehicle.score > 500 ? 'success' : 'failure'}>
              {displayVehicle.score > 500 ? 'QUANTUM SUCCESS!' : 'WAVEFUNCTION COLLAPSED'}
            </h1>
            <p className="gameover-message">
              {displayVehicle.score > 500 
                ? 'You navigated both entangled universes!' 
                : 'The measurement collapsed your quantum state'}
            </p>

            <div className="final-score">FINAL SCORE: {displayVehicle.score}</div>

            <div className="stats">
              <p>Hadamard Gates Used: {displayVehicle.hadamard_uses}</p>
              <p>Time Survived: {Math.floor(displayVehicle.frames_alive / 60)}s</p>
            </div>

            <div className="education">
              <p>Superposition: Quantum particles exist in multiple states simultaneously</p>
              <p>Entanglement: Particles connected across space, changing together instantly</p>
            </div>

            <button className="retry-btn" onClick={startGame}>RETRY</button>
            <button className="menu-btn" onClick={backToMenu}>MAIN MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;