import LldPage from '../../components/LldPage';
import RecordedOrderingReplay from '../../components/RecordedOrderingReplay';
import { runZeroEvenOdd } from './api';

export default function ZeroEvenOddPage() {
  return (
    <LldPage module="zero-even-odd" title="Print Zero Even Odd" icon="0️⃣" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <RecordedOrderingReplay key={activeTab} kind="zero-even-odd" executeRun={runZeroEvenOdd} />}
    </LldPage>
  );
}
