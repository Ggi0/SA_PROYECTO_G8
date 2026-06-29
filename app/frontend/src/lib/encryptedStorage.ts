// ─────────────────────────────────────────────────────────
// QuetxalTV — Almacenamiento cifrado en navegador
// Usa Web Crypto API (AES-GCM 256-bit) + IndexedDB
// ─────────────────────────────────────────────────────────

const DB_NAME = 'quetxaltv-downloads'
const DB_VERSION = 1
const STORE_VIDEOS = 'encrypted_videos'
const STORE_KEYS = 'encryption_keys'
const STORE_META = 'download_meta'

// ── Abrir IndexedDB ─────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS, { keyPath: 'downloadId' })
      }
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS, { keyPath: 'downloadId' })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        const meta = db.createObjectStore(STORE_META, { keyPath: 'downloadId' })
        meta.createIndex('contentId', 'contentId', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function dbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

function dbPut(db: IDBDatabase, store: string, value: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function dbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function dbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Cifrado AES-GCM 256-bit ─────────────────────────────

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key)
}

async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(data: ArrayBuffer, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { ciphertext, iv }
}

async function decryptData(ciphertext: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}

// ── Tipos públicos ───────────────────────────────────────

export interface DownloadMeta {
  downloadId: string
  contentId: string
  title: string
  thumbnail: string
  expiresAt: number   // Unix timestamp segundos
  storedAt: number    // Unix timestamp ms
}

// ── API pública ──────────────────────────────────────────

/**
 * Descarga un video desde la URL, lo cifra con AES-256-GCM
 * y lo almacena en IndexedDB del navegador.
 */
export async function storeEncryptedVideo(
  downloadId: string,
  gcsUrl: string,
  meta: Omit<DownloadMeta, 'downloadId' | 'storedAt'>,
  onProgress?: (pct: number) => void
): Promise<void> {
  // 1. Descargar el video en streaming
  const response = await fetch(gcsUrl)
  if (!response.ok) throw new Error(`Error al descargar: ${response.status}`)

  const contentLength = parseInt(response.headers.get('Content-Length') || '0')
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (onProgress && contentLength > 0) {
      onProgress(Math.round((received / contentLength) * 100))
    }
  }

  // 2. Concatenar chunks
  const totalSize = chunks.reduce((s, c) => s + c.length, 0)
  const buffer = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  // 3. Cifrar con AES-256-GCM
  const key = await generateKey()
  const { ciphertext, iv } = await encryptData(buffer.buffer, key)
  const rawKey = await exportKey(key)

  // 4. Guardar en IndexedDB
  const db = await openDB()

  await dbPut(db, STORE_VIDEOS, {
    downloadId,
    iv: Array.from(iv),          // Uint8Array → Array para serialización
    ciphertext,
  })

  await dbPut(db, STORE_KEYS, {
    downloadId,
    rawKey,
  })

  await dbPut(db, STORE_META, {
    downloadId,
    ...meta,
    storedAt: Date.now(),
  })
}

/**
 * Recupera y descifra un video almacenado localmente.
 * Devuelve una Object URL para usar en el VideoPlayer.
 */
export async function getDecryptedVideoUrl(downloadId: string): Promise<string> {
  const db = await openDB()

  const videoRecord = await dbGet<{ downloadId: string; iv: number[]; ciphertext: ArrayBuffer }>(
    db, STORE_VIDEOS, downloadId
  )
  const keyRecord = await dbGet<{ downloadId: string; rawKey: ArrayBuffer }>(
    db, STORE_KEYS, downloadId
  )

  if (!videoRecord || !keyRecord) {
    throw new Error('Video no encontrado en almacenamiento local.')
  }

  const key = await importKey(keyRecord.rawKey)
  const iv = new Uint8Array(videoRecord.iv)
  const decrypted = await decryptData(videoRecord.ciphertext, iv, key)

  const blob = new Blob([decrypted], { type: 'video/mp4' })
  return URL.createObjectURL(blob)
}

/**
 * Verifica si un contenido ya está descargado localmente.
 */
export async function isStoredLocally(contentId: string): Promise<{ stored: boolean; downloadId?: string }> {
  try {
    const db = await openDB()
    const all = await dbGetAll<DownloadMeta>(db, STORE_META)
    const found = all.find(
      (m) => m.contentId === contentId && m.expiresAt * 1000 > Date.now()
    )
    return found
      ? { stored: true, downloadId: found.downloadId }
      : { stored: false }
  } catch {
    return { stored: false }
  }
}

/**
 * Lista todas las descargas almacenadas localmente.
 */
export async function listLocalDownloads(): Promise<DownloadMeta[]> {
  try {
    const db = await openDB()
    const all = await dbGetAll<DownloadMeta>(db, STORE_META)
    return all.filter((m) => m.expiresAt * 1000 > Date.now())
  } catch {
    return []
  }
}

/**
 * Elimina una descarga del almacenamiento local.
 */
export async function deleteLocalDownload(downloadId: string): Promise<void> {
  const db = await openDB()
  await dbDelete(db, STORE_VIDEOS, downloadId)
  await dbDelete(db, STORE_KEYS, downloadId)
  await dbDelete(db, STORE_META, downloadId)
}
