import LldPage from '../../components/LldPage';
import ConcurrentHashMapReplay from './ConcurrentHashMapReplay';

export default function ConcurrentHashMapPage() {
  return (
    <LldPage module="concurrent-hashmap" title="Concurrent HashMap System" icon="🗺️" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <ConcurrentHashMapReplay key={activeTab} />}
    </LldPage>
  );
}
