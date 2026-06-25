interface EvaluationSnapshot {
  examDate: Date;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
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
