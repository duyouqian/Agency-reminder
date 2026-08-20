<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Todo } from '../../stores/todo'
import { useSettingsStore } from '../../stores/settings'
import TodoItem from '../TodoItem.vue'
import { useTodayButtonDrag } from '../../composables/useTodayButtonDrag'

const props = defineProps<{
  todos: Todo[]
  searchQuery: string
  completedCount: number
  showTodayButton: boolean
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  add: []
  toggle: [id: string]
  edit: [todo: Todo]
  delete: [id: string]
  goToday: []
}>()

const settingsStore = useSettingsStore()

// 回到今天按钮拖拽相关
const todayBtnRef = ref<HTMLElement | null>(null)
const btnPosition = ref({ right: 16, bottom: 10 })

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
  emit('goToday')
}

onMounted(() => {
  // 加载按钮位置
  loadButtonPosition()

  // 延迟设置拖拽监听器，确保DOM已渲染
  nextTick(() => {
    setupDragListeners()
  })
})

// 监听按钮显示状态变化，重新设置拖拽监听器
watch(
  () => props.showTodayButton,
  async (show) => {
    // 当按钮应该显示时，等待DOM更新后重新设置监听器
    if (show) {
      await nextTick()
      removeDragListeners()
      setupDragListeners()
    }
  }
)

onUnmounted(() => {
  // 移除拖拽事件监听
  removeDragListeners()
})
</script>

<template>
  <div class="todo-panel">
    <!-- 进度条 -->
    <div class="progress-bar" v-if="todos.length > 0">
      <div class="progress-fill" :style="{ width: `${(completedCount / todos.length) * 100}%` }"></div>
    </div>

    <!-- 搜索和添加按钮栏 -->
    <div class="action-bar">
      <input
        :value="searchQuery"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        type="text"
        class="search-input-inline"
        placeholder="搜索待办..."
      />
      <button class="add-btn-bar" @click="emit('add')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        添加待办
      </button>
    </div>

    <!-- 主内容区 -->
    <main class="todo-list">
      <div v-if="todos.length === 0" class="empty-state">
        <p>暂无待办事项</p>
        <button class="btn btn-primary" @click="emit('add')">添加待办</button>
      </div>
      <template v-else>
        <TransitionGroup name="todo-list" tag="div" appear>
          <TodoItem
            v-for="todo in todos"
            :key="todo.id"
            :todo="todo"
            @toggle="emit('toggle', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
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
        v-if="showTodayButton"
        title="回到今天"
      >
        今
      </button>
    </main>
  </div>
</template>

<style scoped>
.todo-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
