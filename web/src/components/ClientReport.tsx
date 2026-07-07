import { forwardRef } from 'react';
import { ClientDashboard } from '../services/api';
import BodbodyReportView from './BodbodyReportView';

interface Props {
  data: ClientDashboard;
}

const ClientReport = forwardRef<HTMLDivElement, Props>(function ClientReport({ data }, ref) {
  return (
    <div ref={ref}>
      <BodbodyReportView data={data} />
    </div>
  );
});

export default ClientReport;
