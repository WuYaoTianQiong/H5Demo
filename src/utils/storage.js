// Web 端本地存储封装

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch (e) {
    console.error('[storage] localStorage not available:', e)
    return null
  }
}

export function getItem(key) {
  const storage = getStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch (e) {
    console.error('[storage] getItem error:', key, e)
    return null
  }
}

export function setItem(key, value) {
  const storage = getStorage()
  if (!storage) {
    console.error('[storage] setItem failed: localStorage not available')
    return
  }
  try {
    storage.setItem(key, value)
  } catch (e) {
    console.error('[storage] setItem error:', key, e)
  }
}

export function removeItem(key) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch (e) {
    console.error('[storage] removeItem error:', key, e)
  }
}

export function getJSON(key) {
  const raw = getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    console.error('[storage] getJSON parse error:', key, e)
    return null
  }
}

export function setJSON(key, value) {
  try {
    setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('[storage] setJSON error:', key, e)
  }
}

export function getShareBaseUrl() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
