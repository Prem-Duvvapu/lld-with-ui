import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import { BACKEND_PORT } from '../../utils/api';
import {
  getRooms, getMeetings, bookMeeting, cancelMeeting,
  simReset, simSeedRoom, simGetRooms, simGetMeetings, simBookMeeting, simCancelMeeting,
} from './api';

const CSS = `
.ms-container { display: grid; gap: 20px; }
.ms-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.ms-form { display: grid; gap: 10px; }
.ms-form label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.ms-form input, .ms-form select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.ms-btn { padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; border: none; background: var(--accent-gradient); color: #fff; }
.ms-btn.danger { background: var(--danger); }
.ms-btn:hover { opacity: 0.9; }
.ms-meeting-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; background: var(--bg-primary); border: 1px solid var(--border-primary); margin-bottom: 8px; }
.ms-meeting-title { font-weight: 700; font-size: 13px; }
.ms-meeting-meta { font-size: 11px; color: var(--text-muted); }
.ms-banner { border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
.ms-banner.error { background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); padding: 10px 14px; }
.ms-banner.success { background: rgba(34,197,94,0.12); border: 1px solid #22c55e; color: #22c55e; padding: 10px 14px; }

/* Simulation timeline */
.ms-timeline-track { position: relative; height: 56px; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; margin-bottom: 14px; }
.ms-timeline-label { font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--text-primary); }
.ms-timeline-block { position: absolute; top: 6px; bottom: 6px; border-radius: 6px; background: var(--accent-gradient); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 4px; overflow: hidden; white-space: nowrap; }
.ms-hud { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ms-hud-tile { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; text-align: center; }
.ms-hud-value { font-size: 20px; font-weight: 800; color: var(--accent); }
.ms-hud-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ms-step-log { font-family: monospace; font-size: 12px; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 10px; max-height: 160px; overflow-y: auto; }
`;

function timeToPercent(iso) {
  const d = new Date(iso);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const dayStart = 9 * 60, dayEnd = 18 * 60; // 9am-6pm window
  return Math.max(0, Math.min(100, ((minutes - dayStart) / (dayEnd - dayStart)) * 100));
}

function Timeline({ label, meetings }) {
  return (
    <div>
      <div className="ms-timeline-label">{label}</div>
      <div className="ms-timeline-track">
        {meetings.filter((m) => m.status === 'SCHEDULED').map((m) => {
          const left = timeToPercent(m.start);
          const right = timeToPercent(m.end);
          return (
            <div key={m.id} className="ms-timeline-block"
              style={{ left: `${left}%`, width: `${Math.max(right - left, 3)}%` }}
              title={`${m.title} (${m.organizerId})`}>
              {m.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppTab() {
  const [rooms, setRooms] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [form, setForm] = useState({ roomId: '', organizerId: '', attendeeIds: '', title: '', start: '', end: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = async () => {
    try {
      const [r, m] = await Promise.all([getRooms(), getMeetings()]);
      setRooms(r);
      setMeetings(m);
      if (!form.roomId && r.length) setForm((f) => ({ ...f, roomId: r[0].id }));
    } catch (err) {
      setError(err?.message || 'Failed to load meeting scheduler state');
    }
  };

  usePolling(load, 5000, []);

  const handleBook = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const attendeeIds = form.attendeeIds.split(',').map((s) => s.trim()).filter(Boolean);
      await bookMeeting(form.roomId, {
        organizerId: form.organizerId, attendeeIds, title: form.title,
        start: form.start, end: form.end,
      });
      setSuccess('Meeting booked.');
      setForm((f) => ({ ...f, title: '', attendeeIds: '' }));
      load();
    } catch (err) {
      setError(err?.message || 'Failed to book meeting');
    }
  };

  const handleCancel = async (meetingId) => {
    try {
      await cancelMeeting(meetingId);
      load();
    } catch (err) {
      setError(err?.message || 'Failed to cancel meeting');
    }
  };

  return (
    <div className="ms-container">
      <style>{CSS}</style>
      {error && (
        <div className="ms-banner error">
          ⚠ {error}
          <button className="ms-btn danger" style={{ marginLeft: 12, padding: '4px 10px' }} onClick={load}>Retry</button>
        </div>
      )}
      {success && <div className="ms-banner success">✓ {success}</div>}

      <div className="ms-grid">
        <div className="ms-panel">
          <h3 style={{ marginTop: 0 }}>Book a Meeting</h3>
          <form className="ms-form" onSubmit={handleBook}>
            <label>Room</label>
            <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} required>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (cap {r.capacity})</option>)}
            </select>
            <label>Organizer ID</label>
            <input value={form.organizerId} onChange={(e) => setForm({ ...form, organizerId: e.target.value })} placeholder="alice@example.com" required />
            <label>Attendee IDs (comma-separated)</label>
            <input value={form.attendeeIds} onChange={(e) => setForm({ ...form, attendeeIds: e.target.value })} placeholder="bob@example.com, carol@example.com" />
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <label>Start</label>
            <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            <label>End</label>
            <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
            <button className="ms-btn" type="submit">Book Meeting</button>
          </form>
        </div>

        <div className="ms-panel">
          <h3 style={{ marginTop: 0 }}>Scheduled Meetings</h3>
          {meetings.filter((m) => m.status === 'SCHEDULED').length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No meetings scheduled yet.</div>
          )}
          {meetings.filter((m) => m.status === 'SCHEDULED').map((m) => (
            <div key={m.id} className="ms-meeting-row">
              <div>
                <div className="ms-meeting-title">{m.title}</div>
                <div className="ms-meeting-meta">
                  {rooms.find((r) => r.id === m.roomId)?.name || m.roomId} · {m.organizerId} · {new Date(m.start).toLocaleString()}
                </div>
              </div>
              <button className="ms-btn danger" onClick={() => handleCancel(m.id)}>Cancel</button>
            </div>
          ))}
        </div>
      </div>

      <div className="ms-panel">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Backend not reachable? Confirm it is running on port {BACKEND_PORT}.
        </p>
      </div>
    </div>
  );
}

const SIM_STEPS = [
  { title: 'Reset Sandbox', detail: 'Wipe and reseed two demo rooms: Falcon and Griffin.' },
  { title: 'Book Meeting A', detail: 'Alice books Falcon 10:00–11:00 with attendee Bob.' },
  { title: 'Book Meeting B', detail: 'Carol books Griffin 10:00–11:00 with attendee Dave — different room, no conflict.' },
  { title: 'Room Conflict', detail: 'Erin tries to book Falcon 10:30–12:00 — rejected: the room is already taken.' },
  { title: 'Attendee Conflict', detail: 'Frank tries to book Bob into Griffin 10:30–12:00 — rejected: Bob is already in Meeting A, in a different room.' },
  { title: 'Non-Overlapping Booking', detail: 'Grace books Falcon 14:00–15:00 — succeeds, no overlap with Meeting A.' },
  { title: 'Cancel Meeting A', detail: 'Meeting A is cancelled, freeing Falcon 10:00–11:00 and Bob’s calendar.' },
  { title: 'Re-book the Freed Slot', detail: 'Helen books Falcon 10:00–11:00 — succeeds now that it is free again.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [log, setLog] = useState([]);
  const [lastMeetingA, setLastMeetingA] = useState(null);
  const [error, setError] = useState(null);

  const addLog = (msg, kind = 'info') =>
    setLog((prev) => [{ msg, kind, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 12));

  const refresh = async () => {
    const [r, m] = await Promise.all([simGetRooms(), simGetMeetings()]);
    setRooms(r);
    setMeetings(m);
    return { r, m };
  };

  const findRoom = (rooms, name) => rooms.find((r) => r.name === name);

  const todayIso = (hour, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString().slice(0, 19);
  };

  async function runStep() {
    setError(null);
    try {
      if (step === 0) {
        await simReset();
        await simSeedRoom({ name: 'Falcon', capacity: 8 });
        await simSeedRoom({ name: 'Griffin', capacity: 4 });
        await refresh();
        addLog('Sandbox reset. Rooms seeded: Falcon, Griffin.', 'success');
      } else if (step === 1) {
        const { r } = await refresh();
        const falcon = findRoom(r, 'Falcon');
        const meeting = await simBookMeeting(falcon.id, {
          organizerId: 'alice', attendeeIds: ['bob'], title: 'Meeting A',
          start: todayIso(10), end: todayIso(11),
        });
        setLastMeetingA(meeting);
        await refresh();
        addLog('Meeting A booked: Falcon 10:00-11:00 (Alice, Bob).', 'success');
      } else if (step === 2) {
        const { r } = await refresh();
        const griffin = findRoom(r, 'Griffin');
        await simBookMeeting(griffin.id, {
          organizerId: 'carol', attendeeIds: ['dave'], title: 'Meeting B',
          start: todayIso(10), end: todayIso(11),
        });
        await refresh();
        addLog('Meeting B booked: Griffin 10:00-11:00 (Carol, Dave). Different room — no conflict.', 'success');
      } else if (step === 3) {
        const { r } = await refresh();
        const falcon = findRoom(r, 'Falcon');
        try {
          await simBookMeeting(falcon.id, {
            organizerId: 'erin', attendeeIds: [], title: 'Should Be Rejected',
            start: todayIso(10, 30), end: todayIso(12),
          });
          addLog('Unexpected: booking should have been rejected!', 'error');
        } catch (err) {
          addLog(`Rejected as expected: ${err.message}`, 'rejected');
        }
        await refresh();
      } else if (step === 4) {
        const { r } = await refresh();
        const griffin = findRoom(r, 'Griffin');
        try {
          await simBookMeeting(griffin.id, {
            organizerId: 'frank', attendeeIds: ['bob'], title: 'Should Be Rejected',
            start: todayIso(10, 30), end: todayIso(12),
          });
          addLog('Unexpected: booking should have been rejected!', 'error');
        } catch (err) {
          addLog(`Rejected as expected: ${err.message}`, 'rejected');
        }
        await refresh();
      } else if (step === 5) {
        const { r } = await refresh();
        const falcon = findRoom(r, 'Falcon');
        await simBookMeeting(falcon.id, {
          organizerId: 'grace', attendeeIds: [], title: 'Meeting C',
          start: todayIso(14), end: todayIso(15),
        });
        await refresh();
        addLog('Meeting C booked: Falcon 14:00-15:00 — no overlap with Meeting A.', 'success');
      } else if (step === 6) {
        if (lastMeetingA) {
          await simCancelMeeting(lastMeetingA.id);
          addLog('Meeting A cancelled. Falcon 10:00-11:00 and Bob’s calendar are free again.', 'success');
        }
        await refresh();
      } else if (step === 7) {
        const { r } = await refresh();
        const falcon = findRoom(r, 'Falcon');
        await simBookMeeting(falcon.id, {
          organizerId: 'helen', attendeeIds: [], title: 'Meeting D',
          start: todayIso(10), end: todayIso(11),
        });
        await refresh();
        addLog('Meeting D booked into the now-free 10:00-11:00 slot on Falcon.', 'success');
      }
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      setError(err?.message || 'Simulation step failed');
    }
  }

  const activeMeetings = meetings.filter((m) => m.status === 'SCHEDULED').length;

  return (
    <div className="ms-container">
      <style>{CSS}</style>

      <div className="ms-panel">
        <div className="step-indicator" style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {SIM_STEPS.map((s, i) => (
            <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}
              style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: i < step ? 'rgba(34,197,94,0.15)' : i === step ? 'var(--accent-gradient)' : 'var(--bg-primary)',
                color: i < step ? '#22c55e' : i === step ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
              }}>
              {i + 1}
            </div>
          ))}
        </div>

        {step < SIM_STEPS.length ? (
          <>
            <h3 style={{ margin: '0 0 6px' }}>{SIM_STEPS[step].title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{SIM_STEPS[step].detail}</p>
            {error && <div className="ms-banner error">⚠ {error}</div>}
            <button className="ms-btn" onClick={runStep}>▶ Run Step {step + 1}</button>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 6px' }}>Simulation Complete</h3>
            <button className="ms-btn" onClick={() => { setStep(0); setLog([]); setLastMeetingA(null); }}>↻ Restart</button>
          </>
        )}
      </div>

      <div className="ms-hud">
        <div className="ms-hud-tile"><div className="ms-hud-value">{rooms.length}</div><div className="ms-hud-label">Rooms</div></div>
        <div className="ms-hud-tile"><div className="ms-hud-value">{activeMeetings}</div><div className="ms-hud-label">Active Meetings</div></div>
        <div className="ms-hud-tile"><div className="ms-hud-value">{meetings.length - activeMeetings}</div><div className="ms-hud-label">Cancelled</div></div>
      </div>

      <div className="ms-panel">
        <h4 style={{ marginTop: 0 }}>Room Timelines (9:00–18:00)</h4>
        {rooms.map((r) => (
          <Timeline key={r.id} label={r.name} meetings={meetings.filter((m) => m.roomId === r.id)} />
        ))}
      </div>

      <div className="ms-panel">
        <h4 style={{ marginTop: 0 }}>Event Log</h4>
        <div className="ms-step-log">
          {log.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Run a step to see events here.</div>}
          {log.map((l, i) => (
            <div key={i} style={{
              color: l.kind === 'rejected' ? '#eab308' : l.kind === 'error' ? 'var(--danger)' : l.kind === 'success' ? '#22c55e' : 'var(--text-muted)',
            }}>
              [{l.ts}] {l.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MeetingSchedulerPage() {
  return (
    <LldPage module="meeting-scheduler" title="Meeting Scheduler" icon="📅" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
