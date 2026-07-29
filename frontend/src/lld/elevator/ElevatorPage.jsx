import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getElevators, getRequests, requestElevator } from './api';
import ClassDiagram from '../../components/ClassDiagram';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; color: #333; }
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.header { background: #1a1a2e; color: white; padding: 20px 30px; border-radius: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 22px; font-weight: 600; }
.header p { font-size: 13px; opacity: 0.7; }
.building { display: flex; gap: 4px; background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow-x: auto; }
.floor-list { display: flex; flex-direction: column; min-width: 80px; }
.floor { display: flex; align-items: center; height: 70px; border-bottom: 1px solid #e8e8e8; padding: 0 8px; gap: 8px; }
.floor:last-child { border-bottom: none; }
.floor-label { width: 40px; font-weight: 700; font-size: 15px; color: #555; text-align: center; }
.floor-buttons { display: flex; flex-direction: column; gap: 3px; }
.floor-btn-up, .floor-btn-down { width: 26px; height: 22px; border: none; border-radius: 50%; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s, box-shadow 0.15s; }
.floor-btn-up { background: #4caf50; color: white; }
.floor-btn-down { background: #ff9800; color: white; }
.floor-btn-up:hover, .floor-btn-down:hover { transform: scale(1.15); box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
.elevator-shafts { display: flex; gap: 8px; position: relative; }
.shaft { width: 80px; height: 700px; background: #e0e3e8; border-radius: 6px; border: 1px solid #ccc; position: relative; overflow: visible; }
.elevator-car { position: absolute; left: 0; width: 100%; height: 56px; background: linear-gradient(135deg, #2196f3, #1976d2); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(33,150,243,0.35); z-index: 10; transition: top 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94); overflow: hidden; }
.elevator-name { color: white; font-weight: 700; font-size: 14px; letter-spacing: 1px; z-index: 2; }
.elevator-floor-num { color: rgba(255,255,255,0.85); font-size: 10px; z-index: 2; }
.doors { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; pointer-events: none; z-index: 1; }
.door-left, .door-right { width: 50%; height: 100%; background: #1565c0; transition: transform 0.4s ease; }
.elevator-car.door-open .door-left { transform: translateX(-100%); }
.elevator-car.door-open .door-right { transform: translateX(100%); }
.load-bar-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: rgba(0,0,0,0.2); z-index: 2; }
.load-bar { height: 100%; transition: width 0.4s ease, background-color 0.4s ease; border-radius: 0 0 0 6px; }
.elevator-info { position: absolute; bottom: -32px; left: 0; width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; color: #555; }
.elevator-info .direction { font-size: 12px; display: inline-flex; }
.elevator-info .arrow.up { color: #4caf50; animation: bounceUp 0.6s infinite alternate; }
.elevator-info .arrow.down { color: #ff9800; animation: bounceDown 0.6s infinite alternate; }
.elevator-info .arrow.idle { color: #999; }
.elevator-info .status { font-weight: 600; font-size: 9px; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; }
.elevator-info .status.idle { background: #e0e0e0; color: #666; }
.elevator-info .status.moving { background: #e3f2fd; color: #1565c0; }
.elevator-info .status.stopped { background: #fff3e0; color: #e65100; }
.elevator-info .load-text { font-size: 9px; color: #888; }
.control-panel { background: white; border-radius: 12px; padding: 20px 24px; margin-top: 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.control-panel h3 { margin-bottom: 14px; font-size: 16px; color: #1a1a2e; }
.control-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.control-row label { width: 100px; font-weight: 500; font-size: 14px; }
.control-row select { padding: 8px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: white; cursor: pointer; transition: border-color 0.2s; }
.control-row select:focus { outline: none; border-color: #2196f3; box-shadow: 0 0 0 2px rgba(33,150,243,0.2); }
.call-btn { margin-top: 6px; padding: 10px 28px; background: #1a1a2e; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s; }
.call-btn:hover { background: #16213e; }
.call-btn:active { transform: scale(0.97); }
.request-log { background: white; border-radius: 12px; padding: 20px 24px; margin-top: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.request-log h3 { margin-bottom: 12px; font-size: 16px; color: #1a1a2e; }
.log-entries { max-height: 200px; overflow-y: auto; }
.no-requests { color: #999; font-size: 13px; font-style: italic; }
.log-entry { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.log-entry:last-child { border-bottom: none; }
.log-from, .log-to { font-weight: 600; color: #333; }
.log-arrow { color: #999; }
.log-status { margin-left: auto; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #e3f2fd; color: #1565c0; text-transform: uppercase; }
@keyframes bounceUp { from { transform: translateY(0); } to { transform: translateY(-3px); } }
@keyframes bounceDown { from { transform: translateY(0); } to { transform: translateY(3px); } }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #1a1a2e; border-radius: 6px; color: #1a1a2e; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #1a1a2e; color: white; }
`;

const FLOOR_HEIGHT = 70;
const TOTAL_FLOORS = 10;

function directionArrow(direction) {
  if (direction === 'UP') return <span className="arrow up">&#9650;</span>;
  if (direction === 'DOWN') return <span className="arrow down">&#9660;</span>;
  return <span className="arrow idle">&#9644;</span>;
}

function loadColor(load, capacity) {
  const pct = capacity > 0 ? load / capacity : 0;
  if (pct < 0.5) return '#4caf50';
  if (pct < 0.8) return '#ff9800';
  return '#f44336';
}

function ElevatorCar({ elevator }) {
  const top = (TOTAL_FLOORS - elevator.currentFloor) * FLOOR_HEIGHT;
  const [doorOpen, setDoorOpen] = useState(false);
  const prevRef = useRef(elevator.currentFloor);

  useEffect(() => {
    if (prevRef.current !== null && prevRef.current !== elevator.currentFloor) setDoorOpen(false);
    prevRef.current = elevator.currentFloor;
  }, [elevator.currentFloor]);

  useEffect(() => {
    if (elevator.status === 'STOPPED' || elevator.status === 'IDLE') {
      const t = setTimeout(() => setDoorOpen(true), 300);
      return () => clearTimeout(t);
    } else setDoorOpen(false);
  }, [elevator.currentFloor, elevator.status]);

  const pct = elevator.capacity > 0 ? (elevator.currentLoad / elevator.capacity) * 100 : 0;

  return (
    <div className={`elevator-car ${doorOpen ? 'door-open' : ''}`} style={{ top: `${top}px` }}>
      <div className="elevator-name">{elevator.name}</div>
      <div className="elevator-floor-num">F{elevator.currentFloor}</div>
      <div className="doors"><div className="door-left" /><div className="door-right" /></div>
      <div className="load-bar-container">
        <div className="load-bar" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: loadColor(elevator.currentLoad, elevator.capacity) }} />
      </div>
    </div>
  );
}

function ElevatorShaft({ elevator }) {
  const prevFloorRef = useRef(elevator.currentFloor);
  prevFloorRef.current = elevator.currentFloor;

  return (
    <div className="shaft">
      <ElevatorCar elevator={elevator} />
      <div className="elevator-info">
        <span className="direction">{directionArrow(elevator.direction)}</span>
        <span className={`status ${elevator.status.toLowerCase()}`}>{elevator.status}</span>
        <span className="load-text">{elevator.currentLoad}/{elevator.capacity}</span>
      </div>
    </div>
  );
}

function Floor({ floorNum, onCall }) {
  return (
    <div className="floor">
      <div className="floor-label">{floorNum}</div>
      <div className="floor-buttons">
        {floorNum < TOTAL_FLOORS && <button className="floor-btn-up" onClick={() => onCall(floorNum, floorNum + 1)} title="Call Up">&#9650;</button>}
        {floorNum > 1 && <button className="floor-btn-down" onClick={() => onCall(floorNum, floorNum - 1)} title="Call Down">&#9660;</button>}
      </div>
    </div>
  );
}

export default function ElevatorPage() {
  const [elevators, setElevators] = useState([]);
  const [requests, setRequests] = useState([]);
  const [fromFloor, setFromFloor] = useState(1);
  const [toFloor, setToFloor] = useState(2);
  const [showDiagram, setShowDiagram] = useState(false);

  useEffect(() => {
    const fetchElevators = async () => {
      try { const data = await getElevators(); setElevators(data); }
      catch (e) { console.error('Failed to fetch elevators', e); }
    };
    fetchElevators();
    const interval = setInterval(fetchElevators, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      try { const data = await getRequests(); setRequests(data); }
      catch (e) { console.error('Failed to fetch requests', e); }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCall = async (from, to) => {
    try { await requestElevator(from, to); }
    catch (e) { console.error('Failed to request elevator', e); }
  };

  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="header">
        <div>
          <h1>Elevator Control System</h1>
          <p>Building Management</p>
        </div>
        <button onClick={() => setShowDiagram(!showDiagram)} style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 6, background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {showDiagram ? 'Back to App' : '📐 Class Diagram'}
        </button>
      </header>
      {showDiagram ? <ClassDiagram module="elevator" /> : (<>
        <div className="floor-list">
          {Array.from({ length: TOTAL_FLOORS }, (_, i) => TOTAL_FLOORS - i).map((num) => (
            <Floor key={num} floorNum={num} onCall={handleCall} />
          ))}
        </div>
        <div className="elevator-shafts">
          {elevators.map((elevator) => (
            <ElevatorShaft key={elevator.id} elevator={elevator} />
          ))}
        </div>
      <div className="control-panel">
        <h3>Call Elevator</h3>
        <div className="control-row">
          <label>From Floor:</label>
          <select value={fromFloor} onChange={e => setFromFloor(Number(e.target.value))}>
            {Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="control-row">
          <label>To Floor:</label>
          <select value={toFloor} onChange={e => setToFloor(Number(e.target.value))}>
            {Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="call-btn" onClick={() => handleCall(fromFloor, toFloor)}>Call Elevator</button>
      </div>
      <div className="request-log">
        <h3>Request Log</h3>
        <div className="log-entries">
          {requests.length === 0 && <p className="no-requests">No requests yet.</p>}
          {requests.slice().reverse().map((req, idx) => (
            <div key={req.id || idx} className="log-entry">
              <span className="log-from">F{req.fromFloor}</span>
              <span className="log-arrow">&rarr;</span>
              <span className="log-to">F{req.toFloor}</span>
              <span className="log-status">{req.status || 'PENDING'}</span>
            </div>
          ))}
        </div>
      </div>
      </>)}
    </div>
  );
}
