import React, { useState, useEffect } from 'react';
import {
  getUsers,
  getUser,
  getConnections,
  getPendingRequests,
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  getJobs,
  postJob,
  applyJob,
  getConversation,
  sendMessage,
  getNotifications,
  searchUsers,
  searchJobs,
  addSkill,
  simReset,
  simConnect,
  simAccept,
  simMessage,
  simApply,
  simGetSnapshots,
  simGetEvents,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import SequenceDiagram from '../../components/SequenceDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';

export default function LinkedInPage() {
  const [activeTab, setActiveTab] = useState('network');

  // Real App State
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newSkill, setNewSkill] = useState('');

  // Messaging State
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Search State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSearchResults, setJobSearchResults] = useState([]);

  // Job Posting Form State
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobCompany, setNewJobCompany] = useState('');
  const [newJobLocation, setNewJobLocation] = useState('San Francisco, CA');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('Java, Distributed Systems, React');

  // Simulation State
  const [simSnapshots, setSimSnapshots] = useState(null);
  const [simEvents, setSimEvents] = useState([]);
  const [simSelectedSender, setSimSelectedSender] = useState('sim-charlie');
  const [simSelectedReceiver, setSimSelectedReceiver] = useState('sim-diana');
  const [simMsgText, setSimMsgText] = useState('Hey Diana, we have an open Staff Engineer role at Netflix!');
  const [simLoading, setSimLoading] = useState(false);

  // Status banners
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'info' });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadUserData(currentUserId);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (selectedChatUser && currentUserId) {
      loadChat(currentUserId, selectedChatUser.id);
    }
  }, [selectedChatUser, currentUserId]);

  const showBanner = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: 'info' }), 4000);
  };

  const loadInitialData = async () => {
    try {
      const userList = await getUsers();
      if (Array.isArray(userList) && userList.length > 0) {
        setUsers(userList);
        const defaultId = userList[0].id;
        setCurrentUserId(defaultId);
        await loadUserData(defaultId);
      }
      const jobList = await getJobs();
      if (Array.isArray(jobList)) setJobs(jobList);
    } catch (err) {
      console.error(err);
      showBanner('Failed to connect to backend on port 9190. Make sure Spring Boot is running.', 'error');
    }
  };

  const loadUserData = async (userId) => {
    try {
      const user = await getUser(userId);
      setCurrentUser(user);
      const conns = await getConnections(userId);
      setConnections(conns || []);
      const pending = await getPendingRequests(userId);
      setPendingRequests(pending || []);
      const notifs = await getNotifications(userId);
      setNotifications(notifs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChat = async (userA, userB) => {
    try {
      const convo = await getConversation(userA, userB);
      setMessages(convo || []);
    } catch (err) {
      console.error(err);
    }
  };

  // User Actions
  const handleConnectRequest = async (targetId) => {
    try {
      await sendConnectionRequest(currentUserId, targetId);
      showBanner('Connection request sent!', 'success');
      loadUserData(currentUserId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleAcceptConnection = async (connectionId) => {
    try {
      await acceptConnection(connectionId, currentUserId);
      showBanner('Connection request accepted!', 'success');
      loadUserData(currentUserId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleRejectConnection = async (connectionId) => {
    try {
      await rejectConnection(connectionId, currentUserId);
      showBanner('Connection request rejected', 'info');
      loadUserData(currentUserId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    try {
      await addSkill(currentUserId, newSkill.trim());
      setNewSkill('');
      showBanner('Skill added successfully!', 'success');
      loadUserData(currentUserId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChatUser) return;
    try {
      await sendMessage(currentUserId, selectedChatUser.id, messageInput.trim());
      setMessageInput('');
      loadChat(currentUserId, selectedChatUser.id);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = newJobSkills.split(',').map(s => s.trim()).filter(Boolean);
      await postJob({
        posterId: currentUserId,
        title: newJobTitle,
        company: newJobCompany,
        location: newJobLocation,
        description: newJobDesc,
        requiredSkills: skillsArray,
        employmentType: 'FULL_TIME',
      });
      setShowPostJobModal(false);
      setNewJobTitle('');
      setNewJobCompany('');
      setNewJobDesc('');
      showBanner('Job posted successfully!', 'success');
      const updated = await getJobs();
      setJobs(updated || []);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleApplyJob = async (jobId) => {
    try {
      await applyJob(jobId, currentUserId);
      showBanner('Successfully applied for job!', 'success');
      const updated = await getJobs();
      setJobs(updated || []);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleUserSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await searchUsers(userSearchQuery, currentUserId);
      setUserSearchResults(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJobSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await searchJobs(jobSearchQuery, '', currentUserId);
      setJobSearchResults(res || []);
    } catch (err) {
      console.error(err);
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
      showBanner('Simulation state reset to default topology', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimConnect = async () => {
    try {
      const snap = await simConnect(simSelectedSender, simSelectedReceiver);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimAccept = async (connId) => {
    try {
      const snap = await simAccept(connId);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimMessage = async () => {
    try {
      const snap = await simMessage(simSelectedSender, simSelectedReceiver, simMsgText);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimApply = async (applicantId, jobId) => {
    try {
      const snap = await simApply(applicantId, jobId);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, boxShadow: '0 4px 12px rgba(10,102,194,0.35)' }}>
            in
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>LinkedIn Professional Network</h1>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>LLD Portfolio Module #26 · Connections, Jobs & Messaging</span>
          </div>
        </div>

        {/* User Switcher & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active Profile:</span>
            <select
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', outline: 'none' }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {u.name} ({u.email})
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

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', gap: 8, padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', overflowX: 'auto' }}>
        {[
          { id: 'network', label: '👤 My Profile & Network', badge: pendingRequests.length },
          { id: 'jobs', label: '💼 Jobs & Applications', badge: jobs.length },
          { id: 'messages', label: '💬 Messaging & Inboxes' },
          { id: 'simulation', label: '🕹️ Interactive 2D Simulation' },
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
              background: activeTab === t.id ? '#0a66c2' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
        {/* =================================================================== */}
        {/* TAB 1: PROFILE & NETWORK */}
        {/* =================================================================== */}
        {activeTab === 'network' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
            {/* Left Column: Current User Profile Card */}
            <div>
              {currentUser && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #0a66c2, #004182)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{currentUser.name}</h2>
                      <div style={{ fontSize: 13, color: '#0a66c2', fontWeight: 600, marginTop: 2 }}>{currentUser.profile?.headline || 'Professional Member'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>📍 {currentUser.profile?.location || 'Remote'} · {connections.length} Connections</div>
                    </div>
                  </div>

                  {currentUser.profile?.summary && (
                    <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, fontSize: 13, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 }}>
                      {currentUser.profile.summary}
                    </div>
                  )}

                  {/* Skills Tag Cloud */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Skills & Competencies</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {currentUser.profile?.skills?.map((s, idx) => (
                        <span key={idx} style={{ background: 'rgba(10,102,194,0.15)', color: '#60a5fa', border: '1px solid rgba(10,102,194,0.3)', padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
                          ✓ {s.name || s}
                        </span>
                      ))}
                    </div>
                    <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Add skill (e.g. Docker)..."
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 12 }}
                      />
                      <button type="submit" style={{ padding: '6px 12px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        + Add
                      </button>
                    </form>
                  </div>

                  {/* Experience List */}
                  {currentUser.profile?.experiences?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Experience</div>
                      {currentUser.profile.experiences.map((exp, idx) => (
                        <div key={idx} style={{ borderLeft: '2px solid #0a66c2', paddingLeft: 10, marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{exp.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{exp.company} · {exp.location}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notifications feed */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Recent Notifications ({notifications.length})</div>
                    <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {notifications.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No notifications yet.</div>
                      ) : (
                        notifications.slice().reverse().map((n, i) => (
                          <div key={i} style={{ background: 'var(--bg-primary)', padding: 8, borderRadius: 6, fontSize: 11, borderLeft: '3px solid #0a66c2' }}>
                            <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{n.message}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(n.timestamp).toLocaleTimeString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Connections, Pending Invites, Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Pending Connection Invitations */}
              {pendingRequests.length > 0 && (
                <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 12, padding: 16 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#eab308', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⏳ Pending Invitations ({pendingRequests.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingRequests.map(req => {
                      const sender = users.find(u => u.id === req.requesterId);
                      return (
                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{sender?.name || req.requesterId}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sender?.profile?.headline || 'Wants to connect'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleAcceptConnection(req.id)}
                              style={{ padding: '6px 12px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => handleRejectConnection(req.id)}
                              style={{ padding: '6px 12px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            >
                              ✕ Ignore
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* People Search with Relevance Scoring */}
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 800 }}>🔍 Discover & Search Professionals</h3>
                <form onSubmit={handleUserSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Search by name, skills (e.g. Java, AI), or title..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                  <button type="submit" style={{ padding: '10px 18px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Ranked Search
                  </button>
                </form>

                {/* Candidate Network Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {(userSearchResults.length > 0 ? userSearchResults.map(r => r.user) : users.filter(u => u.id !== currentUserId)).map(other => {
                    const isConnected = connections.some(c => c.id === other.id);
                    return (
                      <div key={other.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#334155', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                              {other.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{other.name}</div>
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: isConnected ? '#10b981' : '#334155', color: '#fff', fontWeight: 600 }}>
                                {isConnected ? '1st Degree' : '2nd Degree'}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                            {other.profile?.headline || 'Software Professional'}
                          </div>
                        </div>

                        <div>
                          {isConnected ? (
                            <button
                              onClick={() => {
                                setSelectedChatUser(other);
                                setActiveTab('messages');
                              }}
                              style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#0a66c2', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                            >
                              💬 Message
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnectRequest(other.id)}
                              style={{ width: '100%', padding: '6px', borderRadius: 6, background: 'rgba(10,102,194,0.2)', color: '#60a5fa', border: '1px solid #0a66c2', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                            >
                              + Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: JOBS & APPLICATIONS */}
        {/* =================================================================== */}
        {activeTab === 'jobs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Explore Job Opportunities</h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Weighted algorithmic job matching based on skill overlap & location</div>
              </div>
              <button
                onClick={() => setShowPostJobModal(true)}
                style={{ padding: '10px 18px', borderRadius: 8, background: '#0a66c2', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                + Post a New Job
              </button>
            </div>

            {/* Job Search Form */}
            <form onSubmit={handleJobSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <input
                type="text"
                placeholder="Search job title, skills, or keywords..."
                value={jobSearchQuery}
                onChange={e => setJobSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14 }}
              />
              <button type="submit" style={{ padding: '12px 24px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Search Jobs
              </button>
            </form>

            {/* Job Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
              {jobs.map(job => {
                const hasApplied = job.applicantUserIds?.includes(currentUserId) || job.applicants?.includes(currentUserId);
                const isPoster = job.posterId === currentUserId;
                return (
                  <div key={job.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{job.title}</h3>
                          <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, marginTop: 2 }}>{job.company} · 📍 {job.location}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#334155', color: '#cbd5e1', fontWeight: 600 }}>
                          {job.employmentType}
                        </span>
                      </div>

                      <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: '10px 0' }}>
                        {job.description}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0' }}>
                        {job.requiredSkills?.map((skill, idx) => (
                          <span key={idx} style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        👥 {job.applicantUserIds?.length || 0} Applicants
                      </span>
                      {hasApplied ? (
                        <button disabled style={{ padding: '8px 16px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'default' }}>
                          ✓ Applied
                        </button>
                      ) : isPoster ? (
                        <span style={{ fontSize: 12, color: '#eab308', fontWeight: 600 }}>Your Posting</span>
                      ) : (
                        <button
                          onClick={() => handleApplyJob(job.id)}
                          style={{ padding: '8px 16px', borderRadius: 6, background: '#0a66c2', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                        >
                          Easy Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Post Job Modal */}
            {showPostJobModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 500 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Create Job Opening</h3>
                  <form onSubmit={handlePostJob} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="Job Title (e.g. Staff Backend Engineer)"
                      value={newJobTitle}
                      onChange={e => setNewJobTitle(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newJobCompany}
                      onChange={e => setNewJobCompany(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. San Francisco, CA or Remote)"
                      value={newJobLocation}
                      onChange={e => setNewJobLocation(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <textarea
                      placeholder="Job Description..."
                      value={newJobDesc}
                      onChange={e => setNewJobDesc(e.target.value)}
                      rows={3}
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Required Skills comma-separated (e.g. Java, Kubernetes, React)"
                      value={newJobSkills}
                      onChange={e => setNewJobSkills(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setShowPostJobModal(false)}
                        style={{ padding: '8px 16px', borderRadius: 6, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', borderRadius: 6, background: '#0a66c2', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Publish Opening
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: MESSAGING */}
        {/* =================================================================== */}
        {activeTab === 'messages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, height: 600, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
            {/* Left: Connected Contacts List */}
            <div style={{ borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border-primary)', fontWeight: 800, fontSize: 14 }}>
                Active Connections ({connections.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {connections.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                    No connections yet. Connect with professionals in the Network tab to chat!
                  </div>
                ) : (
                  connections.map(contact => {
                    const isSelected = selectedChatUser?.id === contact.id;
                    return (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedChatUser(contact)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(10,102,194,0.15)' : 'transparent',
                          borderBottom: '1px solid var(--border-primary)',
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {contact.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{contact.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {contact.profile?.headline || 'Connected'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Message Pane */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {selectedChatUser ? (
                <>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {selectedChatUser.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedChatUser.name}</div>
                      <div style={{ fontSize: 11, color: '#10b981' }}>● 1st Degree Connection · Direct Chat Enabled</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 13 }}>
                        No messages yet. Send a greeting to start conversation!
                      </div>
                    ) : (
                      messages.map((m, idx) => {
                        const isMe = m.senderId === currentUserId;
                        return (
                          <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: isMe ? '#0a66c2' : '#334155',
                              color: '#fff',
                              fontSize: 13,
                              lineHeight: 1.4,
                            }}>
                              {m.content}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} style={{ padding: 16, borderTop: '1px solid var(--border-primary)', display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      placeholder={`Message ${selectedChatUser.name}...`}
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                  Select a contact on the left to start messaging
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: INTERACTIVE 2D SIMULATION */}
        {/* =================================================================== */}
        {activeTab === 'simulation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                    🕹️ Network Graph & Concurrency Simulation
                  </h2>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Isolated real-time sandbox testing connection race locks, messaging guards, and job application idempotency.
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
                {/* 1. Trigger Connection */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#eab308', marginBottom: 8 }}>1. Trigger Connection Request</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select
                      value={simSelectedSender}
                      onChange={e => setSimSelectedSender(e.target.value)}
                      style={{ flex: 1, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="sim-alice">Alice (AI Scientist)</option>
                      <option value="sim-bob">Bob (Cloud Architect)</option>
                      <option value="sim-charlie">Charlie (Eng Manager)</option>
                      <option value="sim-diana">Diana (Product Manager)</option>
                    </select>
                    <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>➔</span>
                    <select
                      value={simSelectedReceiver}
                      onChange={e => setSimSelectedReceiver(e.target.value)}
                      style={{ flex: 1, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="sim-alice">Alice (AI Scientist)</option>
                      <option value="sim-bob">Bob (Cloud Architect)</option>
                      <option value="sim-charlie">Charlie (Eng Manager)</option>
                      <option value="sim-diana">Diana (Product Manager)</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSimConnect}
                    style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#0a66c2', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                  >
                    Send Connection Request
                  </button>
                </div>

                {/* 2. Direct Messaging Guard Test */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>2. Test Messaging Guard</div>
                  <input
                    type="text"
                    value={simMsgText}
                    onChange={e => setSimMsgText(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11, marginBottom: 8 }}
                  />
                  <button
                    onClick={handleSimMessage}
                    style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                  >
                    Dispatch Message
                  </button>
                </div>

                {/* 3. Job Application Idempotency Test */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', marginBottom: 8 }}>3. Test Job Application Race</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Simulate Alice applying to Charlie's Staff Backend role at Netflix.
                  </div>
                  <button
                    onClick={() => handleSimApply('sim-alice', 'sim-job-1')}
                    style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#a855f7', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                  >
                    Alice Apply (Staff Engineer)
                  </button>
                </div>
              </div>

              {/* Network Graph Visualizer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Visual Graph Node Representation */}
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    Topology Map (4 Simulated Nodes)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { id: 'sim-alice', name: 'Alice Vance', role: 'AI Scientist', company: 'Black Mesa' },
                      { id: 'sim-bob', name: 'Bob Martinez', role: 'Cloud Architect', company: 'Google Cloud' },
                      { id: 'sim-charlie', name: 'Charlie Kim', role: 'Eng Manager', company: 'Netflix' },
                      { id: 'sim-diana', name: 'Diana Prince', role: 'Product Manager', company: 'AWS' },
                    ].map(node => (
                      <div key={node.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#60a5fa' }}>{node.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{node.role}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{node.company}</div>
                      </div>
                    ))}
                  </div>

                  {/* Active Links */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Active Network Edges:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {simSnapshots?.connections?.map((c, i) => (
                        <div key={i} style={{ fontSize: 11, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{c.requesterId} ➔ {c.targetId} ({c.status})</span>
                          {c.status === 'PENDING' && (
                            <button
                              onClick={() => handleSimAccept(c.id)}
                              style={{ padding: '2px 8px', borderRadius: 4, background: '#10b981', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Real-Time Event Log Stream */}
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    Live Simulation Event Stream ({simEvents.length})
                  </div>
                  <div style={{ flex: 1, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {simEvents.slice().reverse().map(ev => (
                      <div key={ev.id} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6, borderLeft: `3px solid ${ev.type.includes('FAIL') || ev.type.includes('REJECT') ? '#ef4444' : '#10b981'}`, fontSize: 11 }}>
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
        {activeTab === 'diagram' && <ClassDiagram module="linkedin" />}

        {/* =================================================================== */}
        {/* TAB 6: SEQUENCE DIAGRAM */}
        {/* =================================================================== */}
        {activeTab === 'sequence' && <SequenceDiagram module="linkedin" />}

        {/* =================================================================== */}
        {/* TAB 7: DESIGN DETAILS */}
        {/* =================================================================== */}
        {activeTab === 'details' && <DesignDetails module="linkedin" />}
      </main>
    </div>
  );
}
