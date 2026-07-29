import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.crs-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.courses-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
.course-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 14px; transition: all 0.3s; }
.course-card.enrolled { border-color: var(--success); background: rgba(63,185,80,0.08); }

.student-badge { padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin: 4px; }
`;

function AnimatedFlow() {
  const [courses, setCourses] = useState([
    { id: 'CS101', title: 'Data Structures & Algorithms', seatsLeft: 2, prereq: 'None', enrolled: [] },
    { id: 'CS202', title: 'Low-Level System Design', seatsLeft: 1, prereq: 'CS101', enrolled: [] },
    { id: 'CS303', title: 'Distributed Databases', seatsLeft: 0, prereq: 'CS202', enrolled: ['Student-A'] },
  ]);
  const [completed, setCompleted] = useState(['CS101']);
  const [log, setLog] = useState('Student "Prem" logged in. Completed Prerequisites: [CS101].');

  const handleRegister = (courseId) => {
    const c = courses.find(item => item.id === courseId);
    if (!c) return;

    if (c.prereq !== 'None' && !completed.includes(c.prereq)) {
      setLog(`❌ REGISTRATION REJECTED! Prerequisite "${c.prereq}" not completed for course "${c.id}".`);
      return;
    }

    if (c.seatsLeft <= 0) {
      setLog(`⚠️ REGISTRATION FAILED! Course "${c.id}" is at FULL CAPACITY. Added to Waitlist.`);
      return;
    }

    setCourses(prev => prev.map(item => {
      if (item.id === courseId) {
        return { ...item, seatsLeft: item.seatsLeft - 1, enrolled: [...item.enrolled, 'Prem'] };
      }
      return item;
    }));
    setCompleted(prev => [...prev, courseId]);
    setLog(`✅ ENROLLED SUCCESS! Enrolled in "${c.title}" (${courseId}). Seat reserved.`);
  };

  return (
    <div className="crs-container">
      <style>{CSS}</style>

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
        COURSE REGISTRATION ENGINE & PREREQUISITE VALIDATOR
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        Current Student: <strong>Prem</strong> · Completed Courses: {completed.map(c => <span key={c} className="student-badge">{c}</span>)}
      </div>

      <div className="courses-grid">
        {courses.map(c => {
          const isEnrolled = c.enrolled.includes('Prem');
          return (
            <div key={c.id} className={`course-card ${isEnrolled ? 'enrolled' : ''}`}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.id}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Prereq: <strong>{c.prereq}</strong>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.seatsLeft > 0 ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>
                {c.seatsLeft > 0 ? `${c.seatsLeft} Seats Open` : 'FULL CAPACITY'}
              </div>
              <button disabled={isEnrolled} onClick={() => handleRegister(c.id)} style={{ marginTop: 10, width: '100%', padding: '6px', borderRadius: 6, background: isEnrolled ? 'var(--success)' : 'var(--accent)', color: '#fff', border: 'none', cursor: isEnrolled ? 'default' : 'pointer', fontWeight: 600, fontSize: 12 }}>
                {isEnrolled ? '✓ Enrolled' : 'Register Course'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function CourseRegistrationPage() {
  return (
    <LldPage module="course-registration" title="Course Registration System" icon="📚" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
