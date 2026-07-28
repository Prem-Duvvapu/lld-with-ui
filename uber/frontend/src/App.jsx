import { useState } from 'react';
import BookRide from './components/BookRide';
import RideHistory from './components/RideHistory';
import './App.css';

const USER_ID = 'user1';

const locations = [
  { lat: 12.9716, lng: 77.5946, label: 'MG Road' },
  { lat: 12.9344, lng: 77.6101, label: 'Koramangala' },
  { lat: 12.9815, lng: 77.6365, label: 'Indiranagar' },
  { lat: 12.9279, lng: 77.6271, label: 'JP Nagar' },
  { lat: 12.9586, lng: 77.6500, label: 'Whitefield' },
  { lat: 12.9698, lng: 77.5500, label: 'Malleswaram' },
  { lat: 12.9767, lng: 77.5713, label: 'Vijayanagar' },
  { lat: 12.9116, lng: 77.6839, label: 'HSR Layout' },
];

export default function App() {
  const [page, setPage] = useState('book');

  return (
    <div className="app">
      <header>
        <h1>Uber</h1>
        <p>Ride-Hailing - Low-Level Design</p>
      </header>

      <nav>
        <button className={page === 'book' ? 'active' : ''} onClick={() => setPage('book')}>
          Book a Ride
        </button>
        <button className={page === 'history' ? 'active' : ''} onClick={() => setPage('history')}>
          My Rides
        </button>
      </nav>

      <main>
        {page === 'book' && <BookRide userId={USER_ID} locations={locations} onRideBooked={() => setPage('history')} />}
        {page === 'history' && <RideHistory userId={USER_ID} />}
      </main>
    </div>
  );
}
