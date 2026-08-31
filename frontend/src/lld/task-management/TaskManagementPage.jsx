import { useState, useEffect, useCallback, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../components/ui/ToastContext';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import * as api from './api';

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'];
const STATUS_LABELS = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review',
  BLOCKED: 'Blocked', DONE: 'Done', CANCELLED: 'Cancelled',
};
const STATUS_ICONS = { TODO: '📝', IN_PROGRESS: '🚧', REVIEW: '🔍', BLOCKED: '⛔', DONE: '✅', CANCELLED: '🚫' };
const STATUS_COLORS = {
  TODO: '#6b7280', IN_PROGRESS: '#3b82f6', REVIEW: '#f97316',
  BLOCKED: '#a855f7', DONE: '#22c55e', CANCELLED: '#ef4444',
};
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRIORITY_COLORS = { LOW: '#6b7280', MEDIUM: '#3b82f6', HIGH: '#f97316', CRITICAL: '#ef4444' };
const POLICIES = ['FIFO_PRIORITY', 'DUE_DATE_FIRST', 'WEIGHTED_SCORE'];
const POLICY_LABELS = {
  FIFO_PRIORITY: 'FIFO within Priority', DUE_DATE_FIRST: 'Due Date First', WEIGHTED_SCORE: 'Weighted Score',
};

const CSS = `
.tm-app { max-width: 1220px; margin: 0 auto; }
.tm-header { margin-bottom: var(--space-4); }
.tm-header h2 { margin: 0 0 4px; font-size: var(--font-lg); color: var(--text-primary); }
.tm-header p { margin: 0; font-size: var(--font-sm); color: var(--text-muted); max-width: 780px; line-height: var(--leading-normal); }

.tm-toolbar { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.tm-toolbar-right { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.tm-toolbar-right label { font-size: var(--font-xs); color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }

.tm-btn { padding: 8px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-sm); font-weight: 600; cursor: pointer; transition: background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out); }
.tm-btn:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.tm-btn:active:not(:disabled) { transform: translateY(0); }
.tm-btn:disabled { opacity: var(--disabled-opacity); cursor: not-allowed; }
.tm-btn-secondary { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-primary); }
.tm-btn-secondary:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: var(--bg-card); }
.tm-btn-danger { background: var(--danger); color: #fff; }
.tm-btn-danger:hover:not(:disabled) { background: var(--danger); opacity: 0.85; }
.tm-select { padding: 7px 10px; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: var(--radius-sm); color: var(--text-primary); font-size: var(--font-sm); transition: border-color var(--duration-fast); }
.tm-select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }

.tm-board { display: flex; gap: var(--space-3); overflow-x: auto; padding: 4px 2px 14px; }
.tm-column { flex: 1 1 0; min-width: 205px; background: var(--bg-secondary); border-radius: var(--radius-md); padding: var(--space-3); border: 1px solid var(--border-primary); transition: box-shadow var(--duration-normal) var(--ease-out); }
.tm-column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 2px solid var(--border-primary); }
.tm-column-header h3 { margin: 0; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; display: flex; align-items: center; gap: 5px; }
.tm-count { font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--bg-tertiary); padding: 2px 9px; border-radius: var(--radius-full); min-width: 20px; text-align: center; }

.tm-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: var(--space-2); transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out); animation: tm-card-in var(--duration-normal) var(--ease-out); }
.tm-card-clickable { cursor: pointer; }
.tm-card-clickable:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.tm-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(102,126,234,0.28); }
.tm-card.tm-flash { animation: tm-flash 1100ms var(--ease-out); }
.tm-card-title { font-weight: 600; font-size: 13px; color: var(--text-primary); margin-bottom: 6px; line-height: var(--leading-tight); }
.tm-card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 11px; color: var(--text-muted); }
.tm-priority-badge { font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; color: #fff; letter-spacing: 0.3px; }
.tm-empty-col { text-align: center; color: var(--text-muted); font-size: 12px; padding: 22px 4px; border: 1.5px dashed var(--border-secondary); border-radius: var(--radius-sm); }

.tm-detail { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-md); padding: var(--space-5); margin-bottom: var(--space-4); animation: tm-card-in var(--duration-normal) var(--ease-out); box-shadow: var(--shadow-sm); }
.tm-detail h2 { font-size: 17px; margin: 0 0 8px 0; }
.tm-detail .desc { color: var(--text-secondary); font-size: 13px; margin-bottom: var(--space-3); line-height: var(--leading-normal); }
.tm-detail-row { display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: flex-end; margin-bottom: var(--space-3); }
.tm-detail-row label { font-size: var(--font-xs); color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; font-weight: 600; }
.tm-detail-row input, .tm-detail-row select { padding: 7px 10px; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: var(--radius-sm); color: var(--text-primary); font-size: var(--font-sm); }
.tm-hint { font-size: 11px; color: var(--text-muted); }

.tm-banner { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: var(--radius-sm); font-size: var(--font-sm); margin-bottom: var(--space-3); animation: tm-card-in var(--duration-fast) var(--ease-out); }
.tm-banner-err { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger); }

.tm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal, 500); animation: tm-fade 150ms var(--ease-out); }
.tm-modal { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 24px; width: 90%; max-width: 460px; border: 1px solid var(--border-primary); box-shadow: var(--shadow-lg); animation: tm-modal-in var(--duration-normal) var(--ease-spring); }
.tm-modal h2 { margin: 0 0 16px 0; font-size: 18px; }
.tm-form-group { margin-bottom: 12px; }
.tm-form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
.tm-form-group input, .tm-form-group select, .tm-form-group textarea { width: 100%; padding: 9px 11px; border: 1px solid var(--border-primary); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); box-sizing: border-box; transition: border-color var(--duration-fast); }
.tm-form-group input:focus, .tm-form-group select:focus, .tm-form-group textarea:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
.tm-form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }

.step-indicator { display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--bg-tertiary); border: 1px solid var(--border-primary); transition: all var(--duration-normal) var(--ease-out); }
.step-dot.active { background: var(--accent); box-shadow: 0 0 0 4px rgba(102,126,234,0.22); transform: scale(1.2); }
.step-dot.done { background: var(--success); border-color: var(--success); }

.tm-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: var(--space-2); margin: var(--space-4) 0; }
.tm-hud-tile { background: var(--bg-tertiary); border-radius: var(--radius-sm); padding: 12px 10px; text-align: center; border: 1px solid var(--border-secondary); transition: transform var(--duration-fast) var(--ease-out); animation: tm-card-in var(--duration-normal) var(--ease-out); }
.tm-hud-tile .num { font-size: var(--font-xl); font-weight: 700; color: var(--accent); line-height: 1.1; }
.tm-hud-tile .lbl { font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px; }

.tm-log { display: flex; align-items: flex-start; gap: 8px; font-size: var(--font-sm); color: var(--text-secondary); background: var(--bg-tertiary); border-radius: var(--radius-sm); padding: 11px 14px; margin-top: var(--space-2); line-height: var(--leading-normal); animation: tm-card-in var(--duration-fast) var(--ease-out); }
.tm-log-icon { flex-shrink: 0; }

.tm-order-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); margin-top: var(--space-3); }
.tm-order-panel { background: var(--bg-tertiary); border-radius: var(--radius-sm); padding: 12px 14px; border: 1px solid var(--border-secondary); animation: tm-card-in var(--duration-normal) var(--ease-out); }
.tm-order-panel h4 { margin: 0 0 8px; font-size: 12px; color: var(--accent); text-transform: uppercase; letter-spacing: 0.4px; }
.tm-order-panel ol { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--text-secondary); }
.tm-order-panel li { margin-bottom: 4px; }

.tm-events { font-size: 11.5px; color: var(--text-secondary); max-height: 190px; overflow-y: auto; margin-top: var(--space-3); display: flex; flex-direction: column; gap: 5px; }
.tm-event-row { padding: 6px 10px; border-left: 3px solid var(--border-primary); background: var(--bg-tertiary); border-radius: 5px; animation: tm-card-in var(--duration-fast) var(--ease-out); }
.tm-event-row.ERROR { border-left-color: var(--danger); background: var(--danger-bg); }
.tm-event-row.SUCCESS { border-left-color: var(--success); background: var(--success-bg); }
.tm-event-row.INFO { border-left-color: var(--info); background: var(--info-bg); }
.tm-event-row.WARNING { border-left-color: var(--warning); background: var(--warning-bg); }

.tm-section-label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin: var(--space-4) 0 var(--space-2); }
.tm-skel-board { display: flex; gap: var(--space-3); }
.tm-skel-col { flex: 1; min-width: 205px; }

@keyframes tm-card-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes tm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes tm-modal-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes tm-flash {
  0% { box-shadow: 0 0 0 0 var(--accent); border-color: var(--accent); }
  60% { box-shadow: 0 0 0 6px rgba(102,126,234,0); border-color: var(--accent); }
  100% { box-shadow: 0 0 0 0 rgba(102,126,234,0); }
}
`;

function priorityBadge(priority) {
  return <span className="tm-priority-badge" style={{ background: PRIORITY_COLORS[priority] }}>{priority}</span>;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// -------------------------------------------------------------- Add Task modal

function AddTaskModal({ open, boardId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createTask(boardId, {
        title, description, priority, assignee,
        dueDate: dueDate ? new Date(dueDate).getTime() : null,
      });
      toast.success(`"${title}" added to the board`);
      setTitle(''); setDescription(''); setPriority('MEDIUM'); setAssignee(''); setDueDate('');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not create task');
    } finally { setLoading(false); }
  };

  return (
    <div className="tm-modal-overlay" onClick={onClose}>
      <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="tm-form-group">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Task title" autoFocus />
          </div>
          <div className="tm-form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
          </div>
          <div className="tm-form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="tm-form-group">
            <label>Assignee</label>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Optional — leave blank to claim later" />
          </div>
          <div className="tm-form-group">
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="tm-form-actions">
            <button type="button" className="tm-btn tm-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="tm-btn" disabled={loading}>{loading ? 'Creating…' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- board

function TaskCard({ task, selected, flashing, onClick }) {
  // onClick is optional — the simulation tab's read-only board preview renders these without a
  // handler. Only apply the click affordance (cursor, hover lift) when there's something for a
  // click to actually do; a "clickable-looking" card that silently does nothing is worse than one
  // that's honestly inert.
  const clickable = typeof onClick === 'function';
  return (
    <div
      className={`tm-card ${clickable ? 'tm-card-clickable' : ''} ${selected ? 'selected' : ''} ${flashing ? 'tm-flash' : ''}`}
      onClick={clickable ? () => onClick(task) : undefined}
    >
      <div className="tm-card-title">{task.title}</div>
      <div className="tm-card-meta">
        {priorityBadge(task.priority)}
        {task.assignee && <span>👤 {task.assignee}</span>}
        <span>📅 {fmtDate(task.dueDate)}</span>
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="tm-skel-board">
      {STATUSES.map((s) => (
        <div key={s} className="tm-skel-col">
          <Skeleton height={18} width="70%" style={{ marginBottom: 12 }} />
          <Skeleton height={64} style={{ marginBottom: 8, borderRadius: 8 }} />
          <Skeleton height={64} style={{ marginBottom: 8, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

function BoardTab() {
  const [boardId, setBoardId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [policy, setPolicy] = useState('FIFO_PRIORITY');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState('IN_PROGRESS');
  const [assigneeInput, setAssigneeInput] = useState('');
  const [flashId, setFlashId] = useState(null);
  const toast = useToast();
  const flashTimer = useRef(null);

  const load = useCallback(async (id, currentPolicy) => {
    try {
      const ordered = await api.getOrderedTasks(id, currentPolicy);
      setTasks(ordered);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load board');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const boards = await api.listBoards();
        const main = boards[0];
        if (main) { setBoardId(main.id); await load(main.id, policy); }
      } catch (err) { setError(err.message || 'Failed to load boards'); }
      finally { setInitialLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePolling(() => (boardId ? load(boardId, policy) : Promise.resolve()), 6000, [boardId, policy]);

  const flash = (id) => {
    setFlashId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 1100);
  };

  const grouped = {};
  STATUSES.forEach((s) => { grouped[s] = []; });
  tasks.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      const result = await fn();
      toast.success(successMsg);
      await load(boardId, policy);
      if (selected) {
        const refreshed = (await api.getBoardTasks(boardId)).find((t) => t.id === selected.id);
        setSelected(refreshed || null);
        if (refreshed) flash(refreshed.id);
      }
      return result;
    } catch (err) {
      toast.error(err.message || 'Action failed');
      throw err;
    } finally { setBusy(false); }
  };

  const selectTask = (task) => {
    setSelected(task);
    setAssigneeInput(task.assignee || '');
    setStatusTarget(STATUSES.find((s) => s !== task.status) || task.status);
  };

  return (
    <div>
      <div className="tm-header">
        <h2>Kanban Board</h2>
        <p>Six status columns backed by a real state machine — moving a task server-side validates the transition and rejects illegal jumps with a 409. Column order follows the selected strategy.</p>
      </div>

      <div className="tm-toolbar">
        <button className="tm-btn" onClick={() => setShowModal(true)} disabled={!boardId}>+ Add Task</button>
        <div className="tm-toolbar-right">
          <label>Order by</label>
          <select className="tm-select" value={policy} onChange={(e) => setPolicy(e.target.value)}>
            {POLICIES.map((p) => <option key={p} value={p}>{POLICY_LABELS[p]}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="tm-banner tm-banner-err"><span>⚠️</span>{error}</div>}

      {initialLoading ? <BoardSkeleton /> : (
        <>
          {selected && (
            <div className="tm-detail">
              <h2>{selected.title}</h2>
              {selected.description && <div className="desc">{selected.description}</div>}
              <div className="tm-detail-row">
                <span style={{ fontSize: 13 }}>Status: <strong style={{ color: STATUS_COLORS[selected.status] }}>{STATUS_ICONS[selected.status]} {STATUS_LABELS[selected.status]}</strong></span>
                <span style={{ fontSize: 13 }}>Priority: {priorityBadge(selected.priority)}</span>
                <span style={{ fontSize: 13 }}>Due: {fmtDate(selected.dueDate)}</span>
              </div>

              <div className="tm-detail-row">
                <label>Move to
                  <select value={statusTarget} onChange={(e) => setStatusTarget(e.target.value)}>
                    {STATUSES.filter((s) => s !== selected.status).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </label>
                <button className="tm-btn" disabled={busy} onClick={() => runAction(
                  () => api.updateStatus(selected.id, statusTarget), `Moved to ${STATUS_LABELS[statusTarget]}`
                ).catch(() => {})}>Move</button>
                <span className="tm-hint">Illegal jumps are rejected by the state machine (409 Conflict).</span>
              </div>

              <div className="tm-detail-row">
                <label>Priority
                  <select value={selected.priority} onChange={(e) => runAction(
                    () => api.updatePriority(selected.id, e.target.value), 'Priority updated'
                  ).catch(() => {})}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>Assignee
                  <input value={assigneeInput} onChange={(e) => setAssigneeInput(e.target.value)} placeholder="Unassigned" />
                </label>
                <button className="tm-btn tm-btn-secondary" disabled={busy} onClick={() => runAction(
                  () => api.updateAssignee(selected.id, assigneeInput), 'Assignee updated'
                ).catch(() => {})}>Save Assignee</button>
                <button className="tm-btn tm-btn-danger" disabled={busy} onClick={() => runAction(
                  () => api.deleteTask(selected.id).then(() => setSelected(null)), 'Task deleted'
                ).catch(() => {})}>Delete</button>
                <button className="tm-btn tm-btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <EmptyState icon="🗂️" title="No tasks yet" description="Create the first task to see the board come to life." />
          ) : (
            <div className="tm-board">
              {STATUSES.map((status) => (
                <div key={status} className="tm-column">
                  <div className="tm-column-header" style={{ borderBottomColor: STATUS_COLORS[status] }}>
                    <h3 style={{ color: STATUS_COLORS[status] }}>{STATUS_ICONS[status]} {STATUS_LABELS[status]}</h3>
                    <span className="tm-count">{grouped[status].length}</span>
                  </div>
                  {grouped[status].length === 0 ? (
                    <div className="tm-empty-col">No tasks</div>
                  ) : (
                    grouped[status].map((task) => (
                      <TaskCard key={task.id} task={task} selected={selected?.id === task.id}
                        flashing={flashId === task.id} onClick={selectTask} />
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AddTaskModal open={showModal} boardId={boardId} onClose={() => setShowModal(false)} onCreated={() => load(boardId, policy)} />
    </div>
  );
}

// ----------------------------------------------------------- Simulation tab

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded board',
  'Move TODO → IN_PROGRESS (legal)',
  'Attempt IN_PROGRESS → DONE directly (illegal — rejected)',
  'Move IN_PROGRESS → REVIEW (legal)',
  'Compare FIFO vs. Weighted Score ordering',
  'N actors race to claim one unassigned task',
  'Two actors race: REVIEW → DONE vs. REVIEW → CANCELLED',
];

function findByTitle(tasks, title) {
  return tasks.find((t) => t.title === title);
}

function SimulationTab() {
  const [step, setStep] = useState(-1);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState({ text: 'Press Start to reset the isolated sim sandbox.', kind: 'INFO' });
  const [raceResult, setRaceResult] = useState(null);
  const [orderPanels, setOrderPanels] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const highlightTimer = useRef(null);

  const highlight = (id) => {
    setHighlightId(id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1400);
  };

  const refresh = async () => {
    const state = await api.simState();
    setTasks(state.tasks || []);
    setEvents(state.events || []);
    return state;
  };

  const doReset = async () => {
    setBusy(true); setRaceResult(null); setOrderPanels(null);
    try {
      const state = await api.simReset();
      setTasks(state.tasks || []);
      setEvents(state.events || []);
      setStep(0);
      setLog({ text: `Sandbox reset. ${state.tasks.length} tasks seeded on "${state.board.name}" — a repository completely separate from the live board.`, kind: 'SUCCESS' });
    } catch (err) { setLog({ text: `Reset failed: ${err.message}`, kind: 'ERROR' }); }
    finally { setBusy(false); }
  };

  const doStep = async (n) => {
    setBusy(true);
    try {
      const current = tasks;
      if (n === 1) {
        await refresh();
        setLog({ text: 'Viewing the isolated sim board — a completely separate TaskRepository from the live board, so nothing here touches production data.', kind: 'INFO' });
      } else if (n === 2) {
        const t = findByTitle(current, 'Design API contracts');
        await api.simMove(t.id, 'IN_PROGRESS', 2);
        await refresh();
        highlight(t.id);
        setLog({ text: `"${t.title}" moved TODO → IN_PROGRESS — a legal transition per TodoState's declared next-set.`, kind: 'SUCCESS' });
      } else if (n === 3) {
        const t = findByTitle((await refresh()).tasks, 'Design API contracts');
        highlight(t.id);
        try {
          await api.simMove(t.id, 'DONE', 3);
          setLog({ text: 'Unexpected: illegal transition was accepted.', kind: 'WARNING' });
        } catch (err) {
          setLog({ text: `Rejected as expected — ${err.message}`, kind: 'ERROR' });
        }
        await refresh();
      } else if (n === 4) {
        const t = findByTitle((await refresh()).tasks, 'Design API contracts');
        await api.simMove(t.id, 'REVIEW', 4);
        await refresh();
        highlight(t.id);
        setLog({ text: `"${t.title}" moved IN_PROGRESS → REVIEW — legal, continuing the happy path.`, kind: 'SUCCESS' });
      } else if (n === 5) {
        const fifo = await api.simOrder('FIFO_PRIORITY', 5);
        const weighted = await api.simOrder('WEIGHTED_SCORE', 5);
        setOrderPanels({ fifo: fifo.orderedTasks, weighted: weighted.orderedTasks });
        await refresh();
        setLog({ text: 'Same board, two strategies: FIFO within Priority vs. Weighted Score — TaskService never branches on which one, it just calls strategy.order().', kind: 'INFO' });
      } else if (n === 6) {
        const t = findByTitle((await refresh()).tasks, 'Write onboarding docs');
        const actors = ['Wei', 'Noah', 'Sara', 'Liam'];
        const result = await api.simClaimRace(t.id, actors, 6);
        setRaceResult({ kind: 'claim', ...result });
        await refresh();
        highlight(t.id);
        setLog({ text: `${actors.length} actors raced to claim "${t.title}": ${result.succeeded} succeeded (${result.winner}), ${result.rejected} rejected — the per-task lock decided, not luck.`, kind: 'SUCCESS' });
      } else if (n === 7) {
        const t = findByTitle((await refresh()).tasks, 'Code review: payments');
        const result = await api.simTransitionRace(t.id, 'DONE', 'CANCELLED', 7);
        setRaceResult({ kind: 'transition', ...result });
        await refresh();
        highlight(t.id);
        setLog({ text: `Two callers raced to move "${t.title}" to DONE and CANCELLED simultaneously: ${result.succeeded} applied (final=${result.finalStatus}), ${result.rejected} rejected.`, kind: 'SUCCESS' });
      }
      setStep(n);
    } catch (err) {
      setLog({ text: `Step failed: ${err.message}`, kind: 'ERROR' });
    } finally { setBusy(false); }
  };

  const logIcon = { SUCCESS: '✅', ERROR: '❌', WARNING: '⚠️', INFO: 'ℹ️' }[log.kind] || 'ℹ️';

  return (
    <div>
      <div className="tm-header">
        <h2>8-Step Interactive Simulation</h2>
        <p>Drives an isolated <code>/api/tasks/sim/*</code> sandbox — a second repository seeded independently of the live board — through the state machine, the ordering strategies, and both concurrency races, live.</p>
      </div>

      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
          {step >= 0 ? `Step ${step + 1}/${SIM_STEPS.length}: ${SIM_STEPS[step]}` : 'Not started'}
        </span>
      </div>

      {tasks.length > 0 && (
        <div className="tm-hud">
          <div className="tm-hud-tile"><div className="num">{tasks.length}</div><div className="lbl">Tasks on Board</div></div>
          <div className="tm-hud-tile"><div className="num">{events.length}</div><div className="lbl">Events Logged</div></div>
          {raceResult && (
            <>
              <div className="tm-hud-tile"><div className="num" style={{ color: 'var(--success)' }}>{raceResult.succeeded}</div><div className="lbl">Race: Succeeded</div></div>
              <div className="tm-hud-tile"><div className="num" style={{ color: 'var(--danger)' }}>{raceResult.rejected}</div><div className="lbl">Race: Rejected</div></div>
              {raceResult.kind === 'claim' && <div className="tm-hud-tile"><div className="num" style={{ fontSize: 15 }}>{raceResult.winner}</div><div className="lbl">Winner</div></div>}
              {raceResult.kind === 'transition' && <div className="tm-hud-tile"><div className="num" style={{ fontSize: 15 }}>{raceResult.finalStatus}</div><div className="lbl">Final Status</div></div>}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
        {step === -1 && <button className="tm-btn" disabled={busy} onClick={doReset}>▶ Start Simulation</button>}
        {step >= 0 && step < SIM_STEPS.length - 1 && (
          <button className="tm-btn" disabled={busy} onClick={() => doStep(step + 1)}>
            {busy ? 'Working…' : `Next: ${SIM_STEPS[step + 1]}`}
          </button>
        )}
        {step === SIM_STEPS.length - 1 && (
          <button className="tm-btn tm-btn-secondary" onClick={doReset}>↺ Run Again</button>
        )}
      </div>

      <div className="tm-log"><span className="tm-log-icon">{logIcon}</span><span>{log.text}</span></div>

      {orderPanels && (
        <div className="tm-order-panels">
          <div className="tm-order-panel">
            <h4>FIFO within Priority</h4>
            <ol>{orderPanels.fifo.map((t) => <li key={t.id}>{t.title} <em style={{ color: PRIORITY_COLORS[t.priority] }}>({t.priority})</em></li>)}</ol>
          </div>
          <div className="tm-order-panel">
            <h4>Weighted Score</h4>
            <ol>{orderPanels.weighted.map((t) => <li key={t.id}>{t.title} <em style={{ color: PRIORITY_COLORS[t.priority] }}>({t.priority})</em></li>)}</ol>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState icon="🕹️" title="Sandbox not started" description="Press Start Simulation to seed the isolated board." />
      ) : (
        <div className="tm-board" style={{ marginTop: 14 }}>
          {STATUSES.map((status) => {
            const inCol = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="tm-column">
                <div className="tm-column-header" style={{ borderBottomColor: STATUS_COLORS[status] }}>
                  <h3 style={{ color: STATUS_COLORS[status] }}>{STATUS_ICONS[status]} {STATUS_LABELS[status]}</h3>
                  <span className="tm-count">{inCol.length}</span>
                </div>
                {inCol.length === 0 ? <div className="tm-empty-col">—</div> : inCol.map((t) => (
                  <TaskCard key={t.id} task={t} selected={false} flashing={highlightId === t.id} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="tm-section-label">Event Log</div>
      <div className="tm-events">
        {events.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No events yet.</span>}
        {events.slice().reverse().slice(0, 12).map((e) => (
          <div key={e.id} className={`tm-event-row ${e.status}`}>
            <strong>{e.eventType.replace(/_/g, ' ')}</strong> — {e.description}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- page

export default function TaskManagementPage() {
  return (
    <LldPage module="task-management" title="Task Management System" icon="✅" tabs={[
      { id: 'app', label: '📋 Board' },
      { id: 'simulation', label: '🕹️ Interactive Simulation' },
      { id: 'diagram', label: 'Class Diagram' },
      { id: 'sequence', label: 'Sequence Diagram' },
      { id: 'design', label: 'Design Details' },
    ]}>
      <style>{CSS}</style>
      {(activeTab) => (
        <div className="tm-app">
          {activeTab === 'app' && <BoardTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
