import LldPage from '../../components/LldPage';
import RecordedOrderingReplay from '../../components/RecordedOrderingReplay';
import { runFooBar } from './api';

export default function FooBarPage() {
  return (
    <LldPage module="foo-bar" title="Print FooBar Alternately" icon="🏓" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {activeTab => (activeTab === 'simulation' || activeTab === 'app') && <RecordedOrderingReplay key={activeTab} kind="foo-bar" executeRun={runFooBar} />}
    </LldPage>
  );
}
