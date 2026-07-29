import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, getQuestion, getTags, getUsers, postQuestion, postAnswer, voteQuestion, voteAnswer, acceptAnswer, addComment } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; }
.app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 28px; color: #f48024; }
header p { color: #666; font-size: 14px; margin-top: 4px; }
nav { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; }
nav button { padding: 10px 24px; border: 2px solid #f48024; background: white; color: #f48024; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
nav button.active { background: #f48024; color: white; }
nav button:hover:not(.active) { background: #fff4e6; }
main { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.alert { text-align: center; padding: 32px; color: #666; font-size: 16px; }
.search-bar { display: flex; gap: 8px; margin-bottom: 16px; }
.search-bar input { flex: 1; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
.search-bar input:focus { outline: none; border-color: #f48024; }
.search-bar select { padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
.question-card { border: 2px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
.question-card:hover { border-color: #f48024; }
.question-card h3 { font-size: 16px; margin-bottom: 6px; color: #1a1a2e; }
.question-card .meta { font-size: 12px; color: #999; margin-bottom: 8px; display: flex; gap: 16px; }
.question-card .tags { display: flex; gap: 4px; flex-wrap: wrap; }
.question-card .tag { background: #fff4e6; color: #f48024; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.question-card .stats { display: flex; gap: 16px; font-size: 13px; color: #666; }
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.detail-header h2 { font-size: 20px; flex: 1; }
.btn-back { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background: white; }
.btn-back:hover { background: #f5f5f5; }
.question-body { padding: 16px; background: #fafafa; border-radius: 8px; margin-bottom: 16px; line-height: 1.6; }
.question-meta { font-size: 13px; color: #666; margin-bottom: 12px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.vote-controls { display: flex; align-items: center; gap: 8px; }
.vote-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #ddd; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; background: white; }
.vote-btn:hover { background: #f5f5f5; }
.vote-score { font-weight: 700; font-size: 18px; min-width: 24px; text-align: center; }
.answers-section { margin-top: 24px; }
.answers-section h3 { margin-bottom: 12px; font-size: 18px; }
.answer-card { border: 2px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.answer-card.accepted { border-color: #4caf50; background: #f1f8e9; }
.answer-body { line-height: 1.6; margin-bottom: 12px; }
.answer-meta { font-size: 13px; color: #666; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.accepted-badge { display: inline-block; background: #4caf50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.accept-btn { padding: 4px 10px; border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; cursor: pointer; font-size: 12px; background: white; }
.accept-btn:hover { background: #e8f5e9; }
.comment { padding: 8px 12px; margin: 4px 0; background: #f8f9fa; border-radius: 4px; font-size: 13px; border-left: 3px solid #ddd; }
.comment .comment-author { font-weight: 600; font-size: 12px; color: #f48024; }
.comment .comment-time { font-size: 11px; color: #999; }
.add-comment { display: flex; gap: 8px; margin-top: 8px; }
.add-comment input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
.add-comment button { padding: 8px 12px; background: #f48024; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.answer-form { margin-top: 16px; }
.answer-form textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; min-height: 100px; resize: vertical; }
.answer-form textarea:focus { outline: none; border-color: #f48024; }
.btn-primary { width: 100%; padding: 12px; background: #f48024; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #d96b1a; }
.ask-form { max-width: 600px; margin: 0 auto; }
.ask-form h2 { margin-bottom: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: #f48024; }
.form-group textarea { min-height: 120px; resize: vertical; }
.error { margin-top: 16px; padding: 12px; background: #fff0f0; color: #d32f2f; border-radius: 8px; font-size: 14px; }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.user-card { border: 2px solid #eee; border-radius: 8px; padding: 16px; text-align: center; }
.user-card .avatar { width: 48px; height: 48px; border-radius: 50%; background: #f48024; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; margin: 0 auto 8px; }
.user-card .username { font-weight: 700; margin-bottom: 4px; }
.user-card .reputation { font-size: 13px; color: #f48024; font-weight: 600; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #f48024; border-radius: 6px; color: #f48024; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #f48024; color: white; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
.step-dot.active { background: #2196f3; box-shadow: 0 0 8px rgba(33,150,243,0.5); }
.step-dot.done { background: #3fb950; }
`;

const USER_ID = 'U1';

function QuestionList({ onSelect }) {
  const [questions, setQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQuestions = () => {
    setLoading(true);
    getQuestions(keyword || null, tagFilter || null, null).then(setQuestions).finally(() => setLoading(false));
  };

  useEffect(() => { getTags().then(setTags); }, []);
  useEffect(() => { fetchQuestions(); }, [tagFilter]);

  const handleSearch = (e) => { e.preventDefault(); fetchQuestions(); };

  if (loading && questions.length === 0) return <div className="alert">Loading questions...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Questions</h2>
      <form className="search-bar" onSubmit={handleSearch}>
        <input placeholder="Search questions..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All Tags</option>
          {tags.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <button type="submit" className="btn-back">Search</button>
      </form>
      {questions.length === 0 ? (
        <div className="alert">No questions found.</div>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="question-card" onClick={() => onSelect(q.id)}>
            <h3>{q.title}</h3>
            <div className="meta">
              <span>{q.authorName}</span>
              <span>{new Date(q.createdAt).toLocaleDateString()}</span>
              <span>{q.viewCount} views</span>
            </div>
            <div className="tags">{q.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            <div className="stats">
              <span>{q.score} votes</span>
              <span>{q.answers?.length || 0} answers</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function QuestionDetail({ questionId, onBack }) {
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [commentTexts, setCommentTexts] = useState({});

  const fetchQ = () => { getQuestion(questionId).then(setQ).finally(() => setLoading(false)); };

  useEffect(() => { fetchQ(); }, [questionId]);

  const handleVoteQ = async (type) => {
    const data = await voteQuestion(questionId, USER_ID, type);
    if (!data.error) setQ(data);
  };

  const handleVoteA = async (answerId, type) => {
    const data = await voteAnswer(answerId, USER_ID, type);
    if (!data.error) fetchQ();
  };

  const handleAccept = async (answerId) => {
    const data = await acceptAnswer(questionId, answerId, q.authorId === USER_ID ? USER_ID : '');
    if (!data.error) setQ(data); else fetchQ();
  };

  const handlePostAnswer = async () => {
    if (!answerBody.trim()) return;
    const data = await postAnswer(questionId, answerBody, USER_ID);
    if (!data.error) { setAnswerBody(''); fetchQ(); }
  };

  const handleComment = async (targetType, targetId) => {
    const text = commentTexts[targetId] || '';
    if (!text.trim()) return;
    const data = await addComment(targetType, targetId, text, USER_ID);
    if (!data.error) { setCommentTexts((prev) => ({ ...prev, [targetId]: '' })); fetchQ(); }
  };

  if (loading) return <div className="alert">Loading...</div>;
  if (!q) return <div className="alert">Question not found</div>;

  const isOwner = q.authorId === USER_ID;

  return (
    <div>
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>{q.title}</h2>
      </div>
      <div className="question-meta">
        <div className="vote-controls">
          <button className="vote-btn" onClick={() => handleVoteQ('UPVOTE')}>▲</button>
          <span className="vote-score">{q.score}</span>
          <button className="vote-btn" onClick={() => handleVoteQ('DOWNVOTE')}>▼</button>
        </div>
        <span>asked by <strong>{q.authorName}</strong></span>
        <span>{new Date(q.createdAt).toLocaleString()}</span>
        <span>{q.viewCount} views</span>
      </div>
      <div className="question-body">{q.body}</div>
      <div className="tags" style={{ marginBottom: 16 }}>{q.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
      {q.comments?.map((c) => (
        <div key={c.id} className="comment">
          <span className="comment-author">{c.authorName}</span> {c.body}
          <span className="comment-time"> — {new Date(c.createdAt).toLocaleString()}</span>
        </div>
      ))}
      <div className="add-comment">
        <input placeholder="Add a comment..." value={commentTexts[q.id] || ''} onChange={(e) => setCommentTexts((p) => ({ ...p, [q.id]: e.target.value }))} />
        <button onClick={() => handleComment('question', q.id)}>Comment</button>
      </div>
      <div className="answers-section">
        <h3>{q.answers?.length || 0} Answers</h3>
        {q.answers?.map((a) => (
          <div key={a.id} className={`answer-card ${a.accepted ? 'accepted' : ''}`}>
            <div className="answer-body">{a.body}</div>
            <div className="answer-meta">
              <div className="vote-controls">
                <button className="vote-btn" onClick={() => handleVoteA(a.id, 'UPVOTE')}>▲</button>
                <span className="vote-score">{a.score}</span>
                <button className="vote-btn" onClick={() => handleVoteA(a.id, 'DOWNVOTE')}>▼</button>
              </div>
              <span>by <strong>{a.authorName}</strong></span>
              <span>{new Date(a.createdAt).toLocaleString()}</span>
              {a.accepted && <span className="accepted-badge">✓ Accepted</span>}
              {isOwner && !a.accepted && <button className="accept-btn" onClick={() => handleAccept(a.id)}>Accept</button>}
            </div>
            {a.comments?.map((c) => (
              <div key={c.id} className="comment" style={{ marginTop: 8 }}>
                <span className="comment-author">{c.authorName}</span> {c.body}
                <span className="comment-time"> — {new Date(c.createdAt).toLocaleString()}</span>
              </div>
            ))}
            <div className="add-comment">
              <input placeholder="Add a comment..." value={commentTexts[a.id] || ''} onChange={(e) => setCommentTexts((p) => ({ ...p, [a.id]: e.target.value }))} />
              <button onClick={() => handleComment('answer', a.id)}>Comment</button>
            </div>
          </div>
        ))}
        <div className="answer-form">
          <h4 style={{ marginBottom: 8 }}>Your Answer</h4>
          <textarea value={answerBody} onChange={(e) => setAnswerBody(e.target.value)} placeholder="Write your answer..." />
          <button className="btn-primary" onClick={handlePostAnswer} style={{ marginTop: 8 }}>Post Answer</button>
        </div>
      </div>
    </div>
  );
}

function AskQuestion({ onPosted }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { getTags().then(setTags); }, []);

  const toggleTag = (tag) => { setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTags.length === 0) { setError('Select at least one tag'); return; }
    setError(''); setLoading(true);
    const data = await postQuestion(title, body, USER_ID, selectedTags);
    if (data.error) setError(data.error); else onPosted();
    setLoading(false);
  };

  return (
    <div className="ask-form">
      <h2>Ask a Question</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question?" required />
        </div>
        <div className="form-group">
          <label>Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your question in detail..." required />
        </div>
        <div className="form-group">
          <label>Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t) => (
              <span key={t.name} className="tag" style={{ cursor: 'pointer', padding: '4px 10px', background: selectedTags.includes(t.name) ? '#f48024' : '#fff4e6', color: selectedTags.includes(t.name) ? 'white' : '#f48024' }} onClick={() => toggleTag(t.name)}>{t.name}</span>
            ))}
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Post Question'}</button>
      </form>
    </div>
  );
}

const REP_BADGES = [
  { min: 1000, label: 'Gold', cls: '#ffd700' },
  { min: 200, label: 'Silver', cls: '#c0c0c0' },
  { min: 50, label: 'Bronze', cls: '#cd7f32' },
];

function getBadge(rep) { for (const b of REP_BADGES) { if (rep >= b.min) return b; } return null; }

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getUsers().then(setUsers).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="alert">Loading users...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Users</h2>
      <div className="user-grid">
        {users.map((u) => {
          const badge = getBadge(u.reputation);
          return (
            <div key={u.id} className="user-card">
              <div className="avatar">{u.username[0].toUpperCase()}</div>
              <div className="username">{u.username}</div>
              <div className="reputation">{badge && <span style={{ color: badge.cls, marginRight: 4 }}>●</span>}{u.reputation} rep</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Joined {new Date(u.createdAt).toLocaleDateString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Question', 'Answer', 'Vote', 'Accept', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setQuestion(null); setAnswer(null); setError(''); setLoading(false); };

  const startSim = async () => {
    setError(''); setLoading(true); setStep(1);
    try {
      const q = await postQuestion('How does Java garbage collection work?', 'Can someone explain how GC works in Java?', 'U1', ['Java']);
      if (!mountedRef.current) return;
      if (q.error) { setError(q.error); setLoading(false); return; }
      setQuestion(q);
      setLoading(false);
      await new Promise(r => setTimeout(r, 1000));
      if (!mountedRef.current) return;
      setStep(2);

      const a = await postAnswer(q.id, 'Java GC automatically manages memory by removing unreachable objects.', 'U2');
      if (!mountedRef.current) return;
      if (a.error) { setError(a.error); setLoading(false); return; }
      setAnswer(a);
      await new Promise(r => setTimeout(r, 800));
      if (!mountedRef.current) return;
      setStep(3);

      await voteAnswer(a.id, 'U1', 'UPVOTE');
      if (!mountedRef.current) return;
      await new Promise(r => setTimeout(r, 800));
      if (!mountedRef.current) return;
      setStep(4);

      await acceptAnswer(q.id, a.id, 'U1');
      if (!mountedRef.current) return;
      await new Promise(r => setTimeout(r, 800));
      if (!mountedRef.current) return;
      setStep(5);
    } catch { if (mountedRef.current) { setError('Simulation failed'); setLoading(false); } }
  };

  return (
    <div>
      <div className="step-indicator" style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      {error && <div className="error" style={{ color: '#d32f2f', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button className="btn-back" style={{ marginLeft: 12 }} onClick={reset}>↺ Reset</button></div>}

      {step === 0 && <button className="btn-primary" onClick={startSim} disabled={loading} style={{ display: 'block', margin: '0 auto', padding: '12px 32px', background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>▶ Start Simulation</button>}

      {step >= 1 && !error && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          {step === 1 && <div><div style={{ fontSize: 36, marginBottom: 12 }}>❓</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{loading ? 'Posting question...' : 'Question posted!'}</div>{question && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{question.title}</div>}</div>}
          {step === 2 && <div><div style={{ fontSize: 36, marginBottom: 12 }}>✍️</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Submitting answer...</div></div>}
          {step === 3 && <div><div style={{ fontSize: 36, marginBottom: 12 }}>👍</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Voting up the answer!</div></div>}
          {step === 4 && <div><div style={{ fontSize: 36, marginBottom: 12 }}>✅</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Accepting best answer...</div></div>}
          {step === 5 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, maxWidth: 350, margin: '0 auto', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
              <div style={{ fontWeight: 700, color: 'var(--info)', fontSize: 16 }}>Q&A Complete!</div>
              {question && <div style={{ margin: '8px 0', fontSize: 13, color: 'var(--text-secondary)' }}>Question: {question.title}</div>}
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Score: +1 upvote • Answer accepted ✓</div>
              <button className="btn-primary" style={{ marginTop: 12, padding: '8px 20px', fontSize: 13 }} onClick={reset}>🔄 New Simulation</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StackOverflowPage() {
  const [page, setPage] = useState('questions');
  const [selectedQId, setSelectedQId] = useState(null);

  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header><h1>Stack Overflow</h1><p>Q&A Platform - Low-Level Design</p></header>
      <nav>
        <button className={page === 'questions' ? 'active' : ''} onClick={() => { setPage('questions'); setSelectedQId(null); }}>Questions</button>
        <button className={page === 'ask' ? 'active' : ''} onClick={() => setPage('ask')}>Ask Question</button>
        <button className={page === 'users' ? 'active' : ''} onClick={() => setPage('users')}>Users</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'questions' && !selectedQId && <QuestionList onSelect={(id) => { setSelectedQId(id); setPage('detail'); }} />}
        {page === 'detail' && selectedQId && <QuestionDetail questionId={selectedQId} onBack={() => { setSelectedQId(null); setPage('questions'); }} />}
        {page === 'ask' && <AskQuestion onPosted={() => setPage('questions')} />}
        {page === 'users' && <Users />}
        {page === 'diagram' && <ClassDiagram module="stackoverflow" />}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'design' && <DesignDetails module="stackoverflow" />}
      </main>
    </div>
  );
}
