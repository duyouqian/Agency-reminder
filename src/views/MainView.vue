<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useTodoStore, type Todo } from '../stores/todo'
import { useSettingsStore } from '../stores/settings'
import { useThemeStore } from '../stores/theme'
import { getLocalDateString } from '../utils/date'
import { appBranding } from '../config/branding'
import TodoItem from '../components/TodoItem.vue'
import AddTodoModal from '../components/AddTodoModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import StatsModal from '../components/StatsModal.vue'
import OverviewModal from '../components/OverviewModal.vue'
import TagManageModal from '../components/TagManageModal.vue'
import ThemeModal from '../components/ThemeModal.vue'
import WeekSelector from '../components/WeekSelector.vue'
import { useTodayButtonDrag } from '../composables/useTodayButtonDrag'

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

// 回到今天按钮拖拽相关
const todayBtnRef = ref<HTMLElement | null>(null)
const btnPosition = ref({ right: 16, bottom: 10 })

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

// 窗口控制
function minimizeWindow() {
  window.electronAPI.minimizeWindow?.()
}

function maximizeWindow() {
  window.electronAPI.maximizeWindow?.()
}

function closeWindow() {
  window.electronAPI.closeWindow?.()
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

// 加载按钮位置
async function loadButtonPosition() {
  try {
    const saved = await window.electronAPI.getStore('todayBtnPosition')
    if (saved && typeof saved === 'object' && 'right' in saved && 'bottom' in saved) {
      btnPosition.value = saved as { right: number; bottom: number }
    }
  } catch (err) {
    // 加载按钮位置失败
  }
}

// 保存按钮位置
async function saveButtonPosition() {
  try {
    await settingsStore.setTodayButtonPosition(btnPosition.value)
  } catch (err) {
    // 保存按钮位置失败
  }
}

const { isDragging, hasDragged, setupDragListeners, removeDragListeners } = useTodayButtonDrag(
  todayBtnRef,
  btnPosition,
  saveButtonPosition
)

// 处理点击回到今天
function handleTodayBtnClick() {
  // 如果发生了拖拽，不执行点击逻辑
  if (hasDragged.value) return
  goToToday()
}

onMounted(() => {
  quickAddCallback = () => {
    showAddModal.value = true
  }
  window.electronAPI.onQuickAddTodo(quickAddCallback)
  themeStore.loadTheme()

  // 加载按钮位置
  loadButtonPosition()

  // 延迟设置拖拽监听器，确保DOM已渲染
  nextTick(() => {
    setupDragListeners()
  })
})

// 监听按钮显示状态变化，重新设置拖拽监听器
watch(
  () => weekDates.value.some(d => d.isToday && d.isSelected),
  async (isSelected) => {
    // 当按钮应该显示时，等待DOM更新后重新设置监听器
    if (!isSelected) {
      await nextTick()
      removeDragListeners()
      setupDragListeners()
    }
  }
)

onUnmounted(() => {
  // 移除快捷键监听器，防止内存泄漏
  if (quickAddCallback) {
    window.electronAPI.removeQuickAddTodoListener?.(quickAddCallback)
  }
  // 移除拖拽事件监听
  removeDragListeners()
})
</script>

<template>
  <div class="main-view">
    <!-- 自定义标题栏 -->
    <div class="title-bar">
      <div class="title-bar-drag">
        <span class="app-title">{{ appBranding.displayName }}</span>
      </div>
      <div class="title-bar-actions">
        <div class="title-bar-divider"></div>
        <button class="title-btn" @click="showOverviewModal = true" title="总览">
          <span class="btn-emoji">📊</span>
        </button>
        <button class="title-btn" @click="showStatsModal = true" title="统计">
          <span class="btn-emoji">📈</span>
        </button>
        <button class="title-btn" @click="showTagManageModal = true" title="标签管理">
          <span class="btn-emoji">🏷️</span>
        </button>
        <button class="title-btn" @click="showThemeModal = true" title="主题">
          <span class="btn-emoji">🎨</span>
        </button>
        <button class="title-btn" @click="showSettingsModal = true" title="设置">
          <span class="btn-emoji">⚙️</span>
        </button>
      </div>
      <div class="window-controls">
        <button class="window-btn minimize" @click="minimizeWindow" title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor"/>
          </svg>
        </button>
        <button class="window-btn maximize" @click="maximizeWindow" title="最大化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
        <button class="window-btn close" @click="closeWindow" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="2"/>
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>

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

    <!-- 进度条 -->
    <div class="progress-bar" v-if="currentTodos.length > 0">
      <div class="progress-fill" :style="{ width: `${(activeCompletedCount / currentTodos.length) * 100}%` }"></div>
    </div>

    <!-- 搜索和添加按钮栏 -->
    <div class="action-bar">
      <input
        v-model="todoStore.searchQuery"
        type="text"
        class="search-input-inline"
        placeholder="搜索待办..."
        @keyup.enter="() => {}"
      />
      <button class="add-btn-bar" @click="showAddModal = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        添加待办
      </button>
    </div>

    <!-- 主内容区 -->
    <main class="todo-list">
      <div v-if="currentTodos.length === 0" class="empty-state">
        <p>暂无待办事项</p>
        <button class="btn btn-primary" @click="showAddModal = true">添加待办</button>
      </div>
      <template v-else>
        <TransitionGroup name="todo-list" tag="div" appear>
          <TodoItem
            v-for="todo in currentTodos"
            :key="todo.id"
            :todo="todo"
            @toggle="handleToggleTodo"
            @edit="handleEditTodo"
            @delete="handleDeleteTodo"
          />
        </TransitionGroup>
      </template>
      <!-- 回到今天按钮 -->
      <button 
        ref="todayBtnRef"
        class="today-btn" 
        :class="{ dragging: isDragging }"
        :style="{ right: btnPosition.right + 'px', bottom: btnPosition.bottom + 'px' }"
        @click="handleTodayBtnClick" 
        v-if="!weekDates.some(d => d.isToday && d.isSelected)" 
        title="回到今天"
      >
        今
      </button>
    </main>

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

/* 标题栏样式 */
.title-bar {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--bg-secondary);
  -webkit-app-region: drag;
  padding: 0 8px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

/* 有背景图时的透明效果 */
:global(.has-bg-image) .title-bar {
  background: rgba(var(--bg-secondary-rgb), var(--ui-opacity));
  backdrop-filter: blur(10px);
}

.title-bar-drag {
  flex: 1;
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-left: 8px;
}

.title-bar-actions {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.title-btn {
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.title-btn:hover {
  background: var(--bg-color);
  color: var(--primary-color);
}

.btn-emoji {
  font-size: 14px;
  line-height: 1;
}

.title-btn.active {
  background: var(--primary-color);
  color: white;
}

.title-bar-divider {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 4px;
}

.window-controls {
  display: flex;
  margin-left: 8px;
  -webkit-app-region: no-drag;
}

.window-btn {
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.window-btn:hover {
  background: var(--bg-color);
}

.window-btn.close:hover {
  background: #e81123;
  color: white;
}

/* 操作栏样式（搜索+添加按钮） */
.action-bar {
  display: flex;
  gap: 8px;
  padding: 6px 16px 10px;
  flex-shrink: 0;
}

:global(.has-bg-image) .action-bar {
  background: transparent;
}

.search-input-inline {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-color);
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
}

:global(.has-bg-image) .search-input-inline {
  background: rgba(var(--bg-color-rgb), var(--ui-opacity));
  backdrop-filter: blur(8px);
}

.search-input-inline::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.search-input-inline:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.add-btn-bar {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: var(--shadow);
}

.add-btn-bar:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
  filter: brightness(1.1);
}

.add-btn-bar:active {
  transform: translateY(0);
}

/* 搜索面板样式 */
.search-panel {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 16px;
  flex-shrink: 0;
}

:global(.has-bg-image) .search-panel {
  background: rgba(var(--bg-secondary-rgb), var(--ui-opacity));
  backdrop-filter: blur(10px);
}

.search-panel-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-bar {
  height: 10px;
  background: var(--bg-secondary);
  border-radius: 5px;
  margin: 8px 16px 6px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

:global(.has-bg-image) .progress-bar {
  background: rgba(var(--bg-secondary-rgb), var(--ui-opacity));
  backdrop-filter: blur(10px);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), #7dd3fc);
  border-radius: 16px;
  transition: width 0.5s ease;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}



/* 主内容区样式 */
.todo-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px;
  position: relative;
  min-height: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 16px;
}

.empty-state .btn-primary {
  padding: 10px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow);
}

.empty-state .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.add-btn-inline {
  width: 100%;
  padding: 10px;
  background: var(--bg-color);
  color: var(--text-secondary);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  margin-top: 6px;
}

.add-btn-inline:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--bg-secondary);
}

.today-btn {
  position: absolute;
  right: 16px;
  bottom: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), #3b82f6);
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 3px 10px rgba(74, 144, 226, 0.4);
  z-index: 10;
  user-select: none;
}

.today-btn.dragging {
  opacity: 0.6;
  cursor: move;
}

.today-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(74, 144, 226, 0.5);
}

.today-btn.dragging:hover {
  transform: scale(1);
}

/* 有背景图时的透明效果 */
:global(.has-bg-image) .add-btn-inline {
  background: rgba(var(--bg-color-rgb), var(--ui-opacity));
  backdrop-filter: blur(8px);
}

:global(.has-bg-image) .empty-state .btn-primary {
  background: rgba(var(--primary-color), 0.9);
}

/* 待办列表动画 - 使用 :global 确保生效 */
:global(.todo-list-enter-active) {
  animation: todoEnter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:global(.todo-list-leave-active) {
  animation: todoLeave 0.5s ease-out;
  position: absolute;
  width: calc(100% - 32px);
}

:global(.todo-list-move) {
  transition: transform 0.5s ease;
}

/* 已完成任务的专用动画 - 避免闪烁 */
:global(.todo-list-enter-active.completed-enter-active) {
  animation: todoEnterCompleted 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:global(.todo-list-leave-active.completed-leave-active) {
  animation: todoLeaveCompleted 0.5s ease-out;
  position: absolute;
  width: calc(100% - 32px);
}

@keyframes todoEnter {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes todoLeave {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(50px);
  }
}

/* 已完成任务的动画 - 直接到目标 opacity */
@keyframes todoEnterCompleted {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 0.6;
    transform: translateX(0);
  }
}

@keyframes todoLeaveCompleted {
  from {
    opacity: 0.6;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(50px);
  }
}
</style>
