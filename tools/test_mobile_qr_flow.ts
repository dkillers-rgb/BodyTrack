import { extractReportKey } from '../mobile/services/reportKeyUtils.ts';
import { fetchTcyReportDirect } from '../mobile/services/tcyReportMapper.ts';

const SAMPLE_QR =
  'http://119.23.70.228/tcy/index.html?lang=en&key=d067848a0baba8e41516f9934fd2cec7';

async function main() {
  console.log('=== Teste fluxo mobile (TCY direto) ===\n');

  const key = extractReportKey(SAMPLE_QR);
  console.log('Key extraída:', key);
  if (!key) {
    console.error('FALHOU: key não extraída');
    process.exit(1);
  }

  try {
    const data = await fetchTcyReportDirect(key);
    console.log('Dados obtidos:', data);
    console.log('\nOK — app conseguiria preencher o formulário com esses valores.');
  } catch (e) {
    console.error('FALHOU:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  console.log('\n=== Teste api.bodytrack.com (motivo do erro anterior) ===');
  try {
    const res = await fetch(`https://api.bodytrack.com/report?key=${key}`, {
      signal: AbortSignal.timeout(8000),
    });
    console.log('Status:', res.status, await res.text());
  } catch (e) {
    console.log('api.bodytrack.com INACESSÍVEL:', e instanceof Error ? e.message : e);
    console.log('(Por isso o app mostrava "Sem conexão" — corrigido para consultar o equipamento direto)');
  }
}

main();
