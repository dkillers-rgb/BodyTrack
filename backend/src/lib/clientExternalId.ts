import { prisma } from './prisma';

export function normalizeExternalId(externalId: string): string {
  return externalId.trim();
}

export async function assertExternalIdUnique(
  userId: string,
  externalId: string,
  excludeClientId?: number
): Promise<void> {
  const normalized = normalizeExternalId(externalId).toLowerCase();
  if (!normalized) {
    throw new Error('Informe o ID do cliente.');
  }

  const clients = await prisma.client.findMany({
    where: { userId },
    select: { id: true, externalId: true },
  });

  for (const client of clients) {
    if (excludeClientId != null && client.id === excludeClientId) continue;

    const stored = client.externalId?.trim().toLowerCase();
    if (stored === normalized) {
      throw new Error('Já existe um cliente com este ID.');
    }

    if (!stored && String(client.id) === externalId.trim()) {
      throw new Error('Já existe um cliente com este ID.');
    }
  }
}
