import { Platform } from "react-native";
import { Directory } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { encryptData } from "./crypto";

const MAX_BACKUPS = 5;

export type BackupResult =
  | { ok: true; time: string; path: string }
  | { ok: false; reason: string };

function buildFilename(index: number): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `ledger_${String(index).padStart(2, "0")}_${ts}.ledger`;
}

function isLedgerFile(name: string): boolean {
  return name.endsWith(".ledger");
}

async function pruneDocDir(dir: string, FileSystem: any): Promise<void> {
  try {
    const files = (await FileSystem.readDirectoryAsync(dir)) as string[];
    const ledger = files.filter(isLedgerFile).sort();
    if (ledger.length > MAX_BACKUPS) {
      const toDelete = ledger.slice(0, ledger.length - MAX_BACKUPS);
      for (const name of toDelete) {
        await FileSystem.deleteAsync(dir + name, { idempotent: true });
      }
    }
  } catch {
    // ignore pruning errors
  }
}

async function pruneSAFDir(folderUri: string, FileSystem: any): Promise<void> {
  try {
    const uris = (await FileSystem.StorageAccessFramework.readDirectoryAsync(
      folderUri
    )) as string[];
    const ledger = uris
      .filter((u: string) => u.toLowerCase().includes(".ledger"))
      .sort();
    if (ledger.length > MAX_BACKUPS) {
      const toDelete = ledger.slice(0, ledger.length - MAX_BACKUPS);
      for (const uri of toDelete) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
  } catch {
    // ignore pruning errors
  }
}

async function nextIndex(dir: string, FileSystem: any): Promise<number> {
  try {
    const files = (await FileSystem.readDirectoryAsync(dir)) as string[];
    const ledger = files.filter(isLedgerFile).sort();
    if (ledger.length === 0) return 1;
    const last = ledger[ledger.length - 1];
    const match = last.match(/^ledger_(\d+)_/);
    if (match) return parseInt(match[1], 10) + 1;
    return ledger.length + 1;
  } catch {
    return 1;
  }
}

/**
 * Perform an auto backup of the full app state.
 * Requires a user-selected folder URI (via SAF) for privacy-respecting storage.
 */
export async function performAutoBackup(
  fullState: Record<string, any>,
  password: string,
  folderUri: string | null
): Promise<BackupResult> {
  if (Platform.OS === "web") {
    return { ok: false, reason: "web-unsupported" };
  }

  if (!folderUri) {
    return { ok: false, reason: "no-folder-selected" };
  }

  try {
    const payload = await encryptData(
      { ...fullState, exportedAt: new Date().toISOString(), version: 1 },
      password
    );
    const json = JSON.stringify(payload);

    if (Platform.OS === "android") {
      await pruneSAFDir(folderUri, FileSystem);
      const filename = buildFilename(Date.now());
      const fileUri =
        await FileSystem.StorageAccessFramework.createFileAsync(
          folderUri,
          filename,
          "application/json"
        );
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return { ok: true, time: new Date().toISOString(), path: filename };
    }

    // iOS fallback: use document directory
    const dir = (FileSystem.documentDirectory ?? "") + "LedgerBackups/";
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const idx = await nextIndex(dir, FileSystem);
    const filename = buildFilename(idx);
    const fullPath = dir + filename;

    await FileSystem.writeAsStringAsync(fullPath, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await pruneDocDir(dir, FileSystem);

    return { ok: true, time: new Date().toISOString(), path: fullPath };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "Unknown error" };
  }
}

export async function pickBackupFolder(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  try {
    const directory = await Directory.pickDirectoryAsync();
    if (directory?.uri) return directory.uri;
  } catch {
    // Fall back to legacy SAF picker below.
  }

  try {
    const result =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    return result.granted ? result.directoryUri : null;
  } catch {
    return null;
  }
}

export function defaultBackupPath(): string {
  if (Platform.OS === "android") return "Tap to select a folder";
  if (Platform.OS === "ios") return "Documents/LedgerBackups/";
  return "N/A (web)";
}
