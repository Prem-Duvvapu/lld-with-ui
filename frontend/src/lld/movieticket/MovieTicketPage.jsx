import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getMovies, getShows, getSeats, bookSeats } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d0d1a; color: #e0e0e0; }
.mt-app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 28px; color: #f5c518; }
header p { color: #888; font-size: 14px; margin-top: 4px; }
nav { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; }
nav button { padding: 10px 24px; border: 2px solid #f5c518; background: transparent; color: #f5c518; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
nav button.active { background: #f5c518; color: #0d0d1a; }
nav button:hover:not(.active) { background: rgba(245,197,24,0.1); }
main { background: #1a1a2e; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #f5c518; border-radius: 6px; color: #f5c518; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #f5c518; color: #0d0d1a; }
.movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.movie-card { border: 2px solid #333; border-radius: 10px; padding: 20px; background: #16213e; cursor: pointer; transition: all 0.2s; }
.movie-card:hover { border-color: #f5c518; box-shadow: 0 4px 16px rgba(245,197,24,0.15); }
.movie-card h3 { font-size: 18px; color: #f5c518; margin-bottom: 6px; }
.movie-card .genre { font-size: 13px; color: #888; margin-bottom: 4px; }
.movie-card .duration { font-size: 12px; color: #666; }
.movie-card .rating { display: inline-block; margin-top: 8px; padding: 4px 10px; background: #f5c518; color: #0d0d1a; border-radius: 6px; font-weight: 700; font-size: 13px; }
.show-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 12px; }
.show-card { border: 2px solid #333; border-radius: 8px; padding: 14px; background: #16213e; transition: all 0.2s; }
.show-card:hover { border-color: #f5c518; }
.show-card .screen { font-size: 14px; font-weight: 600; color: #f5c518; }
.show-card .time { font-size: 13px; color: #ccc; margin: 4px 0; }
.show-card .seats { font-size: 12px; color: #888; }
.show-card .seats.available { color: #4caf50; }
.show-card .seats.sold-out { color: #f44336; }
.mt-scene { position: relative; width: 100%; height: 380px; background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%); border-radius: 12px; overflow: hidden; border: 1px solid #333; margin-bottom: 12px; }
.mt-screen { position: absolute; top: 15px; left: 20%; right: 20%; height: 40px; background: linear-gradient(90deg, #333, #f5c518, #333); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #0d0d1a; font-weight: 700; opacity: 0; transition: all 0.5s; }
.mt-screen.visible { opacity: 1; }
.mt-seat-grid { position: absolute; top: 80px; left: 10%; right: 10%; bottom: 80px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 10px; }
.mt-seat { width: 100%; aspect-ratio: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; transition: all 0.3s; opacity: 0; transform: scale(0.5); cursor: default; }
.mt-seat.visible { opacity: 1; transform: scale(1); }
.mt-seat.gold { background: #f5c518; color: #0d0d1a; }
.mt-seat.silver { background: #888; color: #fff; }
.mt-seat.selected { box-shadow: 0 0 12px rgba(76,175,80,0.6); border: 2px solid #4caf50; }
.mt-ticket-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a2e; border: 2px solid #f5c518; border-radius: 12px; padding: 20px; text-align: center; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: popIn 0.4s ease-out; min-width: 220px; }
.mt-ticket-popup.done { border-color: #4caf50; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.mt-curtains { position: absolute; top: 0; left: 0; right: 0; height: 60px; background: repeating-linear-gradient(90deg, #8b0000 0px, #8b0000 20px, #a00000 20px, #a00000 40px); opacity: 0; transition: all 0.6s; }
.mt-curtains.visible { opacity: 0.6; }
.mt-poster { position: absolute; left: 10px; top: 70px; width: 60px; height: 90px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; text-align: center; color: #fff; opacity: 0; transition: all 0.5s; }
.mt-poster.visible { opacity: 1; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #333; transition: all 0.3s; }
.step-dot.active { background: #f5c518; box-shadow: 0 0 8px rgba(245,197,24,0.5); }
.step-dot.done { background: #4caf50; }
.alert { text-align: center; padding: 32px; color: #888; font-size: 16px; }
.error { margin-top: 16px; padding: 12px; background: rgba(244,67,54,0.1); color: #f44336; border-radius: 8px; font-size: 14px; }
`;

const MOVIE_POSTERS = {
  'Inception': { bg: '#2c3e50', emoji: '🌀' },
  'The Dark Knight': { bg: '#1a1a2e', emoji: '🦇' },
  'Interstellar': { bg: '#0d1b2a', emoji: '🚀' },
};

function MoviesTab() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [shows, setShows] = useState([]);

  useEffect(() => { getMovies().then(data => { setMovies(data); setLoading(false); }); }, []);

  const handleSelectMovie = async (movie) => {
    setSelectedMovie(movie);
    const data = await getShows(movie.id);
    setShows(data);
  };

  if (loading) return <div className="alert">Loading movies...</div>;

  if (selectedMovie) {
    return (
      <div>
        <button onClick={() => setSelectedMovie(null)} style={{ padding: '8px 16px', border: '1px solid #f5c518', borderRadius: 6, background: 'transparent', color: '#f5c518', cursor: 'pointer', marginBottom: 16, fontWeight: 600 }}>← Back to Movies</button>
        <h2 style={{ color: '#f5c518', marginBottom: 12 }}>{selectedMovie.title}</h2>
        <p style={{ color: '#888', marginBottom: 16 }}>{selectedMovie.genre} • {selectedMovie.duration} min • ⭐ {selectedMovie.rating}</p>
        <h3 style={{ marginBottom: 12 }}>Show Timings</h3>
        {shows.length === 0 ? <div className="alert">No shows available</div> : (
          <div className="show-grid">
            {shows.map(show => (
              <div key={show.id} className="show-card">
                <div className="screen">{show.screen}</div>
                <div className="time">{show.showTime}</div>
                <div className={`seats ${show.availableSeats > 0 ? 'available' : 'sold-out'}`}>
                  {show.availableSeats > 0 ? `${show.availableSeats} seats left` : 'Sold Out'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16, color: '#f5c518' }}>Now Showing</h2>
      <div className="movie-grid">
        {movies.map(movie => {
          const poster = MOVIE_POSTERS[movie.title] || { bg: '#333', emoji: '🎬' };
          return (
            <div key={movie.id} className="movie-card" onClick={() => handleSelectMovie(movie)}>
              <div style={{ width: 60, height: 80, background: poster.bg, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>{poster.emoji}</div>
              <h3>{movie.title}</h3>
              <div className="genre">{movie.genre} • {movie.duration} min</div>
              <div className="rating">⭐ {movie.rating}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatVisible, setSeatVisible] = useState(0);
  const [showCurtains, setShowCurtains] = useState(false);
  const [showScreen, setShowScreen] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [simMovie, setSimMovie] = useState(null);
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Select', 'Seats', 'Book', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => { getMovies().then(data => { if (data.length > 0) setSimMovie(data[0]); }); }, []);

  const reset = () => {
    setStep(0); setLoading(false); setError(''); setSelectedSeats([]);
    setSeatVisible(0); setShowCurtains(false); setShowScreen(false);
    setShowPoster(false); setBookingData(null);
  };

  const totalSeats = 24;
  const seatRows = 4;
  const seatCols = 6;

  const startSim = () => {
    setError(''); setStep(1); setShowCurtains(true); setShowScreen(true); setShowPoster(true);
    for (let i = 0; i <= totalSeats; i++) {
      setTimeout(() => { if (mountedRef.current) setSeatVisible(i); }, i * 50);
    }
  };

  const selectSeatsAction = () => {
    setSelectedSeats([0, 1]);
    setStep(2);
  };

  const bookAction = async () => {
    setError(''); setLoading(true);
    try {
      const data = await bookSeats(1, [1, 2], 'user1');
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBookingData(data); setLoading(false); setStep(3);
    } catch { if (mountedRef.current) { setError('Failed to book'); setLoading(false); } }
  };

  const confirmBooking = () => {
    setStep(4);
  };

  const getSeatType = (idx) => idx < 12 ? 'gold' : 'silver';

  const btnStyle = {
    padding: '8px 20px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', color: '#0d0d1a', transition: 'all 0.2s',
    background: '#f5c518', margin: '0 4px',
  };

  const moviePoster = simMovie ? (MOVIE_POSTERS[simMovie.title] || { bg: '#333', emoji: '🎬' }) : { bg: '#333', emoji: '🎬' };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="mt-scene">
        <div className={`mt-curtains ${showCurtains ? 'visible' : ''}`} />

        <div className={`mt-screen ${showScreen ? 'visible' : ''}`}>🎬 CINEMA SCREEN</div>

        {simMovie && (
          <div className={`mt-poster ${showPoster ? 'visible' : ''}`}
            style={{ background: moviePoster.bg }}>
            {moviePoster.emoji}<br />{simMovie.title}
          </div>
        )}

        <div className="mt-seat-grid">
          {Array.from({ length: totalSeats }).map((_, i) => {
            const type = getSeatType(i);
            const isSelected = selectedSeats.includes(i);
            const r = Math.floor(i / seatCols);
            const c = i % seatCols;
            return (
              <div key={i}
                className={`mt-seat ${type} ${i < seatVisible ? 'visible' : ''} ${isSelected ? 'selected' : ''}`}
                style={{ transitionDelay: `${i * 0.03}s`, gridRow: r + 1, gridColumn: c + 1 }}>
                {r + 1}{String.fromCharCode(65 + c)}
              </div>
            );
          })}
        </div>

        {step === 3 && bookingData && (
          <div className="mt-ticket-popup">
            <div style={{ fontSize: 36, marginBottom: 4 }}>🎟️</div>
            <div style={{ fontWeight: 700, color: '#f5c518', fontSize: 15 }}>Booking Confirmed!</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>ID: {bookingData.id}</div>
            <div style={{ fontSize: 13, color: '#4caf50', fontWeight: 700, marginTop: 4 }}>₹{bookingData.totalAmount?.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{bookingData.seatIds?.length} seats booked</div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-ticket-popup done">
            <div style={{ fontSize: 36, marginBottom: 4 }}>🍿</div>
            <div style={{ fontWeight: 700, color: '#4caf50', fontSize: 15 }}>Enjoy the Show!</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Have a great time 🎉</div>
          </div>
        )}
      </div>

      {error && <div className="error" style={{ marginTop: 12, textAlign: 'center' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#333', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff' }}>↺ Reset</button></div>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {step === 0 && <button onClick={startSim} style={{ padding: '12px 32px', background: '#f5c518', color: '#0d0d1a', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>🎬 Browse Movies</button>}

        {step === 1 && <button onClick={selectSeatsAction} disabled={loading} style={btnStyle}>🎫 Select Show {loading ? '...' : ''}</button>}

        {step === 2 && <button onClick={bookAction} disabled={loading} style={{ ...btnStyle, background: '#4caf50', color: '#fff' }}>💺 Choose Seats {loading ? '...' : ''}</button>}

        {step === 3 && <button onClick={confirmBooking} style={{ ...btnStyle, background: '#2196f3', color: '#fff' }}>🎟️ Book Now</button>}

        {step === 4 && <button onClick={reset} style={{ ...btnStyle, background: '#f5c518' }}>🔄 New Simulation</button>}
      </div>
    </div>
  );
}

export default function MovieTicketPage() {
  const [page, setPage] = useState('movies');

  return (
    <div className="mt-app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header><h1>Movie Ticket Booking</h1><p>Cinema seat reservation system - Low-Level Design</p></header>
      <nav>
        <button className={page === 'movies' ? 'active' : ''} onClick={() => setPage('movies')}>Movies</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'movies' && <MoviesTab />}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'diagram' && <ClassDiagram module="movieticket" />}
        {page === 'design' && <DesignDetails module="movieticket" />}
      </main>
    </div>
  );
}
