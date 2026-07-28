import { useState, useEffect } from 'react';
import { getQuestions, getTags } from '../api';

export default function QuestionList({ userId, onSelect }) {
  const [questions, setQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQuestions = () => {
    setLoading(true);
    getQuestions(keyword || null, tagFilter || null, null)
      .then(setQuestions)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getTags().then(setTags);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [tagFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  if (loading && questions.length === 0) return <div className="alert">Loading questions...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Questions</h2>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          placeholder="Search questions..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
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
            <div className="tags">
              {q.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
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
