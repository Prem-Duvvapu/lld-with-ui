import { useState } from 'react';
import QuestionList from './components/QuestionList';
import QuestionDetail from './components/QuestionDetail';
import AskQuestion from './components/AskQuestion';
import Users from './components/Users';
import './App.css';

const USER_ID = 'U1';

export default function App() {
  const [page, setPage] = useState('questions');
  const [selectedQId, setSelectedQId] = useState(null);

  return (
    <div className="app">
      <header>
        <h1>Stack Overflow</h1>
        <p>Q&A Platform - Low-Level Design</p>
      </header>

      <nav>
        <button className={page === 'questions' ? 'active' : ''}
                onClick={() => { setPage('questions'); setSelectedQId(null); }}>
          Questions
        </button>
        <button className={page === 'ask' ? 'active' : ''}
                onClick={() => setPage('ask')}>
          Ask Question
        </button>
        <button className={page === 'users' ? 'active' : ''}
                onClick={() => setPage('users')}>
          Users
        </button>
      </nav>

      <main>
        {page === 'questions' && !selectedQId && (
          <QuestionList
            userId={USER_ID}
            onSelect={(id) => { setSelectedQId(id); setPage('detail'); }}
          />
        )}
        {page === 'detail' && selectedQId && (
          <QuestionDetail
            questionId={selectedQId}
            userId={USER_ID}
            onBack={() => { setSelectedQId(null); setPage('questions'); }}
          />
        )}
        {page === 'ask' && <AskQuestion userId={USER_ID} onPosted={() => setPage('questions')} />}
        {page === 'users' && <Users />}
      </main>
    </div>
  );
}
