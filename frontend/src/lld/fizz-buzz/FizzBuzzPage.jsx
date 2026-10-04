import LldPage from '../../components/LldPage';
import RecordedOrderingReplay from '../../components/RecordedOrderingReplay';
import { runFizzBuzz } from './api';

export default function FizzBuzzPage() {
  return (
    <LldPage module="fizz-buzz" title="Fizz Buzz Multithreaded" icon="⚡" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <RecordedOrderingReplay key={activeTab} kind="fizz-buzz" executeRun={runFizzBuzz} />}
    </LldPage>
  );
}
