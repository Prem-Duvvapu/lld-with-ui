import { useState, useCallback, Fragment } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import * as api from './api';

const CSS = `
.crs-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.crs-panel { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.crs-panel-title { font-size: 13px; font-weight: 700; color: var(--accent); text-align: center; margin-bottom: 10px; letter-spacing: 0.02em; }

.crs-student-bar { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.crs-select { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
.crs-badge { padding: 3px 9px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 20px; font-size: 11px; font-weight: 600; color: var(--text-secondary); }

.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.course-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 12px 14px; }
.course-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.course-code { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.course-credits { font-size: 10px; color: var(--text-muted); }
.course-title { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.course-prereq { font-size: 10.5px; color: var(--warning); margin-bottom: 8px; }

.section-row { border-top: 1px solid var(--border-primary); padding-top: 8px; margin-top: 8px; }
.section-row:first-of-type { border-top: none; margin-top: 4px; padding-top: 0; }
.section-line { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11.5px; }
.section-meta { color: var(--text-muted); }
.cap-bar { height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin: 5px 0; }
.cap-fill { height: 100%; background: var(--accent-gradient); transition: width 0.3s; }
.cap-fill.full { background: var(--warning); }
.crs-btn { padding: 5px 10px; border-radius: 6px; border: none; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; background: var(--accent-gradient); }
.crs-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.crs-btn.waitlist { background: var(--warning); }
.crs-btn.drop { background: var(--danger); }

.reg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.reg-table th, .reg-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-primary); }
.reg-table th { color: var(--text-muted); font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; }
.status-pill { padding: 2px 8px; border-radius: 20px; font-size: 10.5px; font-weight: 700; }
.status-pill.ENROLLED { background: var(--success-bg); color: var(--success); }
.status-pill.WAITLISTED { background: rgba(255,204,0,0.15); color: var(--warning); }
.status-pill.DROPPED { background: var(--bg-tertiary); color: var(--text-muted); }
.status-pill.COMPLETED { background: rgba(102,126,234,0.15); color: var(--info); }

.crs-log { margin-top: 4px; background: var(--bg-primary); padding: 10px; border-radius: 8px; border: 1px solid var(--border-primary); font-size: 12px; color: var(--info); text-align: center; font-weight: 600; }
.crs-log.bad { color: var(--danger); }

.sim-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1px; background: var(--border-primary); border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.sim-hud-cell { background: var(--bg-primary); padding: 10px 12px; }
.sim-hud-cell dt { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 4px; font-weight: 700; }
.sim-hud-cell dd { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; line-height: 1.2; }
.sim-hud-cell dd.ok { color: var(--success); }
.sim-hud-cell dd.warn { color: var(--warning); }
.sim-hud-cell dd.bad { color: var(--danger); }
.sim-hud-cell dd.idle { color: var(--text-muted); font-weight: 600; }

.step-indicator { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.step-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-muted); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all 0.25s ease; }
.step-dot.done { border-color: var(--success); background: var(--success-bg); color: var(--success); }
.step-dot.active { border-color: var(--accent); background: var(--accent-gradient); color: #fff; transform: scale(1.15); }
.step-rule { flex: 0 0 14px; height: 2px; background: var(--border-primary); }
.step-rule.done { background: var(--success); }

.race-panel { border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; margin-top: 14px; }
.race-head { background: var(--bg-tertiary); padding: 8px 12px; font-size: 11px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.04em; }
.race-row { display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-top: 1px solid var(--border-primary); background: var(--bg-primary); font-size: 11.5px; }
.race-badge { flex: 0 0 84px; text-align: center; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; letter-spacing: 0.05em; }
.race-badge.ENROLLED { background: var(--success-bg); color: var(--success); }
.race-badge.WAITLISTED { background: rgba(255,204,0,0.15); color: var(--warning); }
.race-badge.REJECTED { background: var(--danger-bg); color: var(--danger); }
.race-who { flex: 0 0 90px; font-weight: 700; color: var(--text-primary); }

.sim-events { margin-top: 16px; max-height: 200px; overflow-y: auto; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-primary); padding: 12px; }
.sim-event { padding: 4px 0; font-size: 11px; color: var(--text-secondary); border-bottom: 1px solid var(--border-primary); }
.sim-event:last-child { border-bottom: none; }
`;

function capPct(section) {
  if (!section || !section.capacity) return 0;
  return Math.min(100, Math.round((section.enrolledCount / section.capacity) * 100));
}

/* ============================================================
 *  App Tab — drives the live /api/course-registration/* endpoints
 * ============================================================ */
function AppTab() {
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [log, setLog] = useState('Pick a student, then register for a section below.');
  const [logBad, setLogBad] = useState(false);

  const refreshCatalog = useCallback(async (signal) => {
    const [c, s, st] = await Promise.all([api.getCourses(), api.getSections(), api.getStudents()]);
    setCourses(c);
    setSections(s);
    setStudents((prev) => {
      if (prev.length === 0 && st.length > 0) setSelectedStudentId(st[0].id);
      return st;
    });
  }, []);

  usePolling(refreshCatalog, 5000, []);

  const refreshMyRegistrations = useCallback(async (studentId) => {
    if (!studentId) { setMyRegistrations([]); return; }
    try {
      const regs = await api.getStudentRegistrations(studentId);
      setMyRegistrations(regs);
    } catch (err) {
      setMyRegistrations([]);
    }
  }, []);

  usePolling(() => refreshMyRegistrations(selectedStudentId), 5000, [selectedStudentId]);

  const say = (message, bad = false) => { setLog(message); setLogBad(bad); };

  const sectionsByCourse = (courseId) => sections.filter((s) => s.courseId === courseId);

  const registrationForSection = (sectionId) =>
    myRegistrations.find((r) => r.sectionId === sectionId && (r.status === 'ENROLLED' || r.status === 'WAITLISTED'));

  const handleRegister = async (sectionId) => {
    if (!selectedStudentId) { say('⚠️ Select a student first.', true); return; }
    try {
      const reg = await api.register(selectedStudentId, sectionId);
      if (reg.status === 'ENROLLED') {
        say(`✅ ${selectedStudentId} ENROLLED in ${sectionId}.`);
      } else {
        say(`⏳ ${sectionId} is full — ${selectedStudentId} WAITLISTED at position ${reg.waitlistPosition}.`, false);
      }
      await refreshCatalog();
      await refreshMyRegistrations(selectedStudentId);
    } catch (err) {
      say(`❌ ${err.message}`, true);
    }
  };

  const handleDrop = async (registrationId, sectionId) => {
    try {
      const outcome = await api.dropRegistration(registrationId);
      const promotedMsg = outcome.promoted
        ? ` ${outcome.promoted.studentId} was promoted from the waitlist to fill the seat.`
        : '';
      say(`🗑️ Dropped ${registrationId} from ${sectionId}.${promotedMsg}`);
      await refreshCatalog();
      await refreshMyRegistrations(selectedStudentId);
    } catch (err) {
      say(`❌ ${err.message}`, true);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="crs-container">
      <style>{CSS}</style>

      <div className="crs-panel">
        <div className="crs-panel-title">STUDENT</div>
        <div className="crs-student-bar">
          <select className="crs-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </select>
          {selectedStudent && (
            <>
              <span className="crs-badge">Dept: {selectedStudent.department}</span>
              <span className="crs-badge">
                Completed: {selectedStudent.completedCourseCodes?.length ? selectedStudent.completedCourseCodes.join(', ') : 'none'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="crs-panel">
        <div className="crs-panel-title">COURSE CATALOG & SECTIONS</div>
        <div className="course-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-head">
                <span className="course-code">{course.code}</span>
                <span className="course-credits">{course.credits} credits</span>
              </div>
              <div className="course-title">{course.title}</div>
              <div className="course-prereq">
                Prereq: {course.prerequisiteCourseCodes?.length ? course.prerequisiteCourseCodes.join(', ') : 'none'}
              </div>
              {sectionsByCourse(course.id).map((section) => {
                const existing = registrationForSection(section.id);
                const full = section.enrolledCount >= section.capacity;
                return (
                  <div key={section.id} className="section-row">
                    <div className="section-line">
                      <span><strong>{section.id}</strong> · {section.professorName}</span>
                      <span className="section-meta">{section.enrolledCount}/{section.capacity} seats</span>
                    </div>
                    <div className="section-meta">
                      {section.timeSlot?.days?.join('/')} {section.timeSlot?.startTime}-{section.timeSlot?.endTime} · {section.timeSlot?.room}
                      {section.waitlist?.length > 0 && ` · ${section.waitlist.length} waitlisted`}
                    </div>
                    <div className="cap-bar"><div className={`cap-fill ${full ? 'full' : ''}`} style={{ width: `${capPct(section)}%` }} /></div>
                    {existing ? (
                      <button className="crs-btn drop" onClick={() => handleDrop(existing.id, section.id)}>
                        Drop ({existing.status})
                      </button>
                    ) : (
                      <button className={`crs-btn ${full ? 'waitlist' : ''}`} onClick={() => handleRegister(section.id)}>
                        {full ? 'Join Waitlist' : 'Register'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="crs-panel">
        <div className="crs-panel-title">MY REGISTRATIONS</div>
        <table className="reg-table">
          <thead>
            <tr><th>Registration</th><th>Section</th><th>Status</th><th>Waitlist Pos.</th><th /></tr>
          </thead>
          <tbody>
            {myRegistrations.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No registrations yet.</td></tr>
            )}
            {myRegistrations.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.sectionId}</td>
                <td><span className={`status-pill ${r.status}`}>{r.status}</span></td>
                <td>{r.waitlistPosition ?? '—'}</td>
                <td>
                  {(r.status === 'ENROLLED' || r.status === 'WAITLISTED') && (
                    <button className="crs-btn drop" onClick={() => handleDrop(r.id, r.sectionId)}>Drop</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`crs-log ${logBad ? 'bad' : ''}`}>{log}</div>
    </div>
  );
}

/* ============================================================
 *  Simulation Tab — drives /api/course-registration/sim/* only.
 * ============================================================ */

const RACE_SECTION = 'SIM-CS201-A';
const RACE_STUDENTS = ['sim-s1', 'sim-s2', 'sim-s3', 'sim-s4', 'sim-s5', 'sim-s6'];

const SIM_STEPS = [
  { label: 'Reset', detail: 'Reseed the sandbox — CS201-A has 3 seats, 6 students ready to race.' },
  { label: 'Race', detail: 'All 6 students call register() at the same instant. The per-section lock lets exactly 3 through.' },
  { label: 'Late joiner', detail: 'A 7th student registers after the race — confirms FIFO append onto the waitlist.' },
  { label: 'Prerequisite check', detail: 'An enrolled student tries CS301-A, which requires completed CS201. Nobody has it — rejected.' },
  { label: 'Schedule conflict', detail: 'The same student tries MATH101-A, which overlaps CS201-A\'s time slot — rejected.' },
  { label: 'Drop', detail: 'One of the three ENROLLED students drops their seat in CS201-A.' },
  { label: 'Promotion', detail: 'The FIFO-head waitlisted student is auto-promoted to ENROLLED under the same lock.' },
  { label: 'Verify', detail: 'Re-fetch the section: capacity is still exactly full — the freed seat was refilled, not left empty.' },
];

function SimulationTab() {
  const [state, setState] = useState({ courses: [], sections: [], students: [], registrations: [] });
  const [events, setEvents] = useState([]);
  const [race, setRace] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('Sandbox ready. Step through the eight stages below.');
  const [logBad, setLogBad] = useState(false);

  const say = (message, bad = false) => { setLog(message); setLogBad(bad); };

  const refreshSim = useCallback(async () => {
    const [s, evts] = await Promise.all([api.simState(), api.simEvents()]);
    setState(s);
    setEvents(evts || []);
    return s;
  }, []);

  usePolling(async () => {
    if (step === 0) { await api.simReset(); }
    await refreshSim();
  }, 60000, []);

  const section = state.sections.find((s) => s.id === RACE_SECTION);
  const registrationsFor = (sectionId) => state.registrations.filter((r) => r.sectionId === sectionId);
  const findByStudent = (studentId, sectionId) =>
    state.registrations.find((r) => r.studentId === studentId && r.sectionId === sectionId
      && (r.status === 'ENROLLED' || r.status === 'WAITLISTED'));

  const resetAll = async () => {
    await api.simReset();
    setRace(null);
    setStep(0);
    say('🔄 Sandbox reset. CS201-A: 0/3 seats filled, empty waitlist.');
    await refreshSim();
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
          const result = await api.simRace(RACE_SECTION, RACE_STUDENTS);
          setRace(result);
          say(`🏁 ${result.attempts} students raced for ${RACE_SECTION}: ${result.enrolled} ENROLLED, ${result.waitlisted} WAITLISTED — capacity held.`);
          break;
        }

        case 2: {
          const reg = await api.simRegister('sim-s7', RACE_SECTION);
          say(reg ? '' : '');
          const latest = await refreshSim();
          const mine = latest.registrations.find((r) => r.studentId === 'sim-s7' && r.sectionId === RACE_SECTION);
          say(`📋 sim-s7 registered late — WAITLISTED at position ${mine?.waitlistPosition ?? '?'}.`);
          break;
        }

        case 3: {
          await api.simRegister('sim-s1', 'SIM-CS301-A');
          say('🚫 sim-s1 tried CS301-A without completing prerequisite CS201 — rejected (see event log).', true);
          break;
        }

        case 4: {
          await api.simRegister('sim-s1', 'SIM-MATH101-A');
          say('🚫 sim-s1 tried MATH101-A, which overlaps CS201-A\'s time slot — rejected (see event log).', true);
          break;
        }

        case 5: {
          const latest = await refreshSim();
          const enrolledReg = latest.registrations.find((r) => r.sectionId === RACE_SECTION && r.status === 'ENROLLED');
          if (!enrolledReg) throw new Error('No ENROLLED registration found — press Reset and start over.');
          await api.simDrop(enrolledReg.id);
          say(`🗑️ Dropped ${enrolledReg.studentId}'s seat in ${RACE_SECTION}.`);
          break;
        }

        case 6: {
          const latest = await refreshSim();
          const promotedReg = latest.registrations.find((r) => r.sectionId === RACE_SECTION && r.status === 'ENROLLED'
            && !RACE_STUDENTS.slice(0, 3).includes(r.studentId));
          say(promotedReg
            ? `⬆️ ${promotedReg.studentId} was auto-promoted from the waitlist to ENROLLED.`
            : '⬆️ Waitlist promotion processed under the section lock.');
          break;
        }

        case 7: {
          const latest = await refreshSim();
          const sec = latest.sections.find((s) => s.id === RACE_SECTION);
          say(`✅ Verified: ${sec.enrolledCount}/${sec.capacity} seats filled after drop + promotion — the seat was never left empty.`);
          break;
        }

        default:
          break;
      }

      if (step > 0) await refreshSim();
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      say(`❌ ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  };

  const done = step >= SIM_STEPS.length;
  const raceStudents = state.students.filter((s) => RACE_STUDENTS.includes(s.id));

  return (
    <div className="crs-container">
      <style>{CSS}</style>

      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <span className={`step-rule ${i <= step ? 'done' : ''}`} />}
            <span className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} title={`${s.label} — ${s.detail}`}>
              {i < step ? '✓' : i + 1}
            </span>
          </Fragment>
        ))}
      </div>

      <dl className="sim-hud">
        <div className="sim-hud-cell">
          <dt>{RACE_SECTION}</dt>
          <dd className={section ? (section.enrolledCount >= section.capacity ? 'warn' : 'ok') : 'idle'}>
            {section ? `${section.enrolledCount}/${section.capacity}` : '—'}
          </dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Waitlist size</dt>
          <dd className={section?.waitlist?.length ? 'warn' : 'idle'}>{section?.waitlist?.length ?? '—'}</dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Race enrolled</dt>
          <dd className={race ? 'ok' : 'idle'}>{race ? race.enrolled : '—'}</dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Race waitlisted</dt>
          <dd className={race && race.waitlisted > 0 ? 'warn' : 'idle'}>{race ? race.waitlisted : '—'}</dd>
        </div>
      </dl>

      <div className="crs-panel">
        <div className="crs-panel-title">RACE ROSTER — {RACE_SECTION}</div>
        <table className="reg-table">
          <thead><tr><th>Student</th><th>Status</th></tr></thead>
          <tbody>
            {raceStudents.map((s) => {
              const reg = findByStudent(s.id, RACE_SECTION);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{reg ? <span className={`status-pill ${reg.status}`}>{reg.status}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
        <button className="crs-btn drop" onClick={resetAll} disabled={busy}>🔄 Reset</button>
        <button className="crs-btn" onClick={runStep} disabled={busy || done}>
          {done ? '✓ Simulation complete' : `▶ Step ${step + 1} of ${SIM_STEPS.length}: ${SIM_STEPS[step].label}`}
        </button>
      </div>

      {!done && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, maxWidth: 640, marginInline: 'auto' }}>
          {SIM_STEPS[step].detail}
        </div>
      )}

      <div className={`crs-log ${logBad ? 'bad' : ''}`}>{log}</div>

      {race && (
        <div className="race-panel">
          <div className="race-head">RACE ON {RACE_SECTION} — {race.attempts} concurrent register() calls, one lock</div>
          {race.results.map((r) => (
            <div key={r.studentId} className="race-row">
              <span className={`race-badge ${r.outcome}`}>{r.outcome}</span>
              <span className="race-who">{r.studentId}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {r.outcome === 'WAITLISTED' ? `position ${r.waitlistPosition}` : r.registrationId || r.error}
              </span>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="sim-events">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Event Log ({events.length})</div>
          {events.slice().reverse().map((e) => (
            <div key={e.id} className="sim-event">
              <span style={{ color: e.type.includes('FAILED') ? 'var(--danger)' : 'var(--accent)', fontWeight: 600 }}>[{e.type}]</span>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{e.actor}:</span> {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseRegistrationPage() {
  return (
    <LldPage module="course-registration" title="Course Registration" icon="📚" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
