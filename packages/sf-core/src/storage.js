/**
 * sf-core/storage.js
 * Storage simple para web: IndexedDB con fallback a localStorage.
 * Para iOS, la equivalencia se implementa en Swift (CoreData).
 */

const DB_NAME = 'system-friction'
const DB_VERSION = 1

const STORES = {
  snapshots: 'snapshots',
  scenarios: 'scenarios',
  plans: 'plans',
}

/**
 * Abre la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        db.createObjectStore(STORES.snapshots, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.scenarios)) {
        db.createObjectStore(STORES.scenarios, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.plans)) {
        db.createObjectStore(STORES.plans, { keyPath: 'id' })
      }
    }

    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Guarda un objeto en un store.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {Object} record
 * @returns {Promise<void>}
 */
export function putRecord(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Obtiene un objeto por id.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export function getRecord(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(id)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Obtiene todos los registros de un store.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<Object[]>}
 */
export function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Elimina un registro por id.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<void>}
 */
export function deleteRecord(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}

export { STORES }
