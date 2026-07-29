import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.cr-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.cr-stage { position: relative; width: 100%; height: 320px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: 12px; border: 1px solid var(--border-primary); overflow: hidden; padding: 20px; margin-bottom: 20px; }

.fleet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
.car-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 14px; text-align: center; cursor: pointer; transition: all 0.3s; }
.car-card.selected { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.03); }
.car-card.rented { border-color: var(--danger); opacity: 0.7; }

.road-strip { position: absolute; bottom: 30px; left: 0; right: 0; height: 50px; background: #2d2d2d; border-top: 3px solid #555; border-bottom: 3px solid #555; }
.animated-rental-car { position: absolute; bottom: 40px; font-size: 32px; transition: all 2.5s cubic-bezier(0.4, 0, 0.2, 1); }

.cr-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid var(--accent); border-radius: 12px; padding: 20px; text-align: center; min-width: 260px; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
`;

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [selectedCar, setSelectedCar] = useState(null);
  const [days, setDays] = useState(3);
  const [carLeft, setCarLeft] = useState(-60);
  const [booking, setBooking] = useState(null);

  const fleet = [
    { id: 'C1', name: 'Tesla Model 3', category: 'ELECTRIC', rate: 120, icon: '⚡🏎️' },
    { id: 'C2', name: 'BMW X5', category: 'SUV', rate: 150, icon: '🚙' },
    { id: 'C3', name: 'Honda Civic', category: 'SEDAN', rate: 70, icon: '🚗' },
    { id: 'C4', name: 'Mustang GT', category: 'LUXURY', rate: 200, icon: '🏎️' },
  ];

  const steps = ['Select Vehicle', 'Book Rental', 'Active Drive', 'Returned'];

  const handleBook = () => {
    if (!selectedCar) return;
    const total = selectedCar.rate * days + 25; // rate * days + insurance
    setBooking({
      id: `RES-${Math.floor(Math.random() * 90000 + 10000)}`,
      car: selectedCar,
      days,
      total,
    });
    setStep(1);
  };

  const handleStartDrive = () => {
    setStep(2);
    setCarLeft(40);
    setTimeout(() => setCarLeft(450), 400);
  };

  const handleReturn = () => {
    setCarLeft(850);
    setTimeout(() => {
      setStep(3);
    }, 1500);
  };

  const reset = () => {
    setStep(0);
    setSelectedCar(null);
    setCarLeft(-60);
    setBooking(null);
  };

  return (
    <div className="cr-container">
      <style>{CSS}</style>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {steps.map((s, idx) => (
          <div key={s} style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: idx === step ? 'var(--accent)' : 'var(--bg-tertiary)', color: idx === step ? '#fff' : 'var(--text-muted)' }}>
            {idx + 1}. {s}
          </div>
        ))}
      </div>

      <div className="cr-stage">
        {step === 0 && (
          <div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
              SELECT VEHICLE FROM RENTAL FLEET
            </div>
            <div className="fleet-grid">
              {fleet.map(c => (
                <div key={c.id} className={`car-card ${selectedCar?.id === c.id ? 'selected' : ''}`} onClick={() => setSelectedCar(c)}>
                  <div style={{ fontSize: 32 }}>{c.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.category} · ${c.rate}/day</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Road and animated car */}
        {(step >= 1) && (
          <>
            <div className="road-strip" />
            <div className="animated-rental-car" style={{ left: carLeft }}>
              {selectedCar?.icon || '🚗'}
            </div>
          </>
        )}

        {/* Reservation Details Popup */}
        {step === 1 && booking && (
          <div className="cr-popup">
            <div style={{ fontSize: 28 }}>🔑</div>
            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>Rental Ticket Confirmed</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Res #: {booking.id}</div>
            <div style={{ margin: '8px 0', fontSize: 13 }}>
              <strong>{booking.car.name}</strong> · {booking.days} Days
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>${booking.total}.00</div>
          </div>
        )}

        {/* Returned Invoice Popup */}
        {step === 3 && booking && (
          <div className="cr-popup" style={{ borderColor: 'var(--success)' }}>
            <div style={{ fontSize: 28 }}>🧾</div>
            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>Vehicle Returned</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Inspection Passed · Full Fuel</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Total Paid: ${booking.total}.00</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {step === 0 && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              Duration:
              <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
              </select>
            </label>
            <button className="sim-btn primary" onClick={handleBook} disabled={!selectedCar} style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Confirm Rental Reservation
            </button>
          </>
        )}

        {step === 1 && (
          <button onClick={handleStartDrive} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            🔑 Pick Up Keys & Drive Away
          </button>
        )}

        {step === 2 && (
          <button onClick={handleReturn} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            🅿️ Return Vehicle to Drop-off Station
          </button>
        )}

        {step === 3 && (
          <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            🔄 New Rental Reservation
          </button>
        )}
      </div>
    </div>
  );
}

export default function CarRentalPage() {
  return (
    <LldPage module="car-rental" title="Car Rental System" icon="🚙" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
