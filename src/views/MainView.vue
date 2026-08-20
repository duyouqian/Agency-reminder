<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTodoStore, type Todo } from '../stores/todo'
import { useSettingsStore } from '../stores/settings'
import { useThemeStore } from '../stores/theme'
import { getLocalDateString } from '../utils/date'
import AddTodoModal from '../components/AddTodoModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import StatsModal from '../components/StatsModal.vue'
import OverviewModal from '../components/OverviewModal.vue'
import TagManageModal from '../components/TagManageModal.vue'
import ThemeModal from '../components/ThemeModal.vue'
import WeekSelector from '../components/WeekSelector.vue'
import AppTitleBar from '../components/main/AppTitleBar.vue'
import TodoListPanel from '../components/main/TodoListPanel.vue'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

const currentDate = ref(new Date())
const showAddModal = ref(false)
const showSettingsModal = ref(false)
const showStatsModal = ref(false)
const showOverviewModal = ref(false)
const showTagManageModal = ref(false)
const showThemeModal = ref(false)
const editingTodo = ref<Todo | null>(null)

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const dateString = computed(() => {
  return getLocalDateString(currentDate.value)
})

// 获取当前周的日期列表（周一到周日），包含每天的待办数量
const weekDates = computed(() => {
  const dates: { date: Date; dayName: string; isToday: boolean; isSelected: boolean; todoCount: number; completedCount: number }[] = []
  const current = new Date(currentDate.value)

  // 获取当前日期所在的周一
  const dayOfWeek = current.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(current)
  monday.setDate(current.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = getLocalDateString(today)
  const currentStr = getLocalDateString(currentDate.value)

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dStr = getLocalDateString(d)

    // 获取该日期的待办数量和完成数量
    const dayTodos = todoStore.getTodosByDate(dStr)

    dates.push({
      date: new Date(d),
      dayName: weekDays[d.getDay()],
      isToday: dStr === todayStr,
      isSelected: dStr === currentStr,
      todoCount: dayTodos.length,
      completedCount: dayTodos.filter(t => t.completed).length
    })
  }

  return dates
})

// 当前选中日期的待办列表
const currentTodos = computed(() => {
  const result = todoStore.applySearch(todoStore.getTodosByDate(dateString.value))
  return result.sort((a, b) => (a.priority || 3) - (b.priority || 3))
})

// 搜索条件由 todo store 管理，settings store 只负责持久化。
watch(() => todoStore.searchQuery, (val) => { void settingsStore.setFilterSearchQuery(val) })

// 设置加载完成后同步搜索条件，避免使用固定延迟猜测加载时序
watch(() => settingsStore.isReady, (ready) => {
  if (!ready) return
  todoStore.searchQuery = settingsStore.filterSearchQuery
}, { immediate: true })

const activeCompletedCount = computed(() => {
  return currentTodos.value.filter(t => t.completed).length
})

const showTodayButton = computed(() => !weekDates.value.some(d => d.isToday && d.isSelected))

function selectDate(date: Date) {
  currentDate.value = new Date(date)
}

function prevWeek() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - 7)
  currentDate.value = d
}

function nextWeek() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + 7)
  currentDate.value = d
}

function goToToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  currentDate.value = today
}

async function handleAddTodo(todo: { title: string; color: string; tag?: string; remindTime?: string; repeat?: 'daily' | 'weekly' | 'monthly' | null; priority?: 1 | 2 | 3 }) {
  const result = await todoStore.addTodo(todo.title, dateString.value, todo.color, todo.tag, todo.remindTime, todo.repeat, todo.priority)
  if (result.saved) {
    showAddModal.value = false
  } else {
    // 数据已保留在内存中；转为编辑模式，重试时不会重复新增同一条待办
    editingTodo.value = result.todo
  }
}

function handleEditTodo(todo: Todo) {
  editingTodo.value = todo
  showAddModal.value = true
}

async function handleUpdateTodo(todo: { title: string; color: string; tag?: string; remindTime?: string; repeat?: 'daily' | 'weekly' | 'monthly' | null; priority?: 1 | 2 | 3 }) {
  if (editingTodo.value) {
    const saved = await todoStore.updateTodo(editingTodo.value.id, todo)
    if (saved) {
      editingTodo.value = null
      showAddModal.value = false
    }
  }
}

async function handleDeleteTodo(id: string) {
  await todoStore.deleteTodo(id)
}

async function handleToggleTodo(id: string) {
  await todoStore.toggleTodo(id)
}

async function handleRetrySave() {
  await todoStore.retrySaveTodos()
}

function handleCloseModal() {
  showAddModal.value = false
  editingTodo.value = null
}

// 快捷键回调引用，用于卸载时移除
let quickAddCallback: (() => void) | null = null

onMounted(() => {
  quickAddCallback = () => {
    showAddModal.value = true
  }
  window.electronAPI.onQuickAddTodo(quickAddCallback)
  themeStore.loadTheme()
})

onUnmounted(() => {
  // 移除快捷键监听器，防止内存泄漏
  if (quickAddCallback) {
    window.electronAPI.removeQuickAddTodoListener?.(quickAddCallback)
  }
})
</script>

<template>
  <div class="main-view">
    <!-- 自定义标题栏 -->
    <AppTitleBar
      @open-overview="showOverviewModal = true"
      @open-stats="showStatsModal = true"
      @open-tags="showTagManageModal = true"
      @open-theme="showThemeModal = true"
      @open-settings="showSettingsModal = true"
    />

    <div v-if="todoStore.persistenceError || settingsStore.persistenceError" class="persistence-alert" role="alert">
      <span>{{ todoStore.persistenceError || settingsStore.persistenceError }}</span>
      <button v-if="todoStore.hasUnsavedChanges" type="button" @click="handleRetrySave">重试保存</button>
    </div>

    <!-- 日期选择器 -->
    <WeekSelector
      :days="weekDates"
      @select-date="selectDate"
      @previous-week="prevWeek"
      @next-week="nextWeek"
    />

    <!-- 待办列表面板（进度条 + 搜索 + 列表 + 回到今天按钮） -->
    <TodoListPanel
      :todos="currentTodos"
      :search-query="todoStore.searchQuery"
      :completed-count="activeCompletedCount"
      :show-today-button="showTodayButton"
      @update:search-query="todoStore.searchQuery = $event"
      @add="showAddModal = true"
      @toggle="handleToggleTodo"
      @edit="handleEditTodo"
      @delete="handleDeleteTodo"
      @go-today="goToToday"
    />

    <AddTodoModal
      v-if="showAddModal"
      :key="'add-modal-' + Date.now()"
      :editing-todo="editingTodo"
      @close="handleCloseModal"
      @add="handleAddTodo"
      @update="handleUpdateTodo"
    />

    <SettingsModal
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
    />

    <StatsModal
      v-if="showStatsModal"
      @close="showStatsModal = false"
    />

    <OverviewModal
      v-if="showOverviewModal"
      @close="showOverviewModal = false"
    />

    <TagManageModal
      v-if="showTagManageModal"
      @close="showTagManageModal = false"
    />

    <ThemeModal
      v-if="showThemeModal"
      @close="showThemeModal = false"
    />
  </div>
</template>

<style scoped>
.main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, var(--bg-color) 0%, #e0e7ff 100%);
}

.dark .main-view {
  background: linear-gradient(135deg, var(--bg-color) 0%, #1e293b 100%);
}

.persistence-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  color: #991b1b;
  background: #fee2e2;
  border-bottom: 1px solid #fecaca;
  font-size: 12px;
  line-height: 1.4;
  flex-shrink: 0;
}

.persistence-alert button {
  flex-shrink: 0;
  padding: 4px 10px;
  color: white;
  background: #dc2626;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.dark .persistence-alert {
  color: #fecaca;
  background: #451a1a;
  border-color: #7f1d1d;
}
</style>
