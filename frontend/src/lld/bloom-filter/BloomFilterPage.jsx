import LldPage from '../../components/LldPage';
import BloomFilterReplay from './BloomFilterReplay';

export default function BloomFilterPage() {
  return (
    <LldPage module="bloom-filter" title="Concurrent Bloom Filter" icon="🌸" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <BloomFilterReplay key={activeTab} />}
    </LldPage>
  );
}
