import LldPage from '../../components/LldPage';
import RecordedOrderingReplay from '../../components/RecordedOrderingReplay';
import { runH2O } from './api';

export default function H2OPage() {
  return (
    <LldPage module="h2o" title="Building H2O Molecule" icon="💧" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <RecordedOrderingReplay key={activeTab} kind="h2o" executeRun={runH2O} />}
    </LldPage>
  );
}
