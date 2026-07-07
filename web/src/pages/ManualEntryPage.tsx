import { useNavigate } from 'react-router-dom';
import ManualEvaluationForm from '../components/ManualEvaluationForm';

export default function ManualEntryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Nova avaliação</h1>
        <p>Preencha os dados da avaliação corporal</p>
      </div>
      <ManualEvaluationForm
        onSaved={(clientId) => navigate(`/clients/${clientId}`)}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
