import React, { useState, useEffect, useRef } from 'react';
import { getElevators, getRequests, requestElevator } from './api';

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

function ElevatorCar({ elevator, prevFloor }) {
  const top = (TOTAL_FLOORS - elevator.currentFloor) * FLOOR_HEIGHT;
  const [doorOpen, setDoorOpen] = useState(false);
  const prevRef = useRef(elevator.currentFloor);

  useEffect(() => {
    if (prevRef.current !== null && prevRef.current !== elevator.currentFloor) {
      setDoorOpen(false);
    }
    prevRef.current = elevator.currentFloor;
  }, [elevator.currentFloor]);

  useEffect(() => {
    if (elevator.status === 'STOPPED' || elevator.status === 'IDLE') {
      const t = setTimeout(() => setDoorOpen(true), 300);
      return () => clearTimeout(t);
    } else {
      setDoorOpen(false);
    }
  }, [elevator.currentFloor, elevator.status]);

  const pct = elevator.capacity > 0 ? (elevator.currentLoad / elevator.capacity) * 100 : 0;

  return (
    <div
      className={`elevator-car ${doorOpen ? 'door-open' : ''}`}
      style={{ top: `${top}px` }}
    >
      <div className="elevator-name">{elevator.name}</div>
      <div className="elevator-floor-num">F{elevator.currentFloor}</div>
      <div className="doors">
        <div className="door-left" />
        <div className="door-right" />
      </div>
      <div className="load-bar-container">
        <div
          className="load-bar"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: loadColor(elevator.currentLoad, elevator.capacity) }}
        />
      </div>
    </div>
  );
}

function ElevatorShaft({ elevator }) {
  const prevFloorRef = useRef(elevator.currentFloor);
  const prevFloor = prevFloorRef.current;
  prevFloorRef.current = elevator.currentFloor;

  return (
    <div className="shaft">
      <ElevatorCar elevator={elevator} prevFloor={prevFloor} />
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
        {floorNum < TOTAL_FLOORS && (
          <button className="floor-btn-up" onClick={() => onCall(floorNum, floorNum + 1)} title="Call Up">&#9650;</button>
        )}
        {floorNum > 1 && (
          <button className="floor-btn-down" onClick={() => onCall(floorNum, floorNum - 1)} title="Call Down">&#9660;</button>
        )}
      </div>
    </div>
  );
}

function App() {
  const [elevators, setElevators] = useState([]);
  const [requests, setRequests] = useState([]);
  const [fromFloor, setFromFloor] = useState(1);
  const [toFloor, setToFloor] = useState(2);

  useEffect(() => {
    const fetchElevators = async () => {
      try {
        const data = await getElevators();
        setElevators(data);
      } catch (e) {
        console.error('Failed to fetch elevators', e);
      }
    };
    fetchElevators();
    const interval = setInterval(fetchElevators, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getRequests();
        setRequests(data);
      } catch (e) {
        console.error('Failed to fetch requests', e);
      }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCall = async (from, to) => {
    try {
      await requestElevator(from, to);
    } catch (e) {
      console.error('Failed to request elevator', e);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Elevator Control System</h1>
        <p>Building Management</p>
      </header>

      <div className="building">
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
      </div>

      <div className="control-panel">
        <h3>Call Elevator</h3>
        <div className="control-row">
          <label>From Floor:</label>
          <select value={fromFloor} onChange={e => setFromFloor(Number(e.target.value))}>
            {Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="control-row">
          <label>To Floor:</label>
          <select value={toFloor} onChange={e => setToFloor(Number(e.target.value))}>
            {Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button className="call-btn" onClick={() => handleCall(fromFloor, toFloor)}>
          Call Elevator
        </button>
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
    </div>
  );
}

export default App;