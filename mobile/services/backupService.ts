import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { defaultDatabaseDirectory, deleteDatabaseAsync } from 'expo-sqlite';
import JSZip from 'jszip';
import { closeDatabase, getDatabase } from '../db/database';
import {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  decryptToZipBase64,
  encryptBase64Zip,
  encryptBytes,
  randomBytes,
} from './cryptoUtils';

const { StorageAccessFramework } = FileSystem;

export const MAX_BACKUPS = 7;
export const MIN_BACKUP_EXPORT_PASSWORD = 8;
const AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DB_NAME = 'bodytrack.db';
const LOCAL_BACKUP_KEY = 'bodytrack_local_backup_key_v1';

const BACKUPS_ROOT = `${FileSystem.documentDirectory}backups/`;
const REPORTS_DIR = `${FileSystem.documentDirectory}reports/`;
const COMPANY_DIR = `${FileSystem.documentDirectory}company/`;

export type BackupInfo = {
  id: string;
  createdAt: string;
  clientCount: number;
  evaluationCount: number;
  totalBytes: number;
  encryptedDb?: boolean;
};

type BackupMeta = BackupInfo;

let backupInFlight: Promise<BackupInfo> | null = null;

function isEncryptedBackup(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x42 &&
    bytes[1] === 0x54 &&
    bytes[2] === 0x42 &&
    bytes[3] === 0x31
  );
}

async function getLocalBackupPassword(): Promise<string> {
  let key = await SecureStore.getItemAsync(LOCAL_BACKUP_KEY);
  if (!key) {
    key = bytesToBase64(await randomBytes(32));
    await SecureStore.setItemAsync(LOCAL_BACKUP_KEY, key);
  }
  return key;
}

/** Lê bodytrack.db do backup (cifra local BTB1 ou legado em claro). */
async function readDbBackupPlainBase64(folder: string): Promise<string> {
  const rawB64 = await FileSystem.readAsStringAsync(`${folder}${DB_NAME}`, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!rawB64) throw new Error('arquivo da base de dados do backup está vazio.');
  const bytes = base64ToBytes(rawB64);
  if (isEncryptedBackup(bytes)) {
    try {
      const password = await getLocalBackupPassword();
      const plain = await decryptBytes(bytes, password);
      return bytesToBase64(plain);
    } catch {
      throw new Error(
        'Não foi possível descifrar o backup local. Pode ter sido criado noutro aparelho.'
      );
    }
  }
  return rawB64;
}

function toFileUri(path: string): string {
  if (!path) return path;
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

function liveDbDirectoryUri(): string {
  const fromSqlite = String(defaultDatabaseDirectory || '').replace(/\/+$/, '');
  if (fromSqlite) return toFileUri(fromSqlite);
  return `${FileSystem.documentDirectory}SQLite`;
}

function liveDbUri(): string {
  return `${liveDbDirectoryUri().replace(/\/?$/, '/')}${DB_NAME}`;
}

function liveSidecarUris(): string[] {
  const base = liveDbUri();
  return [`${base}-wal`, `${base}-shm`];
}

function backupFolder(id: string): string {
  return `${BACKUPS_ROOT}${id}/`;
}

function formatBackupId(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `bodytrack-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function ensureDir(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

async function pathExists(uri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

async function getPathSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return 0;
  if (!info.isDirectory) return info.size ?? 0;

  const entries = await FileSystem.readDirectoryAsync(uri);
  let total = 0;
  for (const name of entries) {
    total += await getPathSize(`${uri.replace(/\/?$/, '/')}${name}`);
  }
  return total;
}

async function copyDirContents(fromDir: string, toDir: string): Promise<void> {
  await ensureDir(toDir);
  if (!(await pathExists(fromDir))) return;

  const fromInfo = await FileSystem.getInfoAsync(fromDir);
  if (!fromInfo.exists || !fromInfo.isDirectory) return;

  const entries = await FileSystem.readDirectoryAsync(fromDir);
  for (const name of entries) {
    const src = `${fromDir.replace(/\/?$/, '/')}${name}`;
    const dest = `${toDir.replace(/\/?$/, '/')}${name}`;
    const srcInfo = await FileSystem.getInfoAsync(src);
    if (!srcInfo.exists) continue;
    if (srcInfo.isDirectory) {
      await copyDirContents(src, dest);
    } else {
      await FileSystem.copyAsync({ from: src, to: dest });
    }
  }
}

async function clearDirContents(dir: string): Promise<void> {
  if (!(await pathExists(dir))) {
    await ensureDir(dir);
    return;
  }
  const entries = await FileSystem.readDirectoryAsync(dir);
  for (const name of entries) {
    await FileSystem.deleteAsync(`${dir.replace(/\/?$/, '/')}${name}`, { idempotent: true });
  }
}

async function readMeta(id: string): Promise<BackupMeta | null> {
  try {
    const metaUri = `${backupFolder(id)}meta.json`;
    if (!(await pathExists(metaUri))) return null;
    const raw = await FileSystem.readAsStringAsync(metaUri);
    return JSON.parse(raw) as BackupMeta;
  } catch {
    return null;
  }
}

async function writeMeta(folder: string, meta: BackupMeta): Promise<void> {
  await FileSystem.writeAsStringAsync(`${folder}meta.json`, JSON.stringify(meta));
}

async function countLiveData(): Promise<{ clientCount: number; evaluationCount: number }> {
  const database = await getDatabase();
  const clients = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM clients');
  const evaluations = await database.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM evaluations'
  );
  return {
    clientCount: clients?.c ?? 0,
    evaluationCount: evaluations?.c ?? 0,
  };
}

async function pruneOldBackups(): Promise<void> {
  const list = await listBackups();
  if (list.length <= MAX_BACKUPS) return;
  const toRemove = list.slice(MAX_BACKUPS);
  for (const item of toRemove) {
    await FileSystem.deleteAsync(backupFolder(item.id), { idempotent: true });
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  await ensureDir(BACKUPS_ROOT);
  const names = await FileSystem.readDirectoryAsync(BACKUPS_ROOT);
  const items: BackupInfo[] = [];

  for (const name of names) {
    const folderInfo = await FileSystem.getInfoAsync(`${BACKUPS_ROOT}${name}`);
    if (!folderInfo.exists || !folderInfo.isDirectory) continue;

    const meta = await readMeta(name);
    if (meta) {
      items.push(meta);
      continue;
    }

    items.push({
      id: name,
      createdAt: new Date().toISOString(),
      clientCount: 0,
      evaluationCount: 0,
      totalBytes: await getPathSize(`${BACKUPS_ROOT}${name}`),
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getBackupStatus(): Promise<{
  lastBackup: BackupInfo | null;
  count: number;
  maxBackups: number;
  nextAutomaticHint: string;
}> {
  const backups = await listBackups();
  const lastBackup = backups[0] ?? null;
  return {
    lastBackup,
    count: backups.length,
    maxBackups: MAX_BACKUPS,
    nextAutomaticHint: 'Ao abrir o app, se já passou 24h desde o último backup',
  };
}

async function createBackupInternal(): Promise<BackupInfo> {
  await ensureDir(BACKUPS_ROOT);

  const database = await getDatabase();
  const { clientCount, evaluationCount } = await countLiveData();
  const serialized = await database.serializeAsync();

  const id = formatBackupId();
  const folder = backupFolder(id);
  await ensureDir(folder);
  await ensureDir(`${folder}reports/`);
  await ensureDir(`${folder}company/`);

  try {
    const password = await getLocalBackupPassword();
    const encrypted = await encryptBytes(serialized, password);
    await FileSystem.writeAsStringAsync(`${folder}${DB_NAME}`, bytesToBase64(encrypted), {
      encoding: FileSystem.EncodingType.Base64,
    });

    await copyDirContents(REPORTS_DIR, `${folder}reports/`);
    await copyDirContents(COMPANY_DIR, `${folder}company/`);

    const totalBytes = await getPathSize(folder);
    const meta: BackupMeta = {
      id,
      createdAt: new Date().toISOString(),
      clientCount,
      evaluationCount,
      totalBytes,
      encryptedDb: true,
    };
    await writeMeta(folder, meta);
    await pruneOldBackups();
    return meta;
  } catch (err) {
    await FileSystem.deleteAsync(folder, { idempotent: true });
    throw err;
  }
}

export async function createBackup(): Promise<BackupInfo> {
  if (backupInFlight) return backupInFlight;
  backupInFlight = createBackupInternal().finally(() => {
    backupInFlight = null;
  });
  return backupInFlight;
}

export async function runAutomaticBackupIfNeeded(): Promise<BackupInfo | null> {
  const backups = await listBackups();
  const latest = backups[0];
  if (latest) {
    const age = Date.now() - new Date(latest.createdAt).getTime();
    if (age < AUTO_INTERVAL_MS) return null;
  }
  return createBackup();
}

export async function restoreBackup(id: string): Promise<void> {
  if (backupInFlight) {
    throw new Error('Aguarde o backup em curso terminar antes de restaurar.');
  }

  const folder = backupFolder(id);
  const dbBackup = `${folder}${DB_NAME}`;
  if (!(await pathExists(dbBackup))) {
    throw new Error('Backup inválido ou incompleto.');
  }

  const base64 = await readDbBackupPlainBase64(folder);

  try {
    await closeDatabase();

    try {
      await deleteDatabaseAsync(DB_NAME);
    } catch {
      /* pode não existir no disco com o nome esperado */
    }

    for (const sidecar of liveSidecarUris()) {
      await FileSystem.deleteAsync(sidecar, { idempotent: true });
    }
    await FileSystem.deleteAsync(liveDbUri(), { idempotent: true });

    await ensureDir(liveDbDirectoryUri());
    await FileSystem.writeAsStringAsync(liveDbUri(), base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await clearDirContents(REPORTS_DIR);
    await clearDirContents(COMPANY_DIR);
    await copyDirContents(`${folder}reports/`, REPORTS_DIR);
    await copyDirContents(`${folder}company/`, COMPANY_DIR);
  } finally {
    await getDatabase();
  }
}

export async function deleteBackup(id: string): Promise<void> {
  await FileSystem.deleteAsync(backupFolder(id), { idempotent: true });
}

async function collectFilesRecursively(
  dirUri: string,
  prefix = ''
): Promise<Array<{ zipPath: string; uri: string }>> {
  if (!(await pathExists(dirUri))) return [];

  const info = await FileSystem.getInfoAsync(dirUri);
  if (!info.exists) return [];
  if (!info.isDirectory) {
    return [{ zipPath: prefix || dirUri.split('/').pop() || 'file', uri: dirUri }];
  }

  const entries = await FileSystem.readDirectoryAsync(dirUri);
  const files: Array<{ zipPath: string; uri: string }> = [];
  for (const name of entries) {
    const childUri = `${dirUri.replace(/\/?$/, '/')}${name}`;
    const childInfo = await FileSystem.getInfoAsync(childUri);
    const childPrefix = prefix ? `${prefix}/${name}` : name;
    if (!childInfo.exists) continue;
    if (childInfo.isDirectory) {
      files.push(...(await collectFilesRecursively(childUri, childPrefix)));
    } else {
      files.push({ zipPath: childPrefix, uri: childUri });
    }
  }
  return files;
}

async function buildBackupZipBase64(id: string): Promise<string> {
  const folder = backupFolder(id);
  if (!(await pathExists(folder))) {
    throw new Error('Backup não encontrado.');
  }
  if (!(await pathExists(`${folder}${DB_NAME}`))) {
    throw new Error('Backup inválido ou incompleto.');
  }

  const zip = new JSZip();
  const files = await collectFilesRecursively(folder);
  for (const file of files) {
    if (file.zipPath === DB_NAME || file.zipPath.endsWith(`/${DB_NAME}`)) {
      const plainDb = await readDbBackupPlainBase64(folder);
      zip.file(DB_NAME, plainDb, { base64: true });
      continue;
    }
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    zip.file(file.zipPath, base64, { base64: true });
  }

  return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
}

async function findOrCreateSafChildDir(parentUri: string, dirName: string): Promise<string> {
  const findExisting = async (): Promise<string | undefined> => {
    const entries = await StorageAccessFramework.readDirectoryAsync(parentUri);
    return entries.find((uri) => {
      try {
        const decoded = decodeURIComponent(uri);
        return (
          decoded.endsWith(`/${dirName}`) ||
          decoded.endsWith(`:${dirName}`) ||
          decoded.includes(`/${dirName}/`) ||
          decoded.includes(`%2F${dirName}`)
        );
      } catch {
        return uri.includes(dirName);
      }
    });
  };

  const existing = await findExisting();
  if (existing) return existing;

  try {
    return await StorageAccessFramework.makeDirectoryAsync(parentUri, dirName);
  } catch {
    const again = await findExisting();
    if (again) return again;
    throw new Error(`Não foi possível criar a pasta ${dirName}.`);
  }
}

async function writeEncryptedBackupToCache(id: string, password: string): Promise<string> {
  if (password.trim().length < MIN_BACKUP_EXPORT_PASSWORD) {
    throw new Error(
      `A senha do backup deve ter pelo menos ${MIN_BACKUP_EXPORT_PASSWORD} caracteres.`
    );
  }
  const zipBase64 = await buildBackupZipBase64(id);
  const encrypted = await encryptBase64Zip(zipBase64, password.trim());
  const outUri = `${FileSystem.cacheDirectory}${id}.bodytrack.bak`;
  await FileSystem.writeAsStringAsync(outUri, encrypted, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outUri;
}

export async function shareBackup(id: string, password: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Compartilhamento não disponível neste dispositivo.');
  }

  const outUri = await writeEncryptedBackupToCache(id, password);

  await Sharing.shareAsync(outUri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Enviar backup BodyTrack (protegido por senha)',
  });
}

/**
 * Guarda backup cifrado numa pasta pública (ex.: Download/BodyTrack/backups)
 * para aparecer no PC ao ligar o aparelho por USB.
 */
export async function saveBackupForPc(
  id: string,
  password: string
): Promise<{ fileName: string; hint: string }> {
  const fileName = `${id}.bodytrack.bak`;
  const encryptedUri = await writeEncryptedBackupToCache(id, password);
  const encryptedBase64 = await FileSystem.readAsStringAsync(encryptedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (Platform.OS !== 'android') {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Salvar no aparelho não está disponível neste dispositivo.');
    }
    await Sharing.shareAsync(encryptedUri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Guardar backup BodyTrack (protegido por senha)',
    });
    return {
      fileName,
      hint: 'No iPhone/iPad use “Salvar em Arquivos”. O arquivo está protegido por senha.',
    };
  }

  const initialUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
  if (!permissions.granted) {
    throw new Error(
      'Permissão negada. Escolha a pasta Download (ou Documents) para o backup ficar visível no PC.'
    );
  }

  const rootUri = permissions.directoryUri;
  const bodyTrackUri = await findOrCreateSafChildDir(rootUri, 'BodyTrack');
  const backupsUri = await findOrCreateSafChildDir(bodyTrackUri, 'backups');

  const fileUri = await StorageAccessFramework.createFileAsync(
    backupsUri,
    fileName.replace(/\.bodytrack\.bak$/i, ''),
    'application/octet-stream'
  );
  await FileSystem.writeAsStringAsync(fileUri, encryptedBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    fileName,
    hint:
      'No PC: Download → BodyTrack → backups → ' +
      fileName +
      '. Precisa da senha do backup para importar.',
  };
}

function sanitizeZipPath(path: string): string | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) return null;
  return normalized;
}

/**
 * Importa backup cifrado (.bodytrack.bak) ou ZIP legado.
 * Backups novos exigem password.
 */
export async function importBackupFromUri(
  sourceUri: string,
  password?: string
): Promise<BackupInfo> {
  const fileBase64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const rawBytes = base64ToBytes(fileBase64);

  let zipBase64: string;
  if (isEncryptedBackup(rawBytes)) {
    if (!password || password.trim().length < 1) {
      throw new Error('Este backup está protegido. Informe a senha do arquivo.');
    }
    zipBase64 = await decryptToZipBase64(fileBase64, password.trim());
  } else if (isZipBytes(rawBytes)) {
    throw new Error(
      'ZIP sem senha já não é aceite. Use um arquivo .bodytrack.bak protegido por senha.'
    );
  } else {
    throw new Error('arquivo inválido. Use um backup BodyTrack (.bodytrack.bak).');
  }

  const zip = await JSZip.loadAsync(zipBase64, { base64: true });

  const dbEntry =
    zip.file(DB_NAME) ||
    (zip.file(new RegExp(`(^|/)${DB_NAME}$`)) || [])[0];
  if (!dbEntry) {
    throw new Error('arquivo inválido: não é um backup BodyTrack (falta bodytrack.db).');
  }

  let meta: BackupMeta | null = null;
  const metaEntry = zip.file('meta.json');
  if (metaEntry) {
    try {
      meta = JSON.parse(await metaEntry.async('string')) as BackupMeta;
    } catch {
      meta = null;
    }
  }

  const id = formatBackupId();
  const folder = backupFolder(id);
  await ensureDir(folder);
  await ensureDir(`${folder}reports/`);
  await ensureDir(`${folder}company/`);

  try {
    const paths = Object.keys(zip.files);
    for (const path of paths) {
      const entry = zip.files[path];
      if (!entry || entry.dir) continue;

      const normalized = sanitizeZipPath(path);
      if (!normalized) continue;

      const destUri = `${folder}${normalized}`;
      const destDir = destUri.slice(0, destUri.lastIndexOf('/') + 1);
      if (destDir) await ensureDir(destDir);

      const base64 = await entry.async('base64');
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    if (!(await pathExists(`${folder}${DB_NAME}`))) {
      throw new Error('Importação incompleta: base de dados não foi extraída.');
    }

    const totalBytes = await getPathSize(folder);
    const saved: BackupMeta = {
      id,
      createdAt: meta?.createdAt || new Date().toISOString(),
      clientCount: meta?.clientCount ?? 0,
      evaluationCount: meta?.evaluationCount ?? 0,
      totalBytes,
    };
    await writeMeta(folder, saved);
    await pruneOldBackups();
    return saved;
  } catch (err) {
    await FileSystem.deleteAsync(folder, { idempotent: true });
    throw err;
  }
}

function isZipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatBackupDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
