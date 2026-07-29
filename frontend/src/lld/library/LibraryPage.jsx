import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchBooks, getAvailableBooks, borrowBook, returnBook, getMembers } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Georgia', 'Times New Roman', serif; background: #f5f0e8; color: #2d2a24; }
.library-app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 28px; color: #5c3d2e; }
header p { color: #8b7355; font-size: 14px; margin-top: 4px; }
nav { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; }
nav button { padding: 10px 24px; border: 2px solid #5c3d2e; background: white; color: #5c3d2e; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
nav button.active { background: #5c3d2e; color: white; }
nav button:hover:not(.active) { background: #ede4d8; }
main { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #5c3d2e; border-radius: 6px; color: #5c3d2e; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #5c3d2e; color: white; }
.search-bar { width: 100%; padding: 12px 16px; border: 2px solid #ddd; border-radius: 8px; font-size: 15px; margin-bottom: 16px; outline: none; font-family: Georgia, serif; }
.search-bar:focus { border-color: #5c3d2e; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.book-card { border: 2px solid #eee; border-radius: 10px; padding: 20px; background: #faf8f5; transition: all 0.2s; }
.book-card:hover { border-color: #8b7355; box-shadow: 0 4px 12px rgba(92,61,46,0.15); }
.book-card h3 { font-size: 16px; color: #5c3d2e; margin-bottom: 6px; }
.book-card .author { font-size: 13px; color: #8b7355; margin-bottom: 4px; font-style: italic; }
.book-card .isbn { font-size: 11px; color: #aaa; margin-bottom: 8px; }
.book-card .status { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.book-card .status.AVAILABLE { background: #e8f5e9; color: #2e7d32; }
.book-card .status.BORROWED { background: #fff3e0; color: #e65100; }
.book-card .status.RESERVED { background: #e3f2fd; color: #1565c0; }
.borrow-btn { margin-top: 12px; width: 100%; padding: 10px; background: #5c3d2e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-family: Georgia, serif; font-size: 14px; }
.borrow-btn:hover { background: #4a3024; }
.borrow-btn:disabled { background: #ccc; cursor: not-allowed; }

.lib-scene { position: relative; width: 100%; height: 380px; background: linear-gradient(180deg, #f5f0e8 0%, #fff 100%); border-radius: 12px; overflow: hidden; border: 1px solid #ddd; margin-bottom: 12px; }
.lib-shelf { position: absolute; left: 20px; top: 20px; right: 20px; bottom: 80px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.lib-book { height: 100px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #fff; text-align: center; padding: 4px; opacity: 0; transform: translateY(20px); transition: all 0.5s ease-out; cursor: default; }
.lib-book.visible { opacity: 1; transform: translateY(0); }
.lib-book.borrowed { opacity: 0.4; transform: translateY(-10px) scale(0.9); }
.lib-member-card { position: absolute; right: 20px; top: 20px; background: #fff; border: 2px solid #5c3d2e; border-radius: 10px; padding: 14px; width: 160px; z-index: 3; opacity: 0; transition: all 0.5s ease-out; }
.lib-member-card.visible { opacity: 1; }
.lib-member-card .name { font-weight: 700; color: #5c3d2e; font-size: 14px; }
.lib-member-card .email { font-size: 11px; color: #8b7355; }
.lib-librarian { position: absolute; left: 50%; bottom: 80px; font-size: 40px; transform: translateX(-50%); transition: all 0.5s; }
.lib-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 2px solid #5c3d2e; border-radius: 12px; padding: 20px; text-align: center; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.3); animation: popIn 0.4s ease-out; min-width: 200px; }
.lib-popup.done { border-color: #2e7d32; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.lib-table { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 120px; height: 60px; background: #8b7355; border-radius: 4px; opacity: 0; transition: all 0.5s; }
.lib-table.visible { opacity: 1; }
.lib-book-on-table { position: absolute; bottom: 90px; left: 50%; transform: translateX(-50%); font-size: 30px; opacity: 0; transition: all 0.5s; }
.lib-book-on-table.visible { opacity: 1; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
.step-dot.active { background: #5c3d2e; box-shadow: 0 0 8px rgba(92,61,46,0.5); }
.step-dot.done { background: #2e7d32; }
.alert { text-align: center; padding: 32px; color: #666; font-size: 16px; }
.error { margin-top: 16px; padding: 12px; background: #fff0f0; color: #d32f2f; border-radius: 8px; font-size: 14px; }
`;

const BOOK_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'];

function BooksTab() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    searchBooks('').then(data => { setBooks(data); setLoading(false); });
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    searchBooks(q).then(setBooks);
  };

  const handleBorrow = async (bookId) => {
    setResult(null);
    try {
      const data = await borrowBook(1, bookId);
      if (data.error) { setResult({ error: data.error }); return; }
      setResult({ success: `Borrowed! Due: ${data.dueDate}` });
      const updated = await searchBooks(query);
      setBooks(updated);
    } catch { setResult({ error: 'Failed to borrow' }); }
  };

  if (loading) return <div className="alert">Loading books...</div>;

  return (
    <div>
      <input className="search-bar" placeholder="Search by title, author, or ISBN..." value={query} onChange={e => handleSearch(e.target.value)} />
      {result && (
        <div style={{ padding: 10, marginBottom: 12, borderRadius: 6, textAlign: 'center', background: result.error ? '#fff0f0' : '#e8f5e9', color: result.error ? '#d32f2f' : '#2e7d32', fontSize: 13 }}>
          {result.error || result.success}
        </div>
      )}
      {books.length === 0 ? <div className="alert">No books found.</div> : (
        <div className="book-grid">
          {books.map((book, i) => (
            <div key={book.id} className="book-card">
              <h3>{book.title}</h3>
              <div className="author">by {book.author}</div>
              <div className="isbn">ISBN: {book.isbn}</div>
              <div><span className={`status ${book.status}`}>{book.status}</span></div>
              {book.status === 'AVAILABLE' && (
                <button className="borrow-btn" onClick={() => handleBorrow(book.id)}>Borrow</button>
              )}
              {book.status === 'BORROWED' && (
                <button className="borrow-btn" disabled style={{ background: '#ccc' }}>Unavailable</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [borrowData, setBorrowData] = useState(null);
  const [returnData, setReturnData] = useState(null);
  const [bookVisible, setBookVisible] = useState(0);
  const [borrowedBookIdx, setBorrowedBookIdx] = useState(-1);
  const [showLibrarian, setShowLibrarian] = useState(false);
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showBookOnTable, setShowBookOnTable] = useState(false);
  const [memberName, setMemberName] = useState('Alice');
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Borrowed', 'Reading', 'Return', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    setStep(0); setLoading(false); setError(''); setBorrowData(null);
    setReturnData(null); setBookVisible(0); setBorrowedBookIdx(-1);
    setShowLibrarian(false); setShowMemberCard(false); setShowTable(false);
    setShowBookOnTable(false);
  };

  const books = [
    { title: 'The Great Gatsby', color: BOOK_COLORS[0] },
    { title: 'To Kill a Mockingbird', color: BOOK_COLORS[1] },
    { title: '1984', color: BOOK_COLORS[2] },
    { title: 'Pride and Prejudice', color: BOOK_COLORS[3] },
    { title: 'Catcher in the Rye', color: BOOK_COLORS[4] },
    { title: 'Harry Potter', color: BOOK_COLORS[5] },
  ];

  const startSim = async () => {
    setError(''); setStep(1); setShowLibrarian(true); setShowMemberCard(true);
    for (let i = 0; i <= books.length; i++) {
      await new Promise(r => setTimeout(r, 300));
      if (!mountedRef.current) return;
      setBookVisible(i);
    }
  };

  const borrowAction = async () => {
    setError(''); setLoading(true);
    try {
      const data = await borrowBook(1, 1);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBorrowData(data); setLoading(false); setBorrowedBookIdx(0);
      setStep(2);
    } catch { if (mountedRef.current) { setError('Failed to borrow'); setLoading(false); } }
  };

  const startReading = () => {
    setStep(3); setShowTable(true);
    setTimeout(() => { if (mountedRef.current) setShowBookOnTable(true); }, 600);
  };

  const returnAction = async () => {
    if (!borrowData) return; setLoading(true);
    try {
      const data = await returnBook(borrowData.id);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setReturnData(data); setLoading(false);
      setShowBookOnTable(false); setBorrowedBookIdx(-1);
      setStep(4);
    } catch { if (mountedRef.current) { setError('Failed to return'); setLoading(false); } }
  };

  const btnStyle = {
    padding: '8px 20px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', color: '#fff', transition: 'all 0.2s',
    background: '#5c3d2e', margin: '0 4px',
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="lib-scene">
        <div className="lib-shelf">
          {books.map((b, i) => (
            <div key={i} className={`lib-book ${i < bookVisible ? 'visible' : ''} ${i === borrowedBookIdx ? 'borrowed' : ''}`}
              style={{ background: b.color, transitionDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, padding: '0 4px' }}>{b.title.split(' ').slice(0, 2).join(' ')}</div>
            </div>
          ))}
        </div>

        <div className={`lib-member-card ${showMemberCard ? 'visible' : ''}`}>
          <div className="name">{memberName}</div>
          <div className="email">alice@library.com</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>Member since Jan 2024</div>
        </div>

        <div className={`lib-librarian ${showLibrarian ? 'visible' : ''}`}>👩‍🏫</div>

        <div className={`lib-table ${showTable ? 'visible' : ''}`} />
        <div className={`lib-book-on-table ${showBookOnTable ? 'visible' : ''}`}>📖</div>

        {step === 2 && borrowData && (
          <div className="lib-popup">
            <div style={{ fontSize: 36, marginBottom: 4 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#5c3d2e', fontSize: 15 }}>Borrowed!</div>
            <div style={{ fontSize: 11, color: '#8b7355', marginTop: 4 }}>{borrowData.bookTitle}</div>
            <div style={{ fontSize: 11, color: '#666' }}>Due: {borrowData.dueDate}</div>
          </div>
        )}

        {step === 4 && returnData && (
          <div className="lib-popup done">
            <div style={{ fontSize: 36, marginBottom: 4 }}>🎉</div>
            <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 15 }}>Returned!</div>
            <div style={{ fontSize: 11, color: '#8b7355', marginTop: 4 }}>{returnData.bookTitle}</div>
            {returnData.fine > 0 && <div style={{ fontSize: 13, color: '#d32f2f', fontWeight: 700, marginTop: 2 }}>Fine: ₹{returnData.fine.toFixed(2)}</div>}
          </div>
        )}
      </div>

      {error && <div className="error" style={{ marginTop: 12, textAlign: 'center' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {step === 0 && <button onClick={startSim} style={{ padding: '12px 32px', background: '#5c3d2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>📚 Browse Books</button>}

        {step === 1 && <button onClick={borrowAction} disabled={loading} style={btnStyle}>📖 Borrow Book {loading ? '...' : ''}</button>}

        {step === 2 && <button onClick={startReading} disabled={loading} style={{ ...btnStyle, background: '#3498db' }}>⏳ Start Reading {loading ? '...' : ''}</button>}

        {step === 3 && <button onClick={returnAction} disabled={loading} style={{ ...btnStyle, background: '#e67e22' }}>↩️ Return Book {loading ? '...' : ''}</button>}

        {step === 4 && <button onClick={reset} style={{ ...btnStyle, background: '#2e7d32' }}>🔄 New Simulation</button>}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [page, setPage] = useState('books');

  return (
    <div className="library-app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header><h1>Library Management</h1><p>Book borrowing & return system - Low-Level Design</p></header>
      <nav>
        <button className={page === 'books' ? 'active' : ''} onClick={() => setPage('books')}>Books</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'books' && <BooksTab />}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'diagram' && <ClassDiagram module="library" />}
        {page === 'design' && <DesignDetails module="library" />}
      </main>
    </div>
  );
}
