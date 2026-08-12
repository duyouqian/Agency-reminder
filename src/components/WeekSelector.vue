<script setup lang="ts">
export interface WeekDateItem {
  date: Date
  dayName: string
  isToday: boolean
  isSelected: boolean
  todoCount: number
  completedCount: number
}

defineProps<{
  days: WeekDateItem[]
}>()

const emit = defineEmits<{
  selectDate: [date: Date]
  previousWeek: []
  nextWeek: []
}>()

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}`
}
</script>

<template>
  <header class="header">
    <div class="week-selector">
      <button class="week-nav-btn" @click="emit('previousWeek')" title="上一周">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="week-days">
        <div
          v-for="(day, index) in days"
          :key="index"
          class="day-item"
          :class="{
            'is-today': day.isToday,
            'is-selected': day.isSelected,
            'is-weekend': index === 5 || index === 6,
            'has-todos': day.todoCount > 0
          }"
          @click="emit('selectDate', day.date)"
        >
          <span class="day-name">周{{ day.dayName }}</span>
          <span class="day-number">{{ formatDate(day.date) }}</span>
          <!-- 任务进度背景填充 -->
          <div
            v-if="day.todoCount > 0"
            class="todo-progress"
            :style="{ height: `${(day.completedCount / day.todoCount) * 100}%` }"
          ></div>
        </div>
      </div>

      <button class="week-nav-btn" @click="emit('nextWeek')" title="下一周">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.header {
  padding: 6px 10px;
  background: var(--bg-secondary);
  flex-shrink: 0;
}

:global(.has-bg-image) .header {
  background: rgba(var(--bg-secondary-rgb), var(--ui-opacity));
  backdrop-filter: blur(10px);
}

.week-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.week-nav-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.week-nav-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

:global(.has-bg-image) .week-nav-btn {
  background: rgba(var(--bg-color-rgb), var(--ui-opacity));
  backdrop-filter: blur(8px);
}

.week-days {
  display: flex;
  flex: 1;
  gap: 4px;
}

.day-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-color);
  border: 2px solid transparent;
  position: relative;
  min-width: 0;
  gap: 1px;
  overflow: hidden;
}

:global(.has-bg-image) .day-item {
  background: rgba(var(--bg-color-rgb), var(--ui-opacity));
  backdrop-filter: blur(8px);
}

.day-item:hover {
  background: var(--bg-secondary);
  box-shadow: var(--shadow);
}

.day-item.is-today,
.day-item.is-selected {
  border-color: var(--primary-color);
}

.day-item.is-weekend:not(.is-selected) .day-name {
  color: #ef4444;
}

:global(.dark) .day-item.is-weekend:not(.is-selected) .day-name {
  color: #f87171;
}

.day-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  position: relative;
  z-index: 1;
}

.day-number {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-color);
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

.todo-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(186, 147, 212, 0.5), rgba(186, 147, 212, 0.25));
  transition: height 0.3s ease;
  z-index: 0;
}
</style>
