import EntryForm from './EntryForm';
import ExitForm from './ExitForm';
import SpotGrid from './SpotGrid';
import ActiveTickets from './ActiveTickets';

export default function ParkingLot({ activeTab }) {
  switch (activeTab) {
    case 'entry':
      return <EntryForm />;
    case 'exit':
      return <ExitForm />;
    case 'spots':
      return <SpotGrid />;
    case 'tickets':
      return <ActiveTickets />;
    default:
      return null;
  }
}
