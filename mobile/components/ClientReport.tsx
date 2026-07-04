import type { ClientDashboard } from '../services/types';
import BodbodyReport from './BodbodyReport';

interface Props {
  data: ClientDashboard;
}

export default function ClientReport({ data }: Props) {
  return <BodbodyReport data={data} />;
}
