<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  close: []
}>()

const tags = ref<string[]>([])
const newTag = ref('')
const editingIndex = ref<number | null>(null)
const editingValue = ref('')
const hasUnsavedChanges = ref(false)
const persistenceError = ref('')

async function loadTags() {
  try {
    const result = await window.electronAPI.getTags()
    tags.value = result.data || ['需求', 'Bug', '临时活']
    persistenceError.value = result.success ? '' : result.error || '标签数据无法安全加载'
  } catch (error) {
    tags.value = ['需求', 'Bug', '临时活']
    persistenceError.value = error instanceof Error ? error.message : '加载标签失败'
  }
}

async function saveTags(): Promise<boolean> {
  // 将响应式对象转换为普通数组，避免 IPC 克隆错误
  const tagsToSave = JSON.parse(JSON.stringify(tags.value))
  hasUnsavedChanges.value = true
  try {
    const result = await window.electronAPI.saveTags(tagsToSave)
    if (!result.success) {
      persistenceError.value = result.error || '标签保存失败'
      return false
    }
    hasUnsavedChanges.value = false
    persistenceError.value = ''
    return true
  } catch (error) {
    persistenceError.value = error instanceof Error ? error.message : '标签保存失败'
    return false
  }
}

async function addTag() {
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim())
    newTag.value = ''
    await saveTags()
  }
}

function startEdit(index: number) {
  editingIndex.value = index
  editingValue.value = tags.value[index]
}

async function saveEdit() {
  if (editingIndex.value !== null && editingValue.value.trim()) {
    tags.value[editingIndex.value] = editingValue.value.trim()
    editingIndex.value = null
    editingValue.value = ''
    await saveTags()
  }
}

function cancelEdit() {
  editingIndex.value = null
  editingValue.value = ''
}

async function deleteTag(index: number) {
  tags.value.splice(index, 1)
  await saveTags()
}

function handleClose() {
  if (hasUnsavedChanges.value && !window.confirm('标签尚未保存，仍然关闭标签管理吗？')) {
    return
  }
  emit('close')
}

onMounted(() => {
  loadTags()
})
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal">
      <div class="modal-header">
        <h3>管理标签</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div v-if="persistenceError" class="persistence-alert" role="alert">
        <span>{{ persistenceError }}</span>
        <button v-if="hasUnsavedChanges" class="btn-small" type="button" @click="saveTags">重试保存</button>
      </div>
      
      <div class="tag-list">
        <div v-for="(tag, index) in tags" :key="index" class="tag-item">
          <template v-if="editingIndex === index">
            <input 
              v-model="editingValue" 
              class="edit-input"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
              autofocus
            />
            <button class="btn-small btn-save" @click="saveEdit">保存</button>
            <button class="btn-small btn-cancel" @click="cancelEdit">取消</button>
          </template>
          <template v-else>
            <span class="tag-name">{{ tag }}</span>
            <div class="tag-actions">
              <button class="btn-small" @click="startEdit(index)">编辑</button>
              <button class="btn-small btn-delete" @click="deleteTag(index)">删除</button>
            </div>
          </template>
        </div>
      </div>
      
      <div class="add-section">
        <input 
          v-model="newTag" 
          class="input"
          placeholder="输入新标签"
          @keyup.enter="addTag"
        />
        <button class="btn btn-primary" @click="addTag">添加</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.persistence-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 10px;
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 12px;
}

.dark .persistence-alert {
  color: #fecaca;
  background: #451a1a;
  border-color: #7f1d1d;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--bg-color);
  color: var(--text-color);
}

.tag-list {
  margin-bottom: 20px;
}

.tag-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.tag-name {
  font-size: 14px;
  color: var(--text-color);
}

.tag-actions {
  display: flex;
  gap: 8px;
}

.edit-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  font-size: 14px;
  background: var(--bg-color);
  color: var(--text-color);
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-small:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-small.btn-delete:hover {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.btn-small.btn-save {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.btn-small.btn-cancel {
  background: transparent;
}

.add-section {
  display: flex;
  gap: 8px;
}

.add-section .input {
  flex: 1;
}
</style>
