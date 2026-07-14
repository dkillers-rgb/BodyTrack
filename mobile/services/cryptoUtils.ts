import * as Crypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { gcm } from '@noble/ciphers/aes';

const PBKDF2_ITERATIONS = 120_000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x2000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function randomBytes(length: number): Promise<Uint8Array> {
  return Crypto.getRandomBytesAsync(length);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return pbkdf2(sha256, password, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LEN });
}

export async function hashSecret(secret: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKey(secret, salt);
  return bytesToBase64(key);
}

export async function encryptBytes(plain: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = await randomBytes(SALT_LEN);
  const iv = await randomBytes(IV_LEN);
  const key = await deriveKey(password, salt);
  const aes = gcm(key, iv);
  const cipher = aes.encrypt(plain);
  const out = new Uint8Array(4 + SALT_LEN + IV_LEN + cipher.length);
  out.set([0x42, 0x54, 0x42, 0x31]); // BTB1
  out.set(salt, 4);
  out.set(iv, 4 + SALT_LEN);
  out.set(cipher, 4 + SALT_LEN + IV_LEN);
  return out;
}

export async function decryptBytes(payload: Uint8Array, password: string): Promise<Uint8Array> {
  if (payload.length < 4 + SALT_LEN + IV_LEN + 16) {
    throw new Error('arquivo de backup inválido ou corrompido.');
  }
  const magic = String.fromCharCode(payload[0], payload[1], payload[2], payload[3]);
  if (magic !== 'BTB1') {
    throw new Error('Este arquivo não é um backup BodyTrack cifrado.');
  }
  const salt = payload.subarray(4, 4 + SALT_LEN);
  const iv = payload.subarray(4 + SALT_LEN, 4 + SALT_LEN + IV_LEN);
  const cipher = payload.subarray(4 + SALT_LEN + IV_LEN);
  const key = await deriveKey(password, salt);
  try {
    const aes = gcm(key, iv);
    return aes.decrypt(cipher);
  } catch {
    throw new Error('Senha do backup incorreta ou arquivo corrompido.');
  }
}

export function encryptBase64Zip(zipBase64: string, password: string): Promise<string> {
  return encryptBytes(base64ToBytes(zipBase64), password).then(bytesToBase64);
}

export async function decryptToZipBase64(encryptedBase64: string, password: string): Promise<string> {
  const plain = await decryptBytes(base64ToBytes(encryptedBase64), password);
  return bytesToBase64(plain);
}
