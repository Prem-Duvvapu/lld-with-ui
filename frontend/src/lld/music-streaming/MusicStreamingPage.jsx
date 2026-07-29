import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.ms-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.player-card { background: var(--bg-primary); border: 2px solid var(--accent); border-radius: 14px; padding: 20px; text-align: center; max-width: 440px; margin: 0 auto 20px auto; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }

.audio-waves { display: flex; gap: 4px; justify-content: center; height: 40px; align-items: flex-end; margin: 16px 0; }
.wave-bar { width: 6px; background: var(--accent); border-radius: 3px; transition: height 0.2s ease; }

.track-list { display: flex; flex-direction: column; gap: 8px; max-width: 440px; margin: 0 auto; }
.track-item { padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s; }
.track-item.playing { border-color: var(--accent); background: rgba(102,126,234,0.1); }
`;

function AnimatedFlow() {
  const tracks = [
    { id: 'T1', title: 'Starboy', artist: 'The Weeknd', duration: '3:50', icon: '🎧' },
    { id: 'T2', title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', icon: '🎷' },
    { id: 'T3', title: 'Levitating', artist: 'Dua Lipa', duration: '3:23', icon: '🎸' },
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const [waveHeights, setWaveHeights] = useState([12, 28, 36, 18, 24, 40, 15, 30]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 2));
        setWaveHeights(Array.from({ length: 8 }, () => Math.floor(Math.random() * 30 + 10)));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentTrack = tracks[currentIdx];

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => {
    setCurrentIdx((currentIdx + 1) % tracks.length);
    setProgress(0);
  };

  return (
    <div className="ms-container">
      <style>{CSS}</style>

      <div className="player-card">
        <div style={{ fontSize: 48 }}>{currentTrack.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
          {currentTrack.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{currentTrack.artist}</div>

        <div className="audio-waves">
          {waveHeights.map((h, i) => (
            <div key={i} className="wave-bar" style={{ height: isPlaying ? `${h}px` : '8px' }} />
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', margin: '12px 0' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, justify: 'center', marginTop: 12 }}>
          <button onClick={togglePlay} style={{ padding: '10px 24px', borderRadius: 20, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            {isPlaying ? '⏸ Pause Streaming' : '▶ Stream Track'}
          </button>
          <button onClick={nextTrack} style={{ padding: '10px 16px', borderRadius: 20, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', cursor: 'pointer', fontWeight: 600 }}>
            ⏭ Next
          </button>
        </div>
      </div>

      <div className="track-list">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>NOW PLAYING QUEUE</div>
        {tracks.map((t, idx) => (
          <div key={t.id} className={`track-item ${idx === currentIdx ? 'playing' : ''}`} onClick={() => { setCurrentIdx(idx); setProgress(0); setIsPlaying(true); }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>{t.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.artist}</div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MusicStreamingPage() {
  return (
    <LldPage module="music-streaming" title="Music Streaming System" icon="🎵" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
