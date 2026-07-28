import { useState, useEffect } from 'react';
import { postQuestion, getTags } from '../api';

export default function AskQuestion({ userId, onPosted }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTags().then(setTags);
  }, []);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTags.length === 0) { setError('Select at least one tag'); return; }
    setError('');
    setLoading(true);
    const data = await postQuestion(title, body, userId, selectedTags);
    if (data.error) setError(data.error);
    else onPosted();
    setLoading(false);
  };

  return (
    <div className="ask-form">
      <h2>Ask a Question</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
                 placeholder="What's your question?" required />
        </div>
        <div className="form-group">
          <label>Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
                    placeholder="Describe your question in detail..." required />
        </div>
        <div className="form-group">
          <label>Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t) => (
              <span key={t.name}
                    className={`tag`}
                    style={{
                      cursor: 'pointer', padding: '4px 10px',
                      background: selectedTags.includes(t.name) ? '#f48024' : '#fff4e6',
                      color: selectedTags.includes(t.name) ? 'white' : '#f48024',
                    }}
                    onClick={() => toggleTag(t.name)}>
                {t.name}
              </span>
            ))}
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Posting...' : 'Post Question'}
        </button>
      </form>
    </div>
  );
}
