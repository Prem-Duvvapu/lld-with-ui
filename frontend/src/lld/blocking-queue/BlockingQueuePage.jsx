import LldPage from '../../components/LldPage';
import BlockingQueueReplay from './BlockingQueueReplay';

export default function BlockingQueuePage() {
  return (
    <LldPage module="blocking-queue" title="Blocking Queue System" icon="🔄" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <BlockingQueueReplay key={activeTab} />}
    </LldPage>
  );
}
