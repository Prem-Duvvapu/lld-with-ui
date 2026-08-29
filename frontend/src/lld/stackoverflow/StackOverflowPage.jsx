import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import { ApiError } from '../../utils/api';
import * as api from './api';

const CSS = `
.so-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.so-user-picker { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); }
.so-user-picker select { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 12.5px; }

.so-search { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.so-search input { flex: 1; min-width: 160px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 13.5px; }
.so-search select { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 13.5px; }
.so-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-weight: 600; cursor: pointer; transition: all var(--duration-fast, 0.15s) ease; }
.so-btn:hover { border-color: var(--accent); color: var(--accent); }
.so-btn.primary { background: var(--accent-gradient); border-color: transparent; color: #fff; }
.so-btn.primary:hover { filter: brightness(1.08); color: #fff; }
.so-btn:disabled { opacity: var(--disabled-opacity, 0.5); cursor: not-allowed; }

.so-card { border: 1px solid var(--border-primary); border-radius: 12px; background: var(--bg-card); padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all var(--duration-fast, 0.15s) ease; }
.so-card:hover { border-color: var(--accent); }
.so-card h3 { font-size: 15.5px; margin: 0 0 6px; color: var(--text-primary); }
.so-meta { font-size: 11.5px; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 8px; }
.so-tag { display: inline-block; padding: 2px 9px; margin: 2px 4px 2px 0; background: var(--accent-bg, var(--bg-tertiary)); color: var(--accent); border-radius: 5px; font-size: 10.5px; font-weight: 700; }
.so-stats { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
.so-empty { text-align: center; padding: 32px; color: var(--text-muted); font-size: 14px; }

.so-detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.so-detail-head h2 { font-size: 19px; flex: 1; min-width: 200px; color: var(--text-primary); }
.so-status-pill { padding: 3px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; }
.so-status-pill.OPEN { background: var(--info-bg); color: var(--info); }
.so-status-pill.ANSWERED { background: var(--success-bg); color: var(--success); }
.so-status-pill.CLOSED { background: var(--danger-bg); color: var(--danger); }

.so-vote { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.so-vote-row { display: flex; align-items: center; gap: 10px; }
.so-vote-btn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all var(--duration-fast, 0.15s) ease; }
.so-vote-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.so-vote-btn.active-up { border-color: var(--success); background: var(--success-bg); color: var(--success); }
.so-vote-btn.active-down { border-color: var(--danger); background: var(--danger-bg); color: var(--danger); }
.so-vote-btn:disabled { opacity: var(--disabled-opacity, 0.5); cursor: not-allowed; }
.so-vote-score { font-weight: 700; font-size: 16px; color: var(--text-primary); min-width: 22px; text-align: center; }

.so-body-box { padding: 14px; background: var(--bg-primary); border-radius: 10px; border: 1px solid var(--border-primary); line-height: 1.6; font-size: 13.5px; color: var(--text-secondary); margin-bottom: 14px; }
.so-answer { border: 1px solid var(--border-primary); border-radius: 12px; padding: 16px; margin-bottom: 12px; background: var(--bg-card); display: flex; gap: 14px; }
.so-answer.accepted { border-color: var(--success); background: var(--success-bg); }
.so-answer-body { flex: 1; }
.so-answer-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 11.5px; color: var(--text-muted); margin-top: 8px; }
.so-accepted-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--success); color: #fff; padding: 2px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; }
.so-comment { padding: 7px 10px; margin: 5px 0; background: var(--bg-primary); border-radius: 6px; font-size: 12px; border-left: 3px solid var(--border-secondary); color: var(--text-secondary); }
.so-comment b { color: var(--accent); font-size: 11.5px; }
.so-add-comment { display: flex; gap: 8px; margin-top: 8px; }
.so-add-comment input { flex: 1; padding: 7px 10px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 12px; }
.so-answer-form textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 13.5px; min-height: 90px; resize: vertical; }

.so-form-group { margin-bottom: 16px; }
.so-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: var(--text-primary); }
.so-form-group input, .so-form-group textarea { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 13.5px; }
.so-form-group textarea { min-height: 110px; resize: vertical; }
.so-error { margin-top: 14px; padding: 10px 14px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; font-size: 13px; }

.so-user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.so-user-card { border: 1px solid var(--border-primary); border-radius: 12px; background: var(--bg-card); padding: 16px; text-align: center; }
.so-user-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent-gradient); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; margin: 0 auto 8px; }
.so-user-rep { font-size: 12.5px; color: var(--accent); font-weight: 700; margin-top: 2px; }
.so-user-badge { font-size: 10px; color: var(--text-muted); margin-top: 4px; }

.so-step-indicator { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.so-step-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-muted); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all var(--duration-normal, 0.25s) ease; }
.so-step-dot.done { border-color: var(--success); background: var(--success-bg); color: var(--success); }
.so-step-dot.active { border-color: var(--accent); background: var(--accent-gradient); color: #fff; transform: scale(1.15); }

.so-scene { position: relative; min-height: 260px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 14px; overflow: hidden; }
.so-scene-q { background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); padding: 16px; margin-bottom: 12px; opacity: 0; transform: translateY(16px); transition: all 0.5s ease; }
.so-scene-q.visible { opacity: 1; transform: translateY(0); }
.so-scene-a { background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); padding: 16px; margin-bottom: 10px; opacity: 0; transform: translateY(16px); transition: all 0.5s ease; display: flex; gap: 12px; }
.so-scene-a.visible { opacity: 1; transform: translateY(0); }
.so-scene-a.accepted { border-color: var(--success); background: var(--success-bg); }
.so-scene-a.rejected-flash { animation: soShake 0.4s ease; border-color: var(--danger); }
@keyframes soShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

.so-telemetry { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 14px; }
.so-telemetry-tile { border: 1px solid var(--border-primary); border-radius: 10px; background: var(--bg-card); padding: 10px 12px; }
.so-telemetry-tile .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.so-telemetry-tile .value { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 2px; }

.so-race-panel { border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; margin-top: 14px; }
.so-race-head { padding: 8px 12px; background: var(--bg-tertiary); font-size: 11px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.03em; }
.so-race-row { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-top: 1px solid var(--border-primary); background: var(--bg-primary); font-size: 11.5px; color: var(--text-secondary); }
.so-race-badge { flex: 0 0 74px; text-align: center; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; }
.so-race-badge.applied { background: var(--success-bg); color: var(--success); }
.so-race-badge.rejected { background: var(--danger-bg); color: var(--danger); }

.so-sim-events { margin-top: 14px; max-height: 200px; overflow-y: auto; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-primary); padding: 10px 12px; }
.so-sim-event { padding: 4px 0; font-size: 11px; color: var(--text-secondary); border-bottom: 1px solid var(--border-primary); }
.so-sim-event:last-child { border-bottom: none; }
.so-sim-event .tag { font-weight: 700; margin-right: 6px; }
.so-sim-event .tag.REJECTED { color: var(--danger); }
.so-sim-event .tag.VOTE, .so-sim-event .tag.RACE { color: var(--accent); }
.so-sim-event .tag.ACCEPT, .so-sim-event .tag.ASK, .so-sim-event .tag.ANSWER { color: var(--success); }
.so-sim-event .tag.CLOSE, .so-sim-event .tag.RESET { color: var(--text-muted); }

.so-step-detail { text-align: center; font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; max-width: 640px; margin-inline: auto; }
.so-step-actions { display: flex; justify-content: center; gap: 10px; margin-bottom: 6px; }
`;

const VOTE_TARGET = { QUESTION: 'QUESTION', ANSWER: 'ANSWER' };

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function VoteControls({ score, myVote, onVote, disabled, size = 'md' }) {
  return (
    <div className="so-vote">
      <div className="so-vote-row" style={{ flexDirection: size === 'sm' ? 'row' : 'column' }}>
        <button
          className={`so-vote-btn ${myVote === 'UPVOTE' ? 'active-up' : ''}`}
          onClick={() => onVote('UPVOTE')}
          disabled={disabled}
          title="Upvote"
        >▲</button>
        <span className="so-vote-score">{score}</span>
        <button
          className={`so-vote-btn ${myVote === 'DOWNVOTE' ? 'active-down' : ''}`}
          onClick={() => onVote('DOWNVOTE')}
          disabled={disabled}
          title="Downvote"
        >▼</button>
      </div>
    </div>
  );
}

function UserPicker({ users, currentUserId, setCurrentUserId }) {
  return (
    <div className="so-user-picker">
      <span>Acting as</span>
      <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)}>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.username} ({u.reputation} rep)</option>
        ))}
      </select>
    </div>
  );
}

function QuestionsTab({ users, currentUserId, setCurrentUserId }) {
  const [questions, setQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (selectedId) return; // paused while a detail view is open, below
    try {
      const data = await api.getQuestions(keyword || null, tagFilter || null, null);
      setQuestions(data);
    } finally {
      setLoading(false);
    }
  }, [keyword, tagFilter, selectedId]);

  useEffect(() => { api.getTags().then(setTags).catch(() => {}); }, []);
  // Only poll the list while browsing it — polling underneath an open detail view
  // would waste requests the detail view's own polling already covers.
  usePolling(fetchQuestions, 5000, [keyword, tagFilter, selectedId]);

  if (selectedId) {
    return (
      <QuestionDetail
        questionId={selectedId}
        users={users}
        currentUserId={currentUserId}
        setCurrentUserId={setCurrentUserId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <div className="so-toolbar">
        <h2 style={{ margin: 0, fontSize: 18 }}>Questions</h2>
        <UserPicker users={users} currentUserId={currentUserId} setCurrentUserId={setCurrentUserId} />
      </div>
      <form className="so-search" onSubmit={(e) => { e.preventDefault(); fetchQuestions(); }}>
        <input placeholder="Search questions..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <button type="submit" className="so-btn">Search</button>
      </form>
      {loading && questions.length === 0 ? (
        <div className="so-empty">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="so-empty">No questions found.</div>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="so-card" onClick={() => setSelectedId(q.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <h3>{q.title}</h3>
              <span className={`so-status-pill ${q.status}`}>{q.status}</span>
            </div>
            <div className="so-meta">
              <span>asked by <strong>{q.authorName}</strong></span>
              <span>{timeAgo(q.createdAt)}</span>
              <span>{q.viewCount} views</span>
            </div>
            <div>{q.tags.map((t) => <span key={t} className="so-tag">{t}</span>)}</div>
            <div className="so-stats" style={{ marginTop: 8 }}>
              <span>▲ {q.score} votes</span>
              <span>{q.answers?.length || 0} answers</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function QuestionDetail({ questionId, users, currentUserId, setCurrentUserId, onBack }) {
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [commentTexts, setCommentTexts] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchQ = useCallback(async () => {
    try {
      const data = await api.getQuestion(questionId);
      setQ(data);
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  usePolling(fetchQ, 3000, [questionId]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await fetchQ();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !q) return <div className="so-empty">Loading question...</div>;
  if (!q) return <div className="so-empty">Question not found.</div>;

  const isOwner = q.authorId === currentUserId;
  const isClosed = q.status === 'CLOSED';
  const myQuestionVote = (q.votes || {})[currentUserId];

  return (
    <div>
      <div className="so-detail-head">
        <button className="so-btn" onClick={onBack}>← Back</button>
        <h2>{q.title}</h2>
        <span className={`so-status-pill ${q.status}`}>{q.status}</span>
        <UserPicker users={users} currentUserId={currentUserId} setCurrentUserId={setCurrentUserId} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <VoteControls
          score={q.score}
          myVote={myQuestionVote}
          disabled={busy || isOwner}
          onVote={(type) => run(() => api.voteQuestion(q.id, currentUserId, type))}
        />
        <div style={{ flex: 1 }}>
          <div className="so-meta" style={{ marginBottom: 8 }}>
            <span>asked by <strong>{q.authorName}</strong></span>
            <span>{timeAgo(q.createdAt)}</span>
            <span>{q.viewCount} views</span>
          </div>
          <div className="so-body-box">{q.body}</div>
          <div style={{ marginBottom: 12 }}>{q.tags.map((t) => <span key={t} className="so-tag">{t}</span>)}</div>
        </div>
      </div>

      {isOwner && !isClosed && (
        <button className="so-btn" onClick={() => run(() => api.closeQuestion(q.id, currentUserId))} disabled={busy}>
          🔒 Close question
        </button>
      )}

      {q.comments?.map((c) => (
        <div key={c.id} className="so-comment"><b>{c.authorName}</b> {c.body}</div>
      ))}
      <div className="so-add-comment">
        <input
          placeholder="Add a comment..."
          value={commentTexts[q.id] || ''}
          onChange={(e) => setCommentTexts((p) => ({ ...p, [q.id]: e.target.value }))}
        />
        <button
          className="so-btn"
          disabled={busy || !(commentTexts[q.id] || '').trim()}
          onClick={() => run(async () => {
            await api.addComment(VOTE_TARGET.QUESTION, q.id, commentTexts[q.id], currentUserId);
            setCommentTexts((p) => ({ ...p, [q.id]: '' }));
          })}
        >Comment</button>
      </div>

      <h3 style={{ margin: '22px 0 12px' }}>{q.answers?.length || 0} Answers</h3>
      {q.answers?.map((a) => {
        const myAnswerVote = (a.votes || {})[currentUserId];
        return (
          <div key={a.id} className={`so-answer ${a.accepted ? 'accepted' : ''}`}>
            <VoteControls
              score={a.score}
              myVote={myAnswerVote}
              disabled={busy || a.authorId === currentUserId}
              onVote={(type) => run(() => api.voteAnswer(a.id, currentUserId, type))}
              size="sm"
            />
            <div className="so-answer-body">
              <div>{a.body}</div>
              <div className="so-answer-meta">
                <span>by <strong>{a.authorName}</strong></span>
                <span>{timeAgo(a.createdAt)}</span>
                {a.accepted && <span className="so-accepted-badge">✓ Accepted</span>}
                {isOwner && !a.accepted && !isClosed && (
                  <button className="so-btn" disabled={busy} onClick={() => run(() => api.acceptAnswer(q.id, a.id, currentUserId))}>
                    Accept
                  </button>
                )}
              </div>
              {a.comments?.map((c) => (
                <div key={c.id} className="so-comment" style={{ marginTop: 8 }}><b>{c.authorName}</b> {c.body}</div>
              ))}
              <div className="so-add-comment">
                <input
                  placeholder="Add a comment..."
                  value={commentTexts[a.id] || ''}
                  onChange={(e) => setCommentTexts((p) => ({ ...p, [a.id]: e.target.value }))}
                />
                <button
                  className="so-btn"
                  disabled={busy || !(commentTexts[a.id] || '').trim()}
                  onClick={() => run(async () => {
                    await api.addComment(VOTE_TARGET.ANSWER, a.id, commentTexts[a.id], currentUserId);
                    setCommentTexts((p) => ({ ...p, [a.id]: '' }));
                  })}
                >Comment</button>
              </div>
            </div>
          </div>
        );
      })}

      {!isClosed ? (
        <div className="so-answer-form">
          <h4 style={{ marginBottom: 8 }}>Your Answer</h4>
          <textarea value={answerBody} onChange={(e) => setAnswerBody(e.target.value)} placeholder="Write your answer..." />
          <button
            className="so-btn primary"
            style={{ marginTop: 8 }}
            disabled={busy || !answerBody.trim()}
            onClick={() => run(async () => {
              await api.postAnswer(q.id, answerBody, currentUserId);
              setAnswerBody('');
            })}
          >Post Answer</button>
        </div>
      ) : (
        <div className="so-empty">This question is closed to new answers.</div>
      )}

      {error && <div className="so-error">{error}</div>}
    </div>
  );
}

function AskTab({ currentUserId, onPosted }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getTags().then(setTags).catch(() => {}); }, []);

  const toggleTag = (name) => {
    setSelectedTags((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTags.length === 0) { setError('Select at least one tag'); return; }
    setError('');
    setBusy(true);
    try {
      await api.postQuestion(title, body, currentUserId, selectedTags);
      setTitle(''); setBody(''); setSelectedTags([]);
      onPosted();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : 'Failed to post question');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 18 }}>Ask a Question</h2>
      <form onSubmit={handleSubmit}>
        <div className="so-form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question?" required />
        </div>
        <div className="so-form-group">
          <label>Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your question in detail..." required />
        </div>
        <div className="so-form-group">
          <label>Tags</label>
          <div>
            {tags.map((t) => (
              <span
                key={t.name}
                className="so-tag"
                style={{
                  cursor: 'pointer',
                  background: selectedTags.includes(t.name) ? 'var(--accent)' : undefined,
                  color: selectedTags.includes(t.name) ? '#fff' : undefined,
                }}
                onClick={() => toggleTag(t.name)}
              >{t.name}</span>
            ))}
          </div>
        </div>
        {error && <div className="so-error">{error}</div>}
        <button type="submit" className="so-btn primary" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
          {busy ? 'Posting...' : 'Post Question'}
        </button>
      </form>
    </div>
  );
}

const REP_BADGES = [
  { min: 200, label: 'Gold' },
  { min: 100, label: 'Silver' },
  { min: 30, label: 'Bronze' },
];
function badgeFor(rep) { return REP_BADGES.find((b) => rep >= b.min) || null; }

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers([...data].sort((a, b) => b.reputation - a.reputation));
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchUsers, 4000, []);

  if (loading && users.length === 0) return <div className="so-empty">Loading users...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Leaderboard</h2>
      <div className="so-user-grid">
        {users.map((u) => {
          const badge = badgeFor(u.reputation);
          return (
            <div key={u.id} className="so-user-card">
              <div className="so-user-avatar">{u.username[0].toUpperCase()}</div>
              <div style={{ fontWeight: 700 }}>{u.username}</div>
              <div className="so-user-rep">{u.reputation} rep</div>
              {badge && <div className="so-user-badge">{badge.label} badge</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SIM_STEPS = [
  { label: 'Reset', detail: 'Reseed the isolated sandbox — a fresh question, no answers, no votes.' },
  { label: 'Ask', detail: 'Alice asks a question. postQuestion() rewards her +5 reputation.' },
  { label: 'Answer', detail: 'Bob answers it. postAnswer() rewards him +10 reputation.' },
  { label: 'Upvote', detail: 'Carol upvotes Bob’s answer — score and reputation move together under the answer’s lock, then Bob’s user lock.' },
  { label: 'Self-vote', detail: 'Bob tries to upvote his own answer. VotingService rejects it before any lock is taken twice — the failure path.' },
  { label: 'Accept', detail: 'Alice accepts Bob’s answer: a one-time +15 bonus, and the question moves OPEN → ANSWERED.' },
  { label: 'Race', detail: '5 fresh voters upvote the same answer at the exact same instant. The per-answer lock must lose none of them.' },
  { label: 'Close & refuse', detail: 'Alice closes the question, then a new answer is attempted — refused with 409, the second failure path.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [simUsers, setSimUsers] = useState([]);
  const [raceResult, setRaceResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [rejectedFlash, setRejectedFlash] = useState(false);

  const refreshEvents = useCallback(() => { api.simEvents().then(setEvents).catch(() => {}); }, []);

  // Refreshes question/answer/users from the authoritative sandbox snapshot after
  // every step, rather than trusting only the single-entity response — this is
  // what makes the telemetry tiles (author reputation, in particular) real.
  const refreshFromState = useCallback(async (questionId, answerId) => {
    const state = await api.simState();
    setSimUsers(state.users || []);
    if (questionId) {
      const q = state.questions.find((x) => x.id === questionId);
      if (q) {
        setQuestion(q);
        if (answerId) {
          const a = q.answers?.find((x) => x.id === answerId);
          if (a) setAnswer(a);
        }
      }
    }
  }, []);

  const done = step >= SIM_STEPS.length;

  const runStep = async () => {
    setBusy(true);
    setError('');
    try {
      if (step === 0) {
        await api.simReset();
        setQuestion(null); setAnswer(null); setRaceResult(null); setSimUsers([]);
      } else if (step === 1) {
        const q = await api.simAsk();
        setQuestion(q);
        await refreshFromState(q.id, null);
      } else if (step === 2) {
        const a = await api.simAnswer(question.id);
        setAnswer(a);
        await refreshFromState(question.id, a.id);
      } else if (step === 3) {
        await api.simVote(answer.id, 'U3', 'UPVOTE');
        await refreshFromState(question.id, answer.id);
      } else if (step === 4) {
        try {
          await api.simVote(answer.id, 'U2', 'UPVOTE');
        } catch (e) {
          setRejectedFlash(true);
          setTimeout(() => setRejectedFlash(false), 500);
        }
        await refreshFromState(question.id, answer.id);
      } else if (step === 5) {
        await api.simAccept(question.id, answer.id, 'U1');
        await refreshFromState(question.id, answer.id);
      } else if (step === 6) {
        const result = await api.simRace(answer.id, 5);
        setRaceResult(result);
        await refreshFromState(question.id, answer.id);
      } else if (step === 7) {
        await api.simClose(question.id, 'U1');
        try {
          await api.simAnswer(question.id);
        } catch (e) {
          setRejectedFlash(true);
          setTimeout(() => setRejectedFlash(false), 500);
        }
        await refreshFromState(question.id, answer.id);
      }
      setStep((s) => s + 1);
      refreshEvents();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Step failed');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep(0); setQuestion(null); setAnswer(null); setRaceResult(null); setSimUsers([]); setError(''); refreshEvents();
  };

  useEffect(() => { refreshEvents(); }, [refreshEvents]);

  const bob = simUsers.find((u) => u.id === 'U2');

  return (
    <div>
      <div className="so-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s.label} className={`so-step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} title={s.label}>
            {i < step ? '✓' : i + 1}
          </div>
        ))}
      </div>
      {!done && <div className="so-step-detail">{SIM_STEPS[step].detail}</div>}

      <div className="so-telemetry">
        <div className="so-telemetry-tile"><div className="label">Question status</div><div className="value">{question?.status || '—'}</div></div>
        <div className="so-telemetry-tile"><div className="label">Answer score</div><div className="value">{answer?.score ?? '—'}</div></div>
        <div className="so-telemetry-tile"><div className="label">Bob's reputation</div><div className="value">{bob ? bob.reputation : '—'}</div></div>
        <div className="so-telemetry-tile"><div className="label">Accepted?</div><div className="value">{answer?.accepted ? 'Yes' : 'No'}</div></div>
      </div>

      <div className="so-scene">
        <div className={`so-scene-q ${question ? 'visible' : ''}`}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>❓ Question</div>
          <div style={{ fontWeight: 700 }}>{question?.title || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{question?.body}</div>
          {question && <span className={`so-status-pill ${question.status}`} style={{ marginTop: 8, display: 'inline-block' }}>{question.status}</span>}
        </div>

        {answer && (
          <div className={`so-scene-a ${answer.accepted ? 'accepted' : ''} ${rejectedFlash ? 'rejected-flash' : ''}`}>
            <div className="so-vote">
              <div className="so-vote-row" style={{ flexDirection: 'column' }}>
                <span className="so-vote-btn">▲</span>
                <span className="so-vote-score">{answer.score}</span>
                <span className="so-vote-btn">▼</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}>{answer.body}</div>
              <div className="so-answer-meta">
                <span>by Bob</span>
                {answer.accepted && <span className="so-accepted-badge">✓ Accepted</span>}
              </div>
            </div>
          </div>
        )}

        {rejectedFlash && (
          <div style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>
            ✕ Rejected — see the event log
          </div>
        )}
      </div>

      {raceResult && (
        <div className="so-race-panel">
          <div className="so-race-head">
            RACE ON {raceResult.answerId} — {raceResult.attempts} concurrent voteAnswer() calls, {raceResult.applied} applied, final score {raceResult.finalScore}
          </div>
          {raceResult.results.map((r) => (
            <div key={r.voter} className="so-race-row">
              <span className={`so-race-badge ${r.outcome === 'APPLIED' ? 'applied' : 'rejected'}`}>{r.outcome}</span>
              <span>{r.voter}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="so-error">{error}</div>}

      <div className="so-step-actions">
        {!done ? (
          <button className="so-btn primary" onClick={runStep} disabled={busy}>
            {busy ? 'Running...' : `▶ Step ${step + 1} of ${SIM_STEPS.length}: ${SIM_STEPS[step].label}`}
          </button>
        ) : (
          <button className="so-btn primary" onClick={restart}>🔄 Run again</button>
        )}
      </div>

      {events.length > 0 && (
        <div className="so-sim-events">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Event Log ({events.length})</div>
          {events.map((e) => (
            <div key={e.id} className="so-sim-event">
              <span className={`tag ${e.type}`}>[{e.type}]</span>
              <span style={{ color: 'var(--text-muted)' }}>{e.actor}:</span> {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StackOverflowPage() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('U1');
  const [questionsRefreshKey, setQuestionsRefreshKey] = useState(0);

  useEffect(() => {
    api.getUsers().then((data) => {
      setUsers(data);
      if (data.length > 0 && !data.some((u) => u.id === currentUserId)) {
        setCurrentUserId(data[0].id);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LldPage
      module="stackoverflow"
      title="Stack Overflow"
      icon="❓"
      tabs={[
        { id: 'questions', label: '❓ Questions' },
        { id: 'ask', label: '✍️ Ask' },
        { id: 'users', label: '🏆 Leaderboard' },
        'simulation',
        'diagram',
        'sequence',
        'design',
      ]}
    >
      {(activeTab) => (
        <>
          <style>{CSS}</style>
          {activeTab === 'questions' && (
            <QuestionsTab
              key={questionsRefreshKey}
              users={users}
              currentUserId={currentUserId}
              setCurrentUserId={setCurrentUserId}
            />
          )}
          {activeTab === 'ask' && (
            <AskTab currentUserId={currentUserId} onPosted={() => setQuestionsRefreshKey((k) => k + 1)} />
          )}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
