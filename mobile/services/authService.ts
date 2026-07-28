import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { base64ToBytes, bytesToBase64, hashSecret, randomBytes } from './cryptoUtils';
import type { User } from './types';

const AUTH_PROFILE_KEY = 'bodytrack_auth_profile_v1';
const SESSION_KEY = 'bodytrack_auth_session_v1';

/** 24 horas sem atividade → pede login de novo */
export const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const TEMP_PASSWORD_TTL_MS = 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;

export type AuthProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  /** Só dígitos com país, ex.: 5511999999999 */
  whatsappPhone?: string;
  passwordSalt: string;
  passwordHash: string;
  tempPasswordSalt?: string;
  tempPasswordHash?: string;
  tempExpiresAt?: number;
  mustChangePassword?: boolean;
};

export type LoginResult = {
  user: User;
  usedTemporaryPassword: boolean;
  mustChangePassword: boolean;
};

type SessionState = {
  lastActiveAt: number;
};

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Converte telefone BR (ou com 55) para formato wa.me */
export function toWhatsAppDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  if (digits.length < 12 || digits.length > 15) {
    throw new Error('Número WhatsApp inválido. Use DDD + número, ex.: 11999999999');
  }
  return digits;
}

function maskPhone(digits: string): string {
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

async function readProfile(): Promise<AuthProfile | null> {
  const raw = await SecureStore.getItemAsync(AUTH_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthProfile;
  } catch {
    return null;
  }
}

async function writeProfile(profile: AuthProfile): Promise<void> {
  await SecureStore.setItemAsync(AUTH_PROFILE_KEY, JSON.stringify(profile));
}

async function readSession(): Promise<SessionState | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

async function writeSession(session: SessionState | null): Promise<void> {
  if (!session) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function hasAuthProfile(): Promise<boolean> {
  return (await readProfile()) != null;
}

export async function getAuthProfile(): Promise<AuthProfile | null> {
  return readProfile();
}

export function profileToUser(profile: AuthProfile): User {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    username: profile.username,
  };
}

export async function setupAccount(input: {
  name: string;
  username: string;
  email: string;
  whatsappPhone: string;
  password: string;
}): Promise<User> {
  if (await hasAuthProfile()) {
    throw new Error('Já existe uma conta neste aparelho. Faça login.');
  }

  const name = input.name.trim();
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const whatsappPhone = toWhatsAppDigits(input.whatsappPhone);
  const password = input.password;

  if (name.length < 2) throw new Error('Informe o nome (mín. 2 caracteres).');
  if (username.length < 3) throw new Error('Usuário deve ter pelo menos 3 caracteres.');
  if (!isValidEmail(email)) throw new Error('E-mail inválido.');
  const strengthError = validatePasswordStrength(password);
  if (strengthError) throw new Error(strengthError);

  const salt = await randomBytes(16);
  const passwordHash = await hashSecret(password, salt);
  const profile: AuthProfile = {
    id: `local-${Date.now()}`,
    name,
    username,
    email,
    whatsappPhone,
    passwordSalt: bytesToBase64(salt),
    passwordHash,
    mustChangePassword: false,
  };

  await writeProfile(profile);
  await touchSession();
  return profileToUser(profile);
}

export async function updateWhatsAppPhone(whatsappPhoneRaw: string): Promise<void> {
  const profile = await readProfile();
  if (!profile) throw new Error('Conta não encontrada.');
  const whatsappPhone = toWhatsAppDigits(whatsappPhoneRaw);
  await writeProfile({ ...profile, whatsappPhone });
}

async function passwordMatches(
  password: string,
  saltB64: string,
  hashB64: string
): Promise<boolean> {
  const salt = base64ToBytes(saltB64);
  const hash = await hashSecret(password, salt);
  return hash === hashB64;
}

export async function loginWithPassword(
  usernameOrEmail: string,
  password: string
): Promise<LoginResult> {
  const profile = await readProfile();
  if (!profile) throw new Error('Nenhuma conta encontrada. Crie a conta primeiro.');

  const loginId = normalizeUsername(usernameOrEmail);
  const matchesUser =
    loginId === profile.username || loginId === normalizeEmail(profile.email);
  if (!matchesUser) throw new Error('Usuário ou senha incorretos.');

  const mainOk = await passwordMatches(password, profile.passwordSalt, profile.passwordHash);
  if (mainOk) {
    await touchSession();
    return {
      user: profileToUser(profile),
      usedTemporaryPassword: false,
      mustChangePassword: !!profile.mustChangePassword,
    };
  }

  const hasTemp =
    !!profile.tempPasswordSalt &&
    !!profile.tempPasswordHash &&
    typeof profile.tempExpiresAt === 'number';

  if (hasTemp) {
    if ((profile.tempExpiresAt as number) < Date.now()) {
      await writeProfile({
        ...profile,
        tempPasswordSalt: undefined,
        tempPasswordHash: undefined,
        tempExpiresAt: undefined,
      });
      throw new Error('Senha temporária expirada. Peça uma nova em “Esqueci a senha”.');
    }

    const tempOk = await passwordMatches(
      password,
      profile.tempPasswordSalt as string,
      profile.tempPasswordHash as string
    );
    if (tempOk) {
      const updated: AuthProfile = {
        ...profile,
        mustChangePassword: true,
      };
      await writeProfile(updated);
      await touchSession();
      return {
        user: profileToUser(updated),
        usedTemporaryPassword: true,
        mustChangePassword: true,
      };
    }
  }

  throw new Error('Usuário ou senha incorretos.');
}

export async function logoutSession(): Promise<void> {
  await writeSession(null);
}

export async function touchSession(): Promise<void> {
  await writeSession({ lastActiveAt: Date.now() });
}

export async function isSessionValid(): Promise<boolean> {
  const profile = await readProfile();
  if (!profile) return false;
  const session = await readSession();
  if (!session?.lastActiveAt) return false;
  return Date.now() - session.lastActiveAt < INACTIVITY_TIMEOUT_MS;
}

export async function mustChangePasswordNow(): Promise<boolean> {
  const profile = await readProfile();
  return !!profile?.mustChangePassword;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const profile = await readProfile();
  if (!profile) throw new Error('Conta não encontrada.');
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) throw new Error(strengthError);

  const currentOk = await passwordMatches(
    currentPassword,
    profile.passwordSalt,
    profile.passwordHash
  );
  if (!currentOk) {
    throw new Error('Senha atual incorreta.');
  }

  const newSalt = await randomBytes(16);
  const passwordHash = await hashSecret(newPassword, newSalt);
  await writeProfile({
    ...profile,
    passwordSalt: bytesToBase64(newSalt),
    passwordHash,
    tempPasswordSalt: undefined,
    tempPasswordHash: undefined,
    tempExpiresAt: undefined,
    mustChangePassword: false,
  });
  await touchSession();
}

export async function setPasswordAfterTemporary(newPassword: string): Promise<void> {
  const profile = await readProfile();
  if (!profile) throw new Error('Conta não encontrada.');
  if (!profile.mustChangePassword) {
    throw new Error('Não é necessário alterar a senha neste momento.');
  }
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) throw new Error(strengthError);

  const newSalt = await randomBytes(16);
  const passwordHash = await hashSecret(newPassword, newSalt);
  await writeProfile({
    ...profile,
    passwordSalt: bytesToBase64(newSalt),
    passwordHash,
    tempPasswordSalt: undefined,
    tempPasswordHash: undefined,
    tempExpiresAt: undefined,
    mustChangePassword: false,
  });
  await touchSession();
}

async function generateTemporaryPassword(): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = await randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/**
 * Gera senha temporária (1h) e abre o WhatsApp normal com a mensagem
 * já pronta para o próprio número cadastrado na conta.
 */
export async function requestPasswordResetByWhatsApp(input: {
  email: string;
}): Promise<{
  maskedPhone: string;
  temporaryPassword: string;
  whatsappPhone: string;
  whatsappOpened: boolean;
}> {
  const profile = await readProfile();
  if (!profile) throw new Error('Nenhuma conta encontrada neste aparelho.');

  const email = normalizeEmail(input.email);
  if (email !== normalizeEmail(profile.email)) {
    throw new Error('E-mail não corresponde ao cadastrado neste aparelho.');
  }

  if (!profile.whatsappPhone) {
    throw new Error(
      'Não há WhatsApp no cadastro. Entre (se souber a senha) em Mais → Conta e senha e grave o número, ou crie a conta de novo neste aparelho.'
    );
  }

  const whatsappPhone = toWhatsAppDigits(profile.whatsappPhone);

  const temporaryPassword = await generateTemporaryPassword();
  const salt = await randomBytes(16);
  const tempPasswordHash = await hashSecret(temporaryPassword, salt);

  await writeProfile({
    ...profile,
    whatsappPhone,
    tempPasswordSalt: bytesToBase64(salt),
    tempPasswordHash,
    tempExpiresAt: Date.now() + TEMP_PASSWORD_TTL_MS,
    mustChangePassword: false,
  });

  const message = [
    'BodyTrack — recuperação de senha',
    '',
    `Senha temporária: ${temporaryPassword}`,
    '',
    'Válida por 1 hora.',
    'Entre no app com esta senha e troque imediatamente por uma senha nova.',
  ].join('\n');

  const opened = await openWhatsAppWithMessage(whatsappPhone, message);

  return {
    maskedPhone: maskPhone(whatsappPhone),
    temporaryPassword,
    whatsappPhone,
    whatsappOpened: opened,
  };
}

/** Reabre o WhatsApp com a mesma senha temporária (sem mostrar na tela do app). */
export async function reopenWhatsAppTempPassword(input: {
  whatsappPhone: string;
  temporaryPassword: string;
}): Promise<boolean> {
  const whatsappPhone = toWhatsAppDigits(input.whatsappPhone);
  const message = [
    'BodyTrack — recuperação de senha',
    '',
    `Senha temporária: ${input.temporaryPassword}`,
    '',
    'Válida por 1 hora.',
    'Entre no app com esta senha e troque imediatamente por uma senha nova.',
  ].join('\n');
  return openWhatsAppWithMessage(whatsappPhone, message);
}

async function openWhatsAppWithMessage(whatsappPhone: string, message: string): Promise<boolean> {
  const encoded = encodeURIComponent(message);
  const candidates = [
    `whatsapp://send?phone=${whatsappPhone}&text=${encoded}`,
    `https://wa.me/${whatsappPhone}?text=${encoded}`,
    `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encoded}`,
  ];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return true;
    } catch (err) {
      lastError = err;
    }
  }
  console.warn('WhatsApp open failed:', lastError);
  return false;
}

export async function requestPasswordResetByEmail(
  emailInput: string
): Promise<{
  maskedEmail: string;
  maskedPhone: string;
  temporaryPassword: string;
  whatsappPhone: string;
  whatsappOpened: boolean;
}> {
  const result = await requestPasswordResetByWhatsApp({
    email: emailInput,
  });
  return {
    maskedEmail: emailInput,
    maskedPhone: result.maskedPhone,
    temporaryPassword: result.temporaryPassword,
    whatsappPhone: result.whatsappPhone,
    whatsappOpened: result.whatsappOpened,
  };
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}
