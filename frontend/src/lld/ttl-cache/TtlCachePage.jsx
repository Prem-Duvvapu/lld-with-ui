import LldPage from '../../components/LldPage';
import TtlCacheReplay from './TtlCacheReplay';

export default function TtlCachePage() {
  return (
    <LldPage module="ttl-cache" title="TTL Cache System" icon="⏱️" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <TtlCacheReplay key={activeTab} />}
    </LldPage>
  );
}
