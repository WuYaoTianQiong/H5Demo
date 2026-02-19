import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getJSON, setJSON } from '@/utils/storage.js'

const FORM_HISTORY_KEY = 'form_history'

/**
 * 表单输入历史记录管理
 * 自动保存表单输入内容，支持恢复和清除
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.formId - 表单唯一标识，默认为当前路由路径
 * @param {Object} options.initialData - 初始表单数据
 * @param {string[]} options.fields - 需要记录的字段列表，为空则记录所有字段
 * @param {number} options.debounceMs - 防抖时间(ms)，默认为 500
 * @param {number} options.maxHistory - 最大历史记录数，默认为 10
 * @param {boolean} options.encrypt - 是否加密存储敏感数据，默认为 false
 * @param {number} options.expireDays - 过期天数，默认为 7
 * @returns {Object} { formData, history, saveHistory, restoreHistory, clearHistory, addToHistory }
 */
export function useFormHistory(options = {}) {
  const {
    formId: customFormId = null,
    initialData = {},
    fields = [],
    debounceMs = 500,
    maxHistory = 10,
    encrypt = false,
    expireDays = 7
  } = options

  const route = useRoute()
  const formId = ref(customFormId || `${route.path}`)
  const formData = ref({ ...initialData })
  const history = ref([])
  const saveTimer = ref(null)

  // 生成存储 key
  const getStorageKey = () => `${FORM_HISTORY_KEY}:${formId.value}`

  // 简单的加密/解密（基础混淆，如需更高安全性请使用 crypto-js）
  const simpleEncrypt = (data) => {
    if (!encrypt) return JSON.stringify(data)
    const str = JSON.stringify(data)
    return btoa(encodeURIComponent(str))
  }

  const simpleDecrypt = (str) => {
    if (!encrypt) return JSON.parse(str)
    try {
      return JSON.parse(decodeURIComponent(atob(str)))
    } catch {
      return JSON.parse(str)
    }
  }

  // 过滤需要保存的字段
  const filterFields = (data) => {
    if (fields.length === 0) return data
    const filtered = {}
    fields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        filtered[field] = data[field]
      }
    })
    return filtered
  }

  // 从存储加载历史
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(getStorageKey())
      if (stored) {
        const decrypted = simpleDecrypt(stored)
        // 检查是否过期
        const now = Date.now()
        const expireTime = expireDays * 24 * 60 * 60 * 1000
        
        if (decrypted.timestamp && (now - decrypted.timestamp < expireTime)) {
          history.value = decrypted.history || []
          return decrypted.current || null
        } else {
          // 过期清除
          localStorage.removeItem(getStorageKey())
        }
      }
    } catch (e) {
      console.error('[useFormHistory] 加载历史失败:', e)
    }
    return null
  }

  // 保存到存储
  const saveToStorage = () => {
    try {
      const data = {
        current: filterFields(formData.value),
        history: history.value.slice(0, maxHistory),
        timestamp: Date.now()
      }
      localStorage.setItem(getStorageKey(), simpleEncrypt(data))
    } catch (e) {
      console.error('[useFormHistory] 保存失败:', e)
    }
  }

  // 防抖保存
  const debouncedSave = () => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }
    saveTimer.value = setTimeout(() => {
      saveToStorage()
    }, debounceMs)
  }

  // 保存当前表单到历史
  const saveHistory = () => {
    const currentData = filterFields(formData.value)
    
    // 检查是否与最新历史相同
    if (history.value.length > 0) {
      const lastHistory = history.value[0]
      const isSame = Object.keys(currentData).every(key => 
        currentData[key] === lastHistory[key]
      )
      if (isSame) return
    }

    // 添加到历史
    history.value.unshift({
      ...currentData,
      _savedAt: Date.now()
    })

    // 限制历史数量
    if (history.value.length > maxHistory) {
      history.value = history.value.slice(0, maxHistory)
    }

    saveToStorage()
  }

  // 从历史恢复
  const restoreHistory = (index = 0) => {
    if (history.value[index]) {
      const { _savedAt, ...data } = history.value[index]
      formData.value = { ...formData.value, ...data }
      return true
    }
    return false
  }

  // 恢复到自动保存的状态
  const restoreAutoSave = () => {
    const saved = loadHistory()
    if (saved) {
      formData.value = { ...formData.value, ...saved }
      return true
    }
    return false
  }

  // 清除历史
  const clearHistory = () => {
    history.value = []
    localStorage.removeItem(getStorageKey())
  }

  // 清除所有过期的表单历史
  const clearExpiredHistory = () => {
    const now = Date.now()
    const expireTime = expireDays * 24 * 60 * 60 * 1000

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(FORM_HISTORY_KEY)) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const data = simpleDecrypt(stored)
              if (data.timestamp && (now - data.timestamp > expireTime)) {
                localStorage.removeItem(key)
              }
            }
          } catch {
            // 解析失败，删除
            localStorage.removeItem(key)
          }
        }
      })
    } catch (e) {
      console.error('[useFormHistory] 清除过期历史失败:', e)
    }
  }

  // 监听表单变化自动保存
  watch(
    () => formData.value,
    () => {
      debouncedSave()
    },
    { deep: true }
  )

  onMounted(() => {
    // 加载自动保存的数据
    restoreAutoSave()
    // 清理过期数据
    clearExpiredHistory()
  })

  onUnmounted(() => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }
    // 离开页面时保存一次
    saveToStorage()
  })

  return {
    formData,
    history,
    saveHistory,
    restoreHistory,
    restoreAutoSave,
    clearHistory,
    saveToStorage
  }
}

/**
 * 输入框历史记录（用于单个输入框）
 * 支持上下箭头切换历史记录
 * 
 * @param {string} fieldName - 字段名
 * @param {Object} options - 配置选项
 * @returns {Object} { inputValue, historyIndex, showHistoryDropdown, historyList, navigateHistory, saveToHistory }
 */
export function useInputHistory(fieldName, options = {}) {
  const {
    maxHistory = 20,
    expireDays = 30
  } = options

  const route = useRoute()
  const storageKey = `input_history:${route.path}:${fieldName}`
  
  const inputValue = ref('')
  const historyIndex = ref(-1)
  const showHistoryDropdown = ref(false)
  const historyList = ref([])

  // 加载历史
  const loadHistory = () => {
    try {
      const stored = getJSON(storageKey)
      if (stored && Array.isArray(stored.items)) {
        const expireTime = expireDays * 24 * 60 * 60 * 1000
        const now = Date.now()
        
        // 过滤过期项
        historyList.value = stored.items.filter(item => 
          item.timestamp && (now - item.timestamp < expireTime)
        )
      }
    } catch (e) {
      console.error('[useInputHistory] 加载失败:', e)
    }
  }

  // 保存历史
  const saveHistory = () => {
    if (!inputValue.value.trim()) return

    // 去重并添加到开头
    historyList.value = historyList.value.filter(
      item => item.value !== inputValue.value
    )
    historyList.value.unshift({
      value: inputValue.value,
      timestamp: Date.now()
    })

    // 限制数量
    if (historyList.value.length > maxHistory) {
      historyList.value = historyList.value.slice(0, maxHistory)
    }

    try {
      setJSON(storageKey, { items: historyList.value })
    } catch (e) {
      console.error('[useInputHistory] 保存失败:', e)
    }
  }

  // 键盘导航历史
  const navigateHistory = (direction) => {
    if (historyList.value.length === 0) return

    if (direction === 'up') {
      historyIndex.value = Math.min(
        historyIndex.value + 1,
        historyList.value.length - 1
      )
    } else if (direction === 'down') {
      historyIndex.value = Math.max(historyIndex.value - 1, -1)
    }

    if (historyIndex.value >= 0) {
      inputValue.value = historyList.value[historyIndex.value].value
    }
  }

  // 选择历史项
  const selectHistory = (index) => {
    if (historyList.value[index]) {
      inputValue.value = historyList.value[index].value
      historyIndex.value = -1
      showHistoryDropdown.value = false
    }
  }

  // 删除历史项
  const removeHistoryItem = (index) => {
    historyList.value.splice(index, 1)
    try {
      setJSON(storageKey, { items: historyList.value })
    } catch (e) {
      console.error('[useInputHistory] 删除失败:', e)
    }
  }

  // 清空历史
  const clearAllHistory = () => {
    historyList.value = []
    localStorage.removeItem(storageKey)
  }

  onMounted(() => {
    loadHistory()
  })

  return {
    inputValue,
    historyIndex,
    showHistoryDropdown,
    historyList,
    navigateHistory,
    selectHistory,
    saveHistory,
    removeHistoryItem,
    clearAllHistory
  }
}

export default useFormHistory
