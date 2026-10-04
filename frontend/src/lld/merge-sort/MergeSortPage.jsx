import LldPage from '../../components/LldPage';
import MergeSortReplay from './MergeSortReplay';

export default function MergeSortPage() {
  return (
    <LldPage module="merge-sort" title="Multi-threaded Merge Sort" icon="🔀" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <MergeSortReplay key={activeTab} />}
    </LldPage>
  );
}
