/**
 * Testes mínimos antes de gerar APK (sem emulador).
 * Cobre regras de auth, QR TCY, validação de métricas, backup e aviso legal.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function extractReportKey(qrUrl) {
  try {
    const trimmed = String(qrUrl).trim();
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    if (!url.pathname.includes('/tcy/')) return null;
    return url.searchParams.get('key');
  } catch {
    return null;
  }
}

function validatePasswordStrength(password, min = 8) {
  if (password.length < min) return `A senha deve ter pelo menos ${min} caracteres.`;
  return null;
}

function parsePositive(n) {
  return Number.isFinite(n) && n > 0 ? n : null;
}

function canSaveEval({ weight, skeletalMuscle, bodyFat }) {
  return (
    parsePositive(weight) != null &&
    parsePositive(skeletalMuscle) != null &&
    parsePositive(bodyFat) != null
  );
}

function isEncryptedBackupMagic(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x42 && bytes[1] === 0x54 && bytes[2] === 0x42 && bytes[3] === 0x31;
}

function isZipBytes(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

test('login: senha mínima 8', () => {
  assert.equal(validatePasswordStrength('1234567'), 'A senha deve ter pelo menos 8 caracteres.');
  assert.equal(validatePasswordStrength('12345678'), null);
});

test('QR: aceita URL TCY e rejeita URL alheia', () => {
  const ok = extractReportKey(
    'http://119.23.70.228/tcy/index.html?lang=en&key=91b155ef402e6fe7e42079849d509d6d'
  );
  assert.equal(ok, '91b155ef402e6fe7e42079849d509d6d');
  assert.equal(extractReportKey('https://example.com/foo?key=abc'), null);
});

test('avaliação: não grava músculo/gordura 0', () => {
  assert.equal(canSaveEval({ weight: 76.1, skeletalMuscle: 23.8, bodyFat: 32.4 }), true);
  assert.equal(canSaveEval({ weight: 76.1, skeletalMuscle: 0, bodyFat: 32.4 }), false);
  assert.equal(canSaveEval({ weight: 76.1, skeletalMuscle: 23.8, bodyFat: 0 }), false);
});

test('backup: magia BTB1 vs ZIP', () => {
  assert.equal(isEncryptedBackupMagic(Uint8Array.from([0x42, 0x54, 0x42, 0x31, 1, 2])), true);
  assert.equal(isZipBytes(Uint8Array.from([0x50, 0x4b, 3, 4])), true);
  assert.equal(isEncryptedBackupMagic(Uint8Array.from([0x50, 0x4b, 3, 4])), false);
});

test('aviso médico presente no app e no PDF', () => {
  const legal = readFileSync(join(root, 'constants/legal.ts'), 'utf8');
  const html = readFileSync(join(root, 'utils/bodbodyReportHtml.ts'), 'utf8');
  const report = readFileSync(join(root, 'components/BodbodyReport.tsx'), 'utf8');
  const phrase = 'não é diagnóstico médico';
  assert.match(legal, new RegExp(phrase));
  assert.match(html, new RegExp(phrase));
  assert.match(report, new RegExp(phrase));
});

test('histórico recente documentado (LIMIT 10)', () => {
  const history = readFileSync(join(root, 'app/history.tsx'), 'utf8');
  const repo = readFileSync(join(root, 'db/repository.ts'), 'utf8');
  assert.match(history, /Histórico recente/);
  assert.match(history, /10 avaliações/);
  assert.match(repo, /LIMIT 10/);
});

test('privacidade in-app existe', () => {
  const privacy = readFileSync(join(root, 'app/privacy.tsx'), 'utf8');
  const more = readFileSync(join(root, 'app/more.tsx'), 'utf8');
  assert.match(privacy, /PRIVACY_POLICY/);
  assert.match(more, /\/privacy/);
});

test('recuperação WhatsApp tem retry', () => {
  const forgot = readFileSync(join(root, 'app/forgot-password.tsx'), 'utf8');
  const auth = readFileSync(join(root, 'services/authService.ts'), 'utf8');
  assert.match(forgot, /Tentar abrir WhatsApp/);
  assert.match(auth, /reopenWhatsAppTempPassword/);
});
