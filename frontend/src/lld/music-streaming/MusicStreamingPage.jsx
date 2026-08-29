import { useCallback, useEffect, useMemo, useState } from 'react';
import LldPage from '../../components/LldPage';
import StepIndicator from '../../components/ui/StepIndicator';
import { usePolling } from '../../hooks/usePolling';
import * as api from './api';

const CSS = `
.ms-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ms-banner { max-width: 720px; margin: 0 auto 16px auto; padding: 10px 14px; border-radius: 8px; font-size: 13px; text-align: center; }
.ms-banner.ok { background: rgba(34,197,94,0.12); color: var(--success, #22c55e); border: 1px solid rgba(34,197,94,0.3); }
.ms-banner.bad { background: rgba(239,68,68,0.12); color: var(--danger, #ef4444); border: 1px solid rgba(239,68,68,0.3); }

.ms-user-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 18px; }
.ms-user-pill { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 16px; border-radius: 12px; border: 2px solid var(--border-primary); background: var(--bg-card); cursor: pointer; min-width: 120px; }
.ms-user-pill.active { border-color: var(--accent); background: rgba(102,126,234,0.1); }
.ms-user-name { font-weight: 700; font-size: 14px; color: var(--text-primary); }
.ms-user-plan { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 10px; margin-top: 2px; }
.ms-user-plan.FREE { background: rgba(148,163,184,0.2); color: var(--text-muted); }
.ms-user-plan.PREMIUM { background: rgba(102,126,234,0.2); color: var(--accent); }
.ms-user-plan.FAMILY { background: rgba(34,197,94,0.2); color: var(--success, #22c55e); }

.ms-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; }
@media (max-width: 900px) { .ms-grid { grid-template-columns: 1fr; } }

.ms-panel { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 16px; }
.ms-panel h3 { margin: 0 0 10px 0; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

.ms-song-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); margin-bottom: 6px; }
.ms-song-meta { display: flex; flex-direction: column; }
.ms-song-title { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.ms-song-sub { font-size: 11px; color: var(--text-muted); }
.ms-song-actions { display: flex; gap: 6px; }
.ms-btn { border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
.ms-btn.play { background: var(--accent-gradient); color: #fff; }
.ms-btn.like { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.ms-btn.like.active { background: rgba(239,68,68,0.15); color: var(--danger, #ef4444); border-color: rgba(239,68,68,0.4); }
.ms-btn.dl { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.ms-btn.dl.active { background: rgba(34,197,94,0.15); color: var(--success, #22c55e); border-color: rgba(34,197,94,0.4); }
.ms-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ms-session-card { border: 2px solid var(--accent); border-radius: 12px; padding: 12px; margin-bottom: 8px; background: rgba(102,126,234,0.06); }
.ms-waves { display: flex; gap: 3px; align-items: flex-end; height: 24px; margin: 6px 0; }
.ms-wave-bar { width: 4px; background: var(--accent); border-radius: 2px; animation: ms-bounce 0.9s ease-in-out infinite; }
@keyframes ms-bounce { 0%, 100% { height: 6px; } 50% { height: 22px; } }

.ms-plan-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ms-plan-btn { flex: 1; min-width: 100px; padding: 8px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 12px; font-weight: 700; cursor: pointer; }
.ms-plan-btn.active { border-color: var(--accent); background: rgba(102,126,234,0.12); }
.ms-plan-desc { font-size: 10px; color: var(--text-muted); font-weight: 500; margin-top: 2px; }

.ms-empty { font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px; }

.ms-sim-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 14px 0; }
.ms-hud-cell { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; text-align: center; }
.ms-hud-cell dt { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ms-hud-cell dd { margin: 4px 0 0 0; font-size: 15px; font-weight: 800; color: var(--text-primary); }
.ms-hud-cell dd.ok { color: var(--success, #22c55e); }
.ms-hud-cell dd.bad { color: var(--danger, #ef4444); }
.ms-hud-cell dd.idle { color: var(--text-muted); }

.ms-device-rack { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 16px 0; }
.ms-device { width: 84px; padding: 10px 6px; border-radius: 10px; border: 2px solid var(--border-primary); background: var(--bg-card); text-align: center; font-size: 20px; transition: all 0.3s; }
.ms-device.won { border-color: var(--success, #22c55e); background: rgba(34,197,94,0.12); }
.ms-device.rejected { border-color: var(--danger, #ef4444); background: rgba(239,68,68,0.1); opacity: 0.7; }
.ms-device-label { font-size: 10px; font-weight: 700; margin-top: 4px; color: var(--text-primary); }

.ms-log { text-align: center; font-size: 13px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 10px; margin: 12px auto; max-width: 640px; }
.ms-log.bad { color: var(--danger, #ef4444); border-color: rgba(239,68,68,0.4); }

.ms-events { max-height: 220px; overflow-y: auto; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 10px; margin-top: 12px; }
.ms-event { font-size: 11px; padding: 4px 0; border-bottom: 1px dashed var(--border-primary); color: var(--text-secondary); }
.ms-event:last-child { border-bottom: none; }

.ms-controls { display: flex; gap: 10px; justify-content: center; margin: 14px 0; }
.ms-action-btn { padding: 10px 18px; border-radius: 20px; border: none; color: #fff; font-weight: 700; cursor: pointer; font-size: 13px; }
.ms-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PLAN_LABELS = {
  FREE: { title: 'Free', desc: '1 stream · ads · 6 skips/hr' },
  PREMIUM: { title: 'Premium', desc: '2 streams · ad-free · downloads' },
  FAMILY: { title: 'Family', desc: '6 streams · ad-free · downloads' },
};

/* ============================================================
 *  App Tab — drives the live /api/music-streaming/* endpoints.
 *  Every rule (concurrent-stream cap, skip limit, download gate)
 *  is enforced server-side; this tab only renders what came back.
 * ============================================================ */

function AppTab() {
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [banner, setBanner] = useState(null);
  const [deviceSeq, setDeviceSeq] = useState(1);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getSongs()]).then(([u, s]) => {
      setUsers(u);
      setSongs(s);
      if (u.length > 0) setSelectedUserId(u[0].id);
    }).catch(err => say(err.message, true));
  }, []);

  const say = (message, bad = false) => setBanner({ message, bad });

  const refresh = useCallback(async (signal) => {
    if (!selectedUserId) return;
    const [u, s, pl, rec] = await Promise.all([
      api.getUser(selectedUserId),
      api.getActiveSessions(selectedUserId),
      api.getPlaylistsForUser(selectedUserId),
      api.getRecommendations(selectedUserId, 5),
    ]);
    if (signal?.aborted) return;
    setUser(u);
    setSessions(s);
    setPlaylists(pl);
    setRecommendations(rec);
  }, [selectedUserId]);

  usePolling(refresh, 4000, [selectedUserId]);

  const songById = useMemo(() => Object.fromEntries(songs.map(s => [s.id, s])), [songs]);

  const play = async (songId) => {
    try {
      const deviceId = `Web Player ${deviceSeq}`;
      setDeviceSeq(n => n + 1);
      await api.startPlayback(selectedUserId, songId, deviceId);
      say(`▶ Streaming "${songById[songId]?.title}" on ${deviceId}`);
      await refresh();
    } catch (err) {
      say(err.message, true);
    }
  };

  const stop = async (sessionId) => {
    try {
      await api.stopPlayback(sessionId);
      await refresh();
    } catch (err) {
      say(err.message, true);
    }
  };

  const skip = async (sessionId) => {
    try {
      await api.skipPlayback(sessionId);
      say('⏭ Skipped');
      await refresh();
    } catch (err) {
      say(err.message, true);
    }
  };

  const toggleLike = async (songId) => {
    try {
      if (user?.likedSongIds?.includes(songId)) {
        await api.unlikeSong(selectedUserId, songId);
      } else {
        await api.likeSong(selectedUserId, songId);
      }
      await refresh();
    } catch (err) {
      say(err.message, true);
    }
  };

  const download = async (songId) => {
    try {
      await api.downloadSong(selectedUserId, songId);
      say(`⬇ Downloaded "${songById[songId]?.title}" for offline playback`);
      await refresh();
    } catch (err) {
      say(err.message, true);
    }
  };

  const changePlan = async (plan) => {
    try {
      await api.changeSubscription(selectedUserId, plan);
      say(`Switched to ${plan}`);
      await refresh();
    } catch (err) {
      say(err.message, true);
    }
  };

  return (
    <div className="ms-container">
      <style>{CSS}</style>

      {banner && <div className={`ms-banner ${banner.bad ? 'bad' : 'ok'}`}>{banner.message}</div>}

      <div className="ms-user-row">
        {users.map(u => (
          <div
            key={u.id}
            className={`ms-user-pill ${u.id === selectedUserId ? 'active' : ''}`}
            onClick={() => { setSelectedUserId(u.id); setBanner(null); }}
          >
            <span className="ms-user-name">{u.name}</span>
            <span className={`ms-user-plan ${u.subscription.plan}`}>{u.subscription.plan}</span>
          </div>
        ))}
      </div>

      <div className="ms-grid">
        <div className="ms-panel">
          <h3>Catalog</h3>
          {songs.map(s => (
            <div key={s.id} className="ms-song-row">
              <div className="ms-song-meta">
                <span className="ms-song-title">{s.title}</span>
                <span className="ms-song-sub">{s.artistName} · {s.genre} · {s.playCount} plays</span>
              </div>
              <div className="ms-song-actions">
                <button className="ms-btn play" onClick={() => play(s.id)}>▶ Play</button>
                <button
                  className={`ms-btn like ${user?.likedSongIds?.includes(s.id) ? 'active' : ''}`}
                  onClick={() => toggleLike(s.id)}
                >
                  {user?.likedSongIds?.includes(s.id) ? '♥' : '♡'}
                </button>
                <button
                  className={`ms-btn dl ${user?.downloadedSongIds?.includes(s.id) ? 'active' : ''}`}
                  onClick={() => download(s.id)}
                >
                  ⬇
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="ms-panel" style={{ marginBottom: 14 }}>
            <h3>Now Playing ({sessions.length})</h3>
            {sessions.length === 0 && <div className="ms-empty">No active sessions — press Play on a song.</div>}
            {sessions.map(sess => (
              <div key={sess.id} className="ms-session-card">
                <div style={{ fontWeight: 700, fontSize: 13 }}>{songById[sess.songId]?.title || sess.songId}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {sess.deviceId} {sess.adInjected ? '· 📻 ad-supported' : '· 🚫 ad-free'}
                </div>
                <div className="ms-waves">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="ms-wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ms-btn play" onClick={() => skip(sess.id)}>⏭ Skip</button>
                  <button className="ms-btn like" onClick={() => stop(sess.id)}>⏹ Stop</button>
                </div>
              </div>
            ))}
          </div>

          <div className="ms-panel" style={{ marginBottom: 14 }}>
            <h3>Subscription</h3>
            <div className="ms-plan-row">
              {Object.entries(PLAN_LABELS).map(([plan, meta]) => (
                <button
                  key={plan}
                  className={`ms-plan-btn ${user?.subscription?.plan === plan ? 'active' : ''}`}
                  onClick={() => changePlan(plan)}
                >
                  {meta.title}
                  <div className="ms-plan-desc">{meta.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="ms-panel" style={{ marginBottom: 14 }}>
            <h3>Recommended for You</h3>
            {recommendations.length === 0 && <div className="ms-empty">No recommendations yet.</div>}
            {recommendations.map(s => (
              <div key={s.id} className="ms-song-row">
                <div className="ms-song-meta">
                  <span className="ms-song-title">{s.title}</span>
                  <span className="ms-song-sub">{s.artistName} · {s.genre}</span>
                </div>
                <button className="ms-btn play" onClick={() => play(s.id)}>▶</button>
              </div>
            ))}
          </div>

          <div className="ms-panel">
            <h3>Playlists</h3>
            {playlists.length === 0 && <div className="ms-empty">No playlists yet.</div>}
            {playlists.map(p => (
              <div key={p.id} className="ms-song-row">
                <div className="ms-song-meta">
                  <span className="ms-song-title">{p.name}</span>
                  <span className="ms-song-sub">{p.songIds.length} songs {p.isPublic ? '· public' : '· private'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Simulation Tab — drives /api/music-streaming/sim/* only.
 *  The headline demo: N devices race to start a stream on one
 *  account at once, and the per-user lock lets only the plan's
 *  device limit through.
 * ============================================================ */

const SIM_USER_ID = 'U-1';
const SIM_SONG_ID = 'S-1';

const SIM_STEPS = [
  { label: 'Reset', detail: 'Reseed the sandbox — fresh catalog, playlists and users.' },
  { label: 'Downgrade to Free', detail: 'Switch the sim user to FREE — 1 concurrent stream, 6 skips/hr, no downloads.' },
  { label: 'Race (Free)', detail: '5 devices call startStream() at the same instant. The per-user lock lets exactly 1 through.' },
  { label: 'Upgrade to Family', detail: 'Switch the same account to FAMILY — 6 concurrent streams allowed.' },
  { label: 'Race (Family)', detail: '5 devices race again. This time up to 6 can win — the strategy, not the lock, decides how many.' },
  { label: 'Skip limit', detail: 'Switch back to FREE and burn through all 6 hourly skips — the 7th is refused with 429.' },
  { label: 'Download gate', detail: 'A FREE user tries to download a song offline — refused with 403 by the DownloadNotAllowedException.' },
  { label: 'Upgrade & retry', detail: 'Switch to PREMIUM and download the same song — this time it succeeds.' },
];

function SimulationTab() {
  const [events, setEvents] = useState([]);
  const [race, setRace] = useState(null);
  const [simUser, setSimUser] = useState(null);
  const [log, setLog] = useState('Sandbox ready. Step through the eight stages below.');
  const [logBad, setLogBad] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const say = (message, bad = false) => { setLog(message); setLogBad(bad); };

  const refreshEvents = useCallback(async () => {
    const evts = await api.simEvents();
    setEvents(evts || []);
  }, []);

  useEffect(() => {
    api.simReset().then(refreshEvents).catch(err => say(err.message, true));
  }, [refreshEvents]);

  const resetAll = async () => {
    await api.simReset();
    setRace(null);
    setSimUser(null);
    setStep(0);
    say('🔄 Sandbox reset.');
    await refreshEvents();
  };

  const runStep = async () => {
    if (busy) return;
    setBusy(true);
    try {
      switch (step) {
        case 0:
          await resetAll();
          break;

        case 1: {
          const u = await api.simChangeSubscription(SIM_USER_ID, 'FREE');
          setSimUser(u);
          say(`📻 ${u.name} is now on FREE — 1 concurrent stream allowed.`);
          break;
        }

        case 2: {
          const result = await api.simRace(SIM_USER_ID, SIM_SONG_ID, 5);
          setRace(result);
          say(`🔐 ${result.attempts} devices raced on a ${result.plan} account (limit ${result.limit}): `
            + `${result.won} won, ${result.rejected} rejected.`);
          break;
        }

        case 3: {
          const u = await api.simChangeSubscription(SIM_USER_ID, 'FAMILY');
          setSimUser(u);
          say(`👨‍👩‍👧 ${u.name} upgraded to FAMILY — up to 6 concurrent streams.`);
          break;
        }

        case 4: {
          const result = await api.simRace(SIM_USER_ID, SIM_SONG_ID, 8);
          setRace(result);
          say(`🔓 ${result.attempts} devices raced on a ${result.plan} account (limit ${result.limit}): `
            + `${result.won} won, ${result.rejected} rejected — the strategy raised the ceiling, same lock still enforces it.`);
          break;
        }

        case 5: {
          setSimUser(await api.simChangeSubscription(SIM_USER_ID, 'FREE'));

          // The FAMILY race in step 4 left up to 5 sessions active on this account;
          // FREE only allows 1, so clear them before starting a fresh stream.
          const state = await api.simState();
          const stale = (state.sessions || []).filter(s => s.active && s.userId === SIM_USER_ID);
          for (const s of stale) {
            await api.simStop(s.id);
          }

          const play = await api.simPlay(SIM_USER_ID, SIM_SONG_ID, 'device-1');

          // Burn the 6 allowed skips, then expect the 7th to be rejected.
          for (let i = 0; i < 6; i++) {
            await api.simSkip(play.id);
          }
          let rejected = null;
          try {
            await api.simSkip(play.id);
            say('⚠️ Expected the 7th skip to be refused, but it succeeded.', true);
          } catch (err) {
            rejected = err.message;
          }
          const afterState = await api.simState();
          setSimUser((afterState.users || []).find(u => u.id === SIM_USER_ID) || null);
          if (rejected) say(`🚫 Skip #7 refused as designed — ${rejected}`, true);
          break;
        }

        case 6: {
          try {
            await api.simDownload(SIM_USER_ID, SIM_SONG_ID);
            say('⚠️ Expected the download to be refused, but it succeeded.', true);
          } catch (err) {
            say(`🚫 Refused as designed — ${err.message}`, true);
          }
          break;
        }

        case 7: {
          const u = await api.simChangeSubscription(SIM_USER_ID, 'PREMIUM');
          setSimUser(u);
          const downloaded = await api.simDownload(SIM_USER_ID, SIM_SONG_ID);
          say(`✅ Upgraded to PREMIUM and downloaded successfully. Offline library: `
            + `${downloaded.downloadedSongIds.length} song(s).`);
          break;
        }

        default:
          break;
      }

      await refreshEvents();
      setStep(s => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      say(`❌ ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  };

  const done = step >= SIM_STEPS.length;

  return (
    <div className="ms-container">
      <style>{CSS}</style>

      <StepIndicator steps={SIM_STEPS.map(s => s.label)} currentStep={step} />

      <dl className="ms-sim-hud">
        <div className="ms-hud-cell">
          <dt>Sim User</dt>
          <dd>{simUser?.name || 'Alice'}</dd>
        </div>
        <div className="ms-hud-cell">
          <dt>Plan</dt>
          <dd className={simUser ? 'ok' : 'idle'}>{simUser?.subscription?.plan || '—'}</dd>
        </div>
        <div className="ms-hud-cell">
          <dt>Race limit</dt>
          <dd className={race ? 'ok' : 'idle'}>{race?.limit ?? '—'}</dd>
        </div>
        <div className="ms-hud-cell">
          <dt>Won</dt>
          <dd className={race ? 'ok' : 'idle'}>{race?.won ?? '—'}</dd>
        </div>
        <div className="ms-hud-cell">
          <dt>Rejected</dt>
          <dd className={race && race.rejected > 0 ? 'bad' : 'idle'}>{race?.rejected ?? '—'}</dd>
        </div>
        <div className="ms-hud-cell">
          <dt>Skips used</dt>
          <dd className={simUser ? 'ok' : 'idle'}>{simUser?.skipsUsedThisHour ?? '—'}</dd>
        </div>
      </dl>

      {race && (
        <div className="ms-device-rack">
          {race.results.map(r => (
            <div key={r.device} className={`ms-device ${r.outcome === 'WON' ? 'won' : 'rejected'}`}>
              📱
              <div className="ms-device-label">{r.device}</div>
              <div className="ms-device-label" style={{ color: r.outcome === 'WON' ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
                {r.outcome}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ms-controls">
        <button className="ms-action-btn" onClick={resetAll} disabled={busy} style={{ background: 'var(--danger, #ef4444)' }}>
          🔄 Reset
        </button>
        <button className="ms-action-btn" onClick={runStep} disabled={busy || done} style={{ background: 'var(--accent-gradient)' }}>
          {done ? '✓ Simulation complete' : `▶ Step ${step + 1} of ${SIM_STEPS.length}: ${SIM_STEPS[step].label}`}
        </button>
      </div>

      {!done && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, maxWidth: 620, marginInline: 'auto' }}>
          {SIM_STEPS[step].detail}
        </div>
      )}

      <div className={`ms-log ${logBad ? 'bad' : ''}`}>{log}</div>

      {events.length > 0 && (
        <div className="ms-events">
          {events.map(e => (
            <div key={e.id} className="ms-event">
              <span style={{ color: e.type === 'RACE' ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 700 }}>[{e.type}]</span>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{e.actor}:</span> {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MusicStreamingPage() {
  return (
    <LldPage module="music-streaming" title="Music Streaming System" icon="🎵" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
