import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.bf-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.bf-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.bf-input { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-size: 13px; width: 180px; }
.bf-btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.bf-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.bf-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.bf-stage { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; text-align: center; }

.bit-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin: 16px 0; max-width: 640px; margin-left: auto; margin-right: auto; }
.bit-cell { padding: 10px 4px; background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 8px; text-align: center; transition: all 0.3s; }
.bit-cell.active { border-color: var(--success); background: rgba(63,185,80,0.15); box-shadow: 0 0 10px rgba(63,185,80,0.3); }
.bit-cell.highlighted { border-color: var(--accent); transform: scale(1.08); box-shadow: 0 0 14px var(--accent); }

.hash-lines { display: flex; justify-content: center; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
.hash-badge { padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 6px; font-family: monospace; font-size: 12px; color: var(--info); }

.metrics-row { display: flex; gap: 16px; justify-content: center; font-size: 13px; margin-top: 16px; }
.metrics-box { background: var(--bg-secondary); padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-primary); text-align: center; }
`;

function AnimatedFlow() {
  const BIT_SIZE = 16;
  const [bits, setBits] = useState(Array(BIT_SIZE).fill(0));
  const [wordInput, setWordInput] = useState('');
  const [activeHashes, setActiveHashes] = useState([]);
  const [status, setStatus] = useState('Enter a word to ADD or QUERY the Bloom Filter.');
  const [insertedWords, setInsertedWords] = useState([]);

  const computeHashes = (str) => {
    let hash1 = 0, hash2 = 0, hash3 = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      hash1 = (hash1 * 31 + code) % BIT_SIZE;
      hash2 = (hash2 * 17 + code) % BIT_SIZE;
      hash3 = (hash3 * 13 + code) % BIT_SIZE;
    }
    return [Math.abs(hash1), Math.abs(hash2), Math.abs(hash3)];
  };

  const handleAdd = () => {
    const word = wordInput.trim().toLowerCase();
    if (!word) return;

    const hashes = computeHashes(word);
    setActiveHashes(hashes);

    const newBits = [...bits];
    hashes.forEach(idx => newBits[idx] = 1);
    setBits(newBits);

    setInsertedWords(prev => [...new Set([...prev, word])]);
    setStatus(`✅ Added "${word}" -> Computed hash bits [${hashes.join(', ')}]. Bits set to 1.`);
    setWordInput('');
  };

  const handleQuery = () => {
    const word = wordInput.trim().toLowerCase();
    if (!word) return;

    const hashes = computeHashes(word);
    setActiveHashes(hashes);

    const allPresent = hashes.every(idx => bits[idx] === 1);
    if (allPresent) {
      const wasAdded = insertedWords.includes(word);
      setStatus(
        wasAdded
          ? `🟢 PROBABLY PRESENT! All bits [${hashes.join(', ')}] are 1. (True Positive)`
          : `⚠️ PROBABLY PRESENT! All bits [${hashes.join(', ')}] are 1. (Possible False Positive!)`
      );
    } else {
      setStatus(`🔴 DEFINITELY NOT PRESENT! At least one bit in [${hashes.join(', ')}] is 0 (100% Guaranteed No False Negatives).`);
    }
  };

  const setOnesCount = bits.filter(b => b === 1).length;
  const fpProb = Math.pow(1 - Math.exp(-3 * insertedWords.length / BIT_SIZE), 3) * 100;

  return (
    <div className="bf-container">
      <style>{CSS}</style>

      <div className="bf-controls">
        <input className="bf-input" placeholder="Word (e.g. 'alice', 'bob')" value={wordInput} onChange={e => setWordInput(e.target.value)} />
        <button className="bf-btn primary" onClick={handleAdd}>+ ADD Word</button>
        <button className="bf-btn" onClick={handleQuery}>🔍 QUERY Word</button>
      </div>

      <div className="bf-stage">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
          PROBABILISTIC BIT ARRAY (m = {BIT_SIZE} bits, k = 3 hash functions)
        </div>

        {activeHashes.length > 0 && (
          <div className="hash-lines">
            <div className="hash-badge">h1(x) = bit #{activeHashes[0]}</div>
            <div className="hash-badge">h2(x) = bit #{activeHashes[1]}</div>
            <div className="hash-badge">h3(x) = bit #{activeHashes[2]}</div>
          </div>
        )}

        <div className="bit-grid">
          {bits.map((bitVal, idx) => {
            const isHighlighted = activeHashes.includes(idx);
            return (
              <div key={idx} className={`bit-cell ${bitVal === 1 ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>bit #{idx}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: bitVal === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                  {bitVal}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Inserted Elements: {insertedWords.length === 0 ? 'None' : insertedWords.map(w => `"${w}"`).join(', ')}
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 13, textAlign: 'center', fontWeight: 600, color: 'var(--info)' }}>
        {status}
      </div>

      <div className="metrics-row">
        <div className="metrics-box">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>BitSet Fill Factor</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{((setOnesCount / BIT_SIZE) * 100).toFixed(1)}%</div>
        </div>
        <div className="metrics-box">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>False Positive Rate</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: fpProb > 15 ? 'var(--danger)' : 'var(--success)' }}>
            {fpProb.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BloomFilterPage() {
  return (
    <LldPage module="bloom-filter" title="Bloom Filter System" icon="🌸" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
