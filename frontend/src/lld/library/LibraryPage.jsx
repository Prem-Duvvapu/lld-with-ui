import React, { useState, useEffect } from 'react';
import {
  getBooks,
  searchBooks,
  addBook,
  getMembers,
  getMember,
  registerMember,
  borrowBook,
  returnBook,
  getActiveLoans,
  getLoanHistory,
  getNotifications,
  payFine,
  simReset,
  simBorrow,
  simReturn,
  simSweep,
  simGetSnapshots,
  simGetEvents,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import SequenceDiagram from '../../components/SequenceDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';
import { usePolling } from '../../hooks/usePolling';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('catalog');

  // Real State
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Form State
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newIsbn, setNewIsbn] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Computer Science');
  const [newCopies, setNewCopies] = useState(2);

  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowBookTarget, setBorrowBookTarget] = useState(null);

  const [showRegisterMemberModal, setShowRegisterMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberType, setNewMemberType] = useState('STUDENT');

  const [payAmount, setPayAmount] = useState('');

  // Simulation State
  const [simSnapshots, setSimSnapshots] = useState(null);
  const [simEvents, setSimEvents] = useState([]);
  const [simMemberId, setSimMemberId] = useState('sim-mem-1');
  const [simBookIsbn, setSimBookIsbn] = useState('978-0132350884');
  const [simLoading, setSimLoading] = useState(false);

  // Status Banner
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'info' });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      loadMemberDetails(selectedMemberId);
    }
  }, [selectedMemberId]);

  // Poll book availability so another member's borrow/return shows up without a manual refresh.
  // Skipped while a search filter is active — books also holds search results, and clobbering
  // them with the full catalog every few seconds would silently undo the user's search.
  usePolling(() => {
    if (searchQuery) return;
    getBooks().then(list => { if (Array.isArray(list)) setBooks(list); }).catch(() => {});
  }, 6000, [searchQuery]);

  // Poll the current member's notifications (overdue reminders, etc.).
  usePolling(() => {
    if (!selectedMemberId) return;
    getNotifications(selectedMemberId).then(n => setNotifications(n || [])).catch(() => {});
  }, 6000, [selectedMemberId]);

  const showBanner = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: 'info' }), 4000);
  };

  const loadInitialData = async () => {
    try {
      const bookList = await getBooks();
      if (Array.isArray(bookList)) setBooks(bookList);

      const memberList = await getMembers();
      if (Array.isArray(memberList) && memberList.length > 0) {
        setMembers(memberList);
        setSelectedMemberId(memberList[0].id);
        await loadMemberDetails(memberList[0].id);
      }
    } catch (err) {
      console.error(err);
      showBanner('Failed to connect to backend on port 9190.', 'error');
    }
  };

  const loadMemberDetails = async (memberId) => {
    try {
      const mem = await getMember(memberId);
      setSelectedMember(mem);
      const active = await getActiveLoans(memberId);
      setActiveLoans(active || []);
      const history = await getLoanHistory(memberId);
      setLoanHistory(history || []);
      const notifs = await getNotifications(memberId);
      setNotifications(notifs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await searchBooks(searchQuery);
      setBooks(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBorrow = async (isbn) => {
    if (!selectedMemberId) {
      showBanner('Please select an active member first.', 'error');
      return;
    }
    try {
      await borrowBook(selectedMemberId, isbn);
      showBanner('Book borrowed successfully!', 'success');
      setShowBorrowModal(false);
      const updatedBooks = await getBooks();
      setBooks(updatedBooks || []);
      loadMemberDetails(selectedMemberId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleReturn = async (loanId) => {
    try {
      await returnBook(loanId);
      showBanner('Book returned successfully!', 'success');
      const updatedBooks = await getBooks();
      setBooks(updatedBooks || []);
      loadMemberDetails(selectedMemberId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handlePayFine = async (e) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      await payFine(selectedMemberId, amt);
      setPayAmount('');
      showBanner('Fine payment processed!', 'success');
      loadMemberDetails(selectedMemberId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      await addBook({
        isbn: newIsbn,
        title: newTitle,
        author: newAuthor,
        category: newCategory,
        copies: newCopies,
      });
      setShowAddBookModal(false);
      setNewIsbn('');
      setNewTitle('');
      setNewAuthor('');
      showBanner('Book added to library catalog!', 'success');
      const updated = await getBooks();
      setBooks(updated || []);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleRegisterMember = async (e) => {
    e.preventDefault();
    try {
      const mem = await registerMember(newMemberName, newMemberEmail, newMemberType);
      setShowRegisterMemberModal(false);
      setNewMemberName('');
      setNewMemberEmail('');
      showBanner(`Registered member ${mem.name} (${mem.type})`, 'success');
      const memList = await getMembers();
      setMembers(memList || []);
      setSelectedMemberId(mem.id);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  // Simulation Handlers
  const handleSimReset = async () => {
    setSimLoading(true);
    try {
      const snap = await simReset();
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
      showBanner('Simulation sandbox reset to default state.', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimBorrow = async () => {
    try {
      const snap = await simBorrow(simMemberId, simBookIsbn);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimReturn = async (loanId) => {
    try {
      const snap = await simReturn(loanId);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimSweep = async (makeOverdue) => {
    try {
      const snap = await simSweep(makeOverdue);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
      showBanner(makeOverdue ? 'Triggered Overdue Sweep!' : 'Triggered Due-Date Reminder Sweep!', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, boxShadow: '0 4px 12px rgba(139,92,246,0.35)' }}>
            📖
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Library Management System</h1>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>LLD Portfolio Module #10 · Multi-Copy Catalog, Strategy Fines & Observer Sweeps</span>
          </div>
        </div>

        {/* Member Selector & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active Member:</span>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', outline: 'none' }}
            >
              {members.map(m => (
                <option key={m.id} value={m.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Status Banner */}
      {statusMsg.text && (
        <div style={{ padding: '10px 24px', background: statusMsg.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: 8, padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', overflowX: 'auto' }}>
        {[
          { id: 'catalog', label: '📚 Book Catalog & Borrow', badge: books.length },
          { id: 'dashboard', label: '👤 Member Dashboard & Loans', badge: activeLoans.length },
          { id: 'notifications', label: '🔔 Notifications & Alerts', badge: notifications.length },
          { id: 'simulation', label: '🕹️ Concurrency & Loan Simulation' },
          { id: 'diagram', label: '📐 Class Diagram' },
          { id: 'sequence', label: '🔄 Sequence Diagram' },
          { id: 'details', label: '📋 Design Details' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              if (t.id === 'simulation') handleSimReset();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === t.id ? '#8b5cf6' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: '#3b82f6', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
        {/* =================================================================== */}
        {/* TAB 1: BOOK CATALOG */}
        {/* =================================================================== */}
        {activeTab === 'catalog' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Library Book Catalog</h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Multi-copy assets with rack locations and real-time availability tracking</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowRegisterMemberModal(true)}
                  style={{ padding: '10px 16px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  + Add Member
                </button>
                <button
                  onClick={() => setShowAddBookModal(true)}
                  style={{ padding: '10px 18px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  + Add New Book
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <input
                type="text"
                placeholder="Search by book title, author, category, or ISBN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14 }}
              />
              <button type="submit" style={{ padding: '12px 24px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Search Catalog
              </button>
            </form>

            {/* Book Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
              {books.map(book => {
                const availableCount = book.availableCopiesCount !== undefined ? book.availableCopiesCount : (book.copies?.filter(c => c.isAvailable)?.length || 0);
                const totalCount = book.totalCopies !== undefined ? book.totalCopies : (book.copies?.length || 0);
                const hasFreeCopies = availableCount > 0;

                return (
                  <div key={book.isbn} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#334155', color: '#a78bfa', fontWeight: 600 }}>
                          {book.category}
                        </span>
                        <span style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: hasFreeCopies ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: hasFreeCopies ? '#34d399' : '#f87171',
                          fontWeight: 700,
                          border: `1px solid ${hasFreeCopies ? '#10b981' : '#ef4444'}`
                        }}>
                          {hasFreeCopies ? `${availableCount}/${totalCount} Available` : 'All Borrowed'}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{book.title}</h3>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>by {book.author}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>ISBN: {book.isbn}</div>

                      {/* Copies breakdown */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Copy Barcodes:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {book.copies?.map((c, i) => (
                          <span key={i} style={{
                            background: c.isAvailable ? 'var(--bg-primary)' : 'var(--border-primary)',
                            color: c.isAvailable ? '#38bdf8' : 'var(--text-muted)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            textDecoration: c.isAvailable ? 'none' : 'line-through',
                            border: '1px solid var(--border-primary)'
                          }}>
                            {c.copyId} ({c.rackLocation})
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleBorrow(book.isbn)}
                      disabled={!hasFreeCopies}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 8,
                        background: hasFreeCopies ? '#8b5cf6' : 'var(--border-primary)',
                        color: hasFreeCopies ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: hasFreeCopies ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {hasFreeCopies ? `Borrow as ${selectedMember?.name || 'Member'}` : 'Out of Stock'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Book Modal */}
            {showAddBookModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Add Book to Catalog</h3>
                  <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="ISBN (e.g. 978-0132350884)"
                      value={newIsbn}
                      onChange={e => setNewIsbn(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Title (e.g. Clean Architecture)"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Author (e.g. Robert C. Martin)"
                      value={newAuthor}
                      onChange={e => setNewAuthor(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Category"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Number of Physical Copies:</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newCopies}
                        onChange={e => setNewCopies(parseInt(e.target.value) || 1)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', marginTop: 4 }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setShowAddBookModal(false)}
                        style={{ padding: '8px 16px', borderRadius: 6, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Add Book
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Register Member Modal */}
            {showRegisterMemberModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Register Library Member</h3>
                  <form onSubmit={handleRegisterMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Member Type (Factory Policy):</label>
                      <select
                        value={newMemberType}
                        onChange={e => setNewMemberType(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', marginTop: 4 }}
                      >
                        <option value="STUDENT">STUDENT (Max 3 books, 14-day loan)</option>
                        <option value="FACULTY">FACULTY (Max 10 books, 30-day loan)</option>
                        <option value="GENERAL">GENERAL (Max 5 books, 21-day loan)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setShowRegisterMemberModal(false)}
                        style={{ padding: '8px 16px', borderRadius: 6, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Register
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: MEMBER DASHBOARD */}
        {/* =================================================================== */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
            {/* Left: Member Profile & Fine Balance */}
            <div>
              {selectedMember && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>
                      {selectedMember.name.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selectedMember.name}</h2>
                      <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>{selectedMember.type} MEMBER</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedMember.email}</div>
                    </div>
                  </div>

                  {/* Quota & Policy Stats */}
                  <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 8, display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ACTIVE LOANS</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                        {selectedMember.activeLoanCount} / {selectedMember.loanPolicy?.maxBooksAllowed}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>LOAN PERIOD</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>
                        {selectedMember.loanPolicy?.loanDurationDays} Days
                      </div>
                    </div>
                  </div>

                  {/* Fines Card */}
                  <div style={{ background: selectedMember.accruedFineBalance > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${selectedMember.accruedFineBalance > 0 ? '#ef4444' : '#10b981'}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Accrued Fine Balance:</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: selectedMember.accruedFineBalance > 0 ? '#f87171' : '#34d399' }}>
                        ₹{selectedMember.accruedFineBalance?.toFixed(2)}
                      </span>
                    </div>

                    {selectedMember.accruedFineBalance > 0 && (
                      <form onSubmit={handlePayFine} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input
                          type="number"
                          step="1"
                          placeholder="Pay amount (₹)"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 12 }}
                        />
                        <button type="submit" style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Pay Fine
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Active Loans & Return Operations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800 }}>
                  Active Borrowed Books ({activeLoans.length})
                </h3>

                {activeLoans.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                    No books currently checked out. Borrow books from the Catalog tab!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activeLoans.map(loan => {
                      const book = books.find(b => b.isbn === loan.isbn);
                      const isOverdue = loan.status === 'OVERDUE';
                      return (
                        <div key={loan.loanId} style={{ background: 'var(--bg-primary)', border: `1px solid ${isOverdue ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{book?.title || loan.isbn}</h4>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: isOverdue ? '#ef4444' : '#3b82f6', color: '#fff', fontWeight: 700 }}>
                                {loan.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                              Copy ID: {loan.copyId} · Issued: {loan.issueDate} · Due Date: <strong>{loan.dueDate}</strong>
                            </div>
                          </div>

                          <button
                            onClick={() => handleReturn(loan.loanId)}
                            style={{ padding: '8px 16px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                          >
                            Return Book
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Loan History */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 800 }}>Borrowing History</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {loanHistory.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No history records available.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 0' }}>Loan ID</th>
                          <th>ISBN / Book</th>
                          <th>Issued</th>
                          <th>Due</th>
                          <th>Returned</th>
                          <th>Fine (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loanHistory.map(l => (
                          <tr key={l.loanId} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                            <td style={{ padding: '8px 0', fontWeight: 600 }}>{l.loanId}</td>
                            <td>{l.isbn}</td>
                            <td>{l.issueDate}</td>
                            <td>{l.dueDate}</td>
                            <td>{l.returnDate || 'Active'}</td>
                            <td style={{ color: l.fineAmount > 0 ? '#ef4444' : '#34d399' }}>{l.fineAmount?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: NOTIFICATIONS */}
        {/* =================================================================== */}
        {activeTab === 'notifications' && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>
              🔔 Member Notification Feed ({notifications.length})
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Dispatched via Observer Pattern (`DueDateNotifier`) during background sweeps and lifecycle triggers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No notifications for {selectedMember?.name}.
                </div>
              ) : (
                notifications.slice().reverse().map((notif, idx) => {
                  const isOverdue = notif.type === 'BOOK_OVERDUE';
                  const isReminder = notif.type === 'DUE_DATE_REMINDER';
                  const isFine = notif.type === 'FINE_LEVIED';

                  let color = '#38bdf8';
                  if (isOverdue || isFine) color = '#ef4444';
                  if (isReminder) color = '#f59e0b';

                  return (
                    <div key={idx} style={{ background: 'var(--bg-primary)', borderLeft: `4px solid ${color}`, borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase' }}>
                          {notif.type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                          Ref ID: {notif.referenceId}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CONCURRENCY SIMULATION */}
        {/* =================================================================== */}
        {activeTab === 'simulation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#a855f7' }}>
                    🕹️ Concurrency & Loan Lifecycle Simulation
                  </h2>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Demonstrating Last-Copy Races (per-book lock), Borrow-Limit Races (per-member lock), and Observer Due-Date Sweeps.
                  </div>
                </div>
                <button
                  onClick={handleSimReset}
                  disabled={simLoading}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  🔄 Reset Simulation
                </button>
              </div>

              {/* Simulation Controls Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, background: 'var(--bg-primary)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                {/* Control 1: Test Borrow & Last Copy Race */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#eab308', marginBottom: 8 }}>1. Simulate Borrow / Last-Copy Race</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select
                      value={simMemberId}
                      onChange={e => setSimMemberId(e.target.value)}
                      style={{ flex: 1, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="sim-mem-1">Alice (Student - Max 3)</option>
                      <option value="sim-mem-2">Prof. Bob (Faculty - Max 10)</option>
                      <option value="sim-mem-3">Charlie (General - Max 5)</option>
                    </select>
                    <select
                      value={simBookIsbn}
                      onChange={e => setSimBookIsbn(e.target.value)}
                      style={{ flex: 1, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="978-0132350884">Clean Code (1 copy)</option>
                      <option value="978-0134685991">Effective Java (2 copies)</option>
                      <option value="978-0201633610">Design Patterns (2 copies)</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSimBorrow}
                    style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                  >
                    Execute Borrow Request
                  </button>
                </div>

                {/* Control 2: Due Date Sweep Simulation */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>2. Observer Due-Date Sweeps</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button
                      onClick={() => handleSimSweep(false)}
                      style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#0284c7', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                    >
                      Scan Reminders (&le; 2 Days)
                    </button>
                    <button
                      onClick={() => handleSimSweep(true)}
                      style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                    >
                      Force Overdue Transition
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Accelerates clock to test observer notification delivery.</div>
                </div>

                {/* Control 3: Quick Return with Fine */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>3. Return Active Loan</div>
                  <div style={{ maxHeight: 60, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {simSnapshots?.loans?.filter(l => l.status !== 'RETURNED').map(loan => (
                      <button
                        key={loan.loanId}
                        onClick={() => handleSimReturn(loan.loanId)}
                        style={{ padding: '4px 8px', borderRadius: 4, background: '#10b981', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}
                      >
                        Return {loan.loanId} ({loan.isbn.slice(-6)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2D Visual Shelf & Topology */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Visual Bookshelf Canvas */}
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    📚 Simulated Book Stacks (Physical Copies)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {simSnapshots?.books?.map(b => (
                      <div key={b.isbn} style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                          <span>{b.title}</span>
                          <span style={{ color: b.copies?.some(c => c.isAvailable) ? '#34d399' : '#f87171' }}>
                            {b.copies?.filter(c => c.isAvailable).length} / {b.copies?.length} Free
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          {b.copies?.map((c, i) => (
                            <div key={i} style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: c.isAvailable ? '#10b981' : '#ef4444',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              opacity: c.isAvailable ? 1 : 0.4
                            }}>
                              {c.isAvailable ? `📗 ${c.copyId}` : `📕 [BORROWED]`}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real-time Event Log */}
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    Live Simulation Event Stream ({simEvents.length})
                  </div>
                  <div style={{ flex: 1, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {simEvents.slice().reverse().map(ev => (
                      <div key={ev.id} style={{
                        background: 'var(--bg-secondary)',
                        padding: '8px 10px',
                        borderRadius: 6,
                        borderLeft: `3px solid ${ev.type.includes('REJECT') || ev.type.includes('FAIL') || ev.type.includes('OVERDUE') ? '#ef4444' : '#10b981'}`,
                        fontSize: 11
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 10 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ev.type}</span>
                          <span>{ev.timestamp}</span>
                        </div>
                        <div style={{ marginTop: 2, color: '#cbd5e1' }}>{ev.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: CLASS DIAGRAM */}
        {/* =================================================================== */}
        {activeTab === 'diagram' && <ClassDiagram module="library" />}

        {/* =================================================================== */}
        {/* TAB 6: SEQUENCE DIAGRAM */}
        {/* =================================================================== */}
        {activeTab === 'sequence' && <SequenceDiagram module="library" />}

        {/* =================================================================== */}
        {/* TAB 7: DESIGN DETAILS */}
        {/* =================================================================== */}
        {activeTab === 'details' && <DesignDetails module="library" />}
      </main>
    </div>
  );
}
