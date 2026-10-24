import { useState } from 'react';
import LldPage from '../../components/LldPage';
import KvStoreWorkspace from './KvStoreWorkspace';
import KvStoreSimulation from './KvStoreSimulation';
import { useKvWorkspace } from './useKvWorkspace';

export default function KvStorePage() {
  const workspace = useKvWorkspace();
  const [configuration, setConfiguration] = useState({ value: 'demo-value', workers: 8 });
  return <LldPage module="kvstore" title="Key-Value Store" icon="🗃️" tabs={[
    { id: 'store', label: '🗃️ Store' },
    { id: 'cas', label: '🔀 CAS' },
    { id: 'sim', label: '🕹️ Concurrency Sim' },
    { id: 'diagram', label: 'Class Diagram' },
    { id: 'sequence', label: 'Sequence Diagram' },
    { id: 'design', label: 'Design Details' },
  ]}>
    {activeTab => <div>
      <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Command (In-Memory Replay) • Template Method (Read Path) • Per-Key Atomic Compare-and-Swap
      </p>
      {(activeTab === 'store' || activeTab === 'cas') && <KvStoreWorkspace activeTab={activeTab} model={workspace} />}
      {activeTab === 'sim' && <KvStoreSimulation configuration={configuration} onConfigurationChange={setConfiguration} />}
    </div>}
  </LldPage>;
}
