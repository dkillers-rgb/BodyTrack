import OpenAI from 'openai';

interface EvaluationSnapshot {
  examDate: Date;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
}

export async function generateEvolutionAnalysis(
  clientName: string,
  evaluations: EvaluationSnapshot[]
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || evaluations.length < 2) return null;

  const openai = new OpenAI({ apiKey });

  const history = evaluations
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime())
    .map((e) => ({
      data: e.examDate.toLocaleDateString('pt-BR'),
      peso: e.weight,
      musculo: e.skeletalMuscle,
      gordura: e.bodyFat,
    }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Você é um assistente de análise corporal. Gere análises curtas em português sobre a evolução do paciente, destacando tendências de peso, massa muscular e gordura corporal. Seja objetivo e motivador.',
      },
      {
        role: 'user',
        content: `Cliente: ${clientName}\nHistórico de avaliações:\n${JSON.stringify(history, null, 2)}\n\nGere uma análise de evolução em 2-3 frases.`,
      },
    ],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() || null;
}

export function generateLocalAnalysis(evaluations: EvaluationSnapshot[]): string {
  if (evaluations.length < 2) {
    return 'Registre mais avaliações para acompanhar a evolução.';
  }

  const sorted = [...evaluations].sort(
    (a, b) => a.examDate.getTime() - b.examDate.getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const weightDiff = last.weight - first.weight;
  const muscleDiff = last.skeletalMuscle - first.skeletalMuscle;
  const fatDiff = last.bodyFat - first.bodyFat;

  const parts: string[] = [];

  if (weightDiff < -0.5) parts.push('houve redução de peso');
  else if (weightDiff > 0.5) parts.push('houve aumento de peso');
  else parts.push('o peso se manteve estável');

  if (muscleDiff > 0.3) parts.push('com ganho de massa muscular');
  else if (muscleDiff < -0.3) parts.push('com perda de massa muscular');
  else parts.push('mantendo a massa muscular');

  if (fatDiff < -0.5) parts.push('e redução de gordura corporal');
  else if (fatDiff > 0.5) parts.push('e aumento de gordura corporal');

  return `Nos últimos exames, ${parts.join(' ')}.`;
}
