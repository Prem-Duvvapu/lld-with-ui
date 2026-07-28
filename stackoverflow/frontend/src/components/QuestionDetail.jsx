import { useState, useEffect } from 'react';
import { getQuestion, voteQuestion, voteAnswer, acceptAnswer, postAnswer, addComment } from '../api';

export default function QuestionDetail({ questionId, userId, onBack }) {
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [commentTexts, setCommentTexts] = useState({});

  const fetchQ = () => {
    getQuestion(questionId).then(setQ).finally(() => setLoading(false));
  };

  useEffect(() => { fetchQ(); }, [questionId]);

  const handleVoteQ = async (type) => {
    const data = await voteQuestion(questionId, userId, type);
    if (!data.error) setQ(data);
  };

  const handleVoteA = async (answerId, type) => {
    const data = await voteAnswer(answerId, userId, type);
    if (!data.error) fetchQ();
  };

  const handleAccept = async (answerId) => {
    const data = await acceptAnswer(questionId, answerId, q.authorId === userId ? userId : '');
    if (!data.error) setQ(data);
    else fetchQ();
  };

  const handlePostAnswer = async () => {
    if (!answerBody.trim()) return;
    const data = await postAnswer(questionId, answerBody, userId);
    if (!data.error) { setAnswerBody(''); fetchQ(); }
  };

  const handleComment = async (targetType, targetId) => {
    const text = commentTexts[targetId] || '';
    if (!text.trim()) return;
    const data = await addComment(targetType, targetId, text, userId);
    if (!data.error) {
      setCommentTexts((prev) => ({ ...prev, [targetId]: '' }));
      fetchQ();
    }
  };

  if (loading) return <div className="alert">Loading...</div>;
  if (!q) return <div className="alert">Question not found</div>;

  const isOwner = q.authorId === userId;

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

      <div className="tags" style={{ marginBottom: 16 }}>
        {q.tags.map((t) => <span key={t} className="tag">{t}</span>)}
      </div>

      {q.comments?.map((c) => (
        <div key={c.id} className="comment">
          <span className="comment-author">{c.authorName}</span> {c.body}
          <span className="comment-time"> — {new Date(c.createdAt).toLocaleString()}</span>
        </div>
      ))}

      <div className="add-comment">
        <input
          placeholder="Add a comment..."
          value={commentTexts[q.id] || ''}
          onChange={(e) => setCommentTexts((p) => ({ ...p, [q.id]: e.target.value }))}
        />
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
              {isOwner && !a.accepted && (
                <button className="accept-btn" onClick={() => handleAccept(a.id)}>Accept</button>
              )}
            </div>

            {a.comments?.map((c) => (
              <div key={c.id} className="comment" style={{ marginTop: 8 }}>
                <span className="comment-author">{c.authorName}</span> {c.body}
                <span className="comment-time"> — {new Date(c.createdAt).toLocaleString()}</span>
              </div>
            ))}

            <div className="add-comment">
              <input
                placeholder="Add a comment..."
                value={commentTexts[a.id] || ''}
                onChange={(e) => setCommentTexts((p) => ({ ...p, [a.id]: e.target.value }))}
              />
              <button onClick={() => handleComment('answer', a.id)}>Comment</button>
            </div>
          </div>
        ))}

        <div className="answer-form">
          <h4 style={{ marginBottom: 8 }}>Your Answer</h4>
          <textarea
            value={answerBody}
            onChange={(e) => setAnswerBody(e.target.value)}
            placeholder="Write your answer..."
          />
          <button className="btn-primary" onClick={handlePostAnswer} style={{ marginTop: 8 }}>
            Post Answer
          </button>
        </div>
      </div>
    </div>
  );
}
