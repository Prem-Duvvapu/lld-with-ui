import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { createTask, updateStatus, updatePriority, getAllTasks, deleteTask } from './api';

const TASK_CSS = `
.kanban-container { display: flex; gap: 16px; overflow-x: auto; padding: 8px 0; min-height: 600px; }
.kanban-column { flex: 1; min-width: 220px; background: var(--bg-secondary); border-radius: 12px; padding: 12px; border: 1px solid var(--border-primary); }
.kanban-column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--border-primary); }
.kanban-column-header h3 { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
.kanban-column-header .count { font-size: 13px; color: var(--text-muted); background: var(--bg-tertiary); padding: 2px 10px; border-radius: 12px; }
.task-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
.task-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.task-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(102,126,234,0.3); }
.task-card-title { font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 6px; }
.task-card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.priority-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; display: inline-block; }
.priority-LOW { background: #6b7280; color: #fff; }
.priority-MEDIUM { background: #3b82f6; color: #fff; }
.priority-HIGH { background: #f97316; color: #fff; }
.priority-CRITICAL { background: #ef4444; color: #fff; }
.detail-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.detail-panel h2 { font-size: 18px; margin: 0 0 12px 0; color: var(--text-primary); }
.detail-panel .desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 12px; }
.detail-panel .meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.detail-panel .actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: var(--bg-tertiary); color: var(--text-secondary); }
.btn:hover { border-color: var(--accent); color: var(--accent); }
.btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover { opacity: 0.9; }
.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn-danger:hover { opacity: 0.9; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--bg-secondary); border-radius: 12px; padding: 24px; width: 90%; max-width: 480px; border: 1px solid var(--border-primary); }
.modal h2 { margin: 0 0 16px 0; font-size: 20px; color: var(--text-primary); }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary); box-sizing: border-box; }
.form-group textarea { min-height: 80px; resize: vertical; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.empty-col { text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px 0; }
.add-task-bar { display: flex; justify-content: center; margin-bottom: 16px; }
.add-task-bar .btn { padding: 10px 24px; font-size: 14px; }
`;

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done' };
const STATUS_COLORS = { TODO: '#6b7280', IN_PROGRESS: '#3b82f6', REVIEW: '#f97316', DONE: '#22c55e' };

function AddTaskModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTask({ title, description, priority, assignee });
      setTitle(''); setDescription(''); setPriority('MEDIUM'); setAssignee('');
      onCreated();
      onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Task title" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label>Assignee</label>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee name" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, selected, onClick }) {
  const fmtDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`task-card ${selected ? 'selected' : ''}`} onClick={() => onClick(task)}>
      <div className="task-card-title">{task.title}</div>
      <div>
        <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
      </div>
      <div className="task-card-meta">
        {task.assignee && <span>👤 {task.assignee}</span>}
        <span>📅 {fmtDate(task.createdAt)}</span>
      </div>
    </div>
  );
}

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getAllTasks();
      setTasks(Array.isArray(data) ? data : []);
      setError('');
    } catch { setError('Failed to load tasks'); }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleMoveStatus = async (id, status) => {
    try {
      await updateStatus(id, status);
      if (selected?.id === id) setSelected({ ...selected, status });
      fetchTasks();
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      if (selected?.id === id) setSelected(null);
      fetchTasks();
    } catch {}
  };

  const nextStatus = (status) => {
    const idx = STATUSES.indexOf(status);
    return idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  };

  const prevStatus = (status) => {
    const idx = STATUSES.indexOf(status);
    return idx > 0 ? STATUSES[idx - 1] : null;
  };

  const grouped = {};
  STATUSES.forEach((s) => { grouped[s] = []; });
  tasks.forEach((t) => {
    if (grouped[t.status]) grouped[t.status].push(t);
  });

  const app = (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <style>{TASK_CSS}</style>

      <div className="add-task-bar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Task</button>
      </div>

      {error && <div style={{ textAlign: 'center', color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {selected && (
        <div className="detail-panel">
          <h2>{selected.title}</h2>
          {selected.description && <div className="desc">{selected.description}</div>}
          <div className="meta">
            <span>Priority: <strong>{selected.priority}</strong></span>
            <span>Assignee: <strong>{selected.assignee || 'Unassigned'}</strong></span>
            <span>Status: <strong style={{ color: STATUS_COLORS[selected.status] }}>{STATUS_LABELS[selected.status]}</strong></span>
            <span>Created: {new Date(selected.createdAt).toLocaleString()}</span>
          </div>
          <div className="actions">
            {prevStatus(selected.status) && (
              <button className="btn" onClick={() => handleMoveStatus(selected.id, prevStatus(selected.status))}>
                ← Move to {STATUS_LABELS[prevStatus(selected.status)]}
              </button>
            )}
            {nextStatus(selected.status) && (
              <button className="btn btn-primary" onClick={() => handleMoveStatus(selected.id, nextStatus(selected.status))}>
                Move to {STATUS_LABELS[nextStatus(selected.status)]} →
              </button>
            )}
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </div>
      )}

      <div className="kanban-container">
        {STATUSES.map((status) => (
          <div key={status} className="kanban-column">
            <div className="kanban-column-header" style={{ borderBottomColor: STATUS_COLORS[status] }}>
              <h3 style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</h3>
              <span className="count">{grouped[status].length}</span>
            </div>
            {grouped[status].length === 0 ? (
              <div className="empty-col">No tasks</div>
            ) : (
              grouped[status].map((task) => (
                <TaskCard key={task.id} task={task} selected={selected?.id === task.id} onClick={setSelected} />
              ))
            )}
          </div>
        ))}
      </div>

      <AddTaskModal open={showModal} onClose={() => setShowModal(false)} onCreated={fetchTasks} />
    </div>
  );

  return (
    <LldPage module="task-management" title="Task Management" icon="✅" tabs={['app', 'design', 'diagram']}>
      {app}
    </LldPage>
  );
}
