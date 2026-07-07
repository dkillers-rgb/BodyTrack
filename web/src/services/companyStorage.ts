export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  logoDataUri?: string;
}

const STORAGE_KEY = 'bodytrack_company';

const defaults: CompanySettings = {
  name: 'BodyTrack',
  address: '',
  phone: '',
};

export function loadCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveCompanySettings(data: CompanySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}
