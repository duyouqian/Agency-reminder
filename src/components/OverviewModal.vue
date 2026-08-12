<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodoStore } from '../stores/todo'
import { getChineseDayInfo, getLocalDateString, hasChineseHolidayData } from '../utils/date'

const todoStore = useTodoStore()

const currentDate = new Date()
const viewYear = ref(currentDate.getFullYear())
const viewMonth = ref(currentDate.getMonth())

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

// 节假日数据统一由 chinese-days 离线依赖提供，禁止在组件内恢复硬编码日期

const holidayDataAvailable = computed(() => hasChineseHolidayData(viewYear.value))

function createCalendarDay(date: Date, day: number, isCurrentMonth: boolean, todayStr: string) {
  const dayInfo = getChineseDayInfo(date)
  const holidayLabel = dayInfo.type === 'makeup-workday'
    ? `${dayInfo.name}补班`
    : dayInfo.isInLieu
      ? `${dayInfo.name}调休`
      : dayInfo.name

  return {
    date: dayInfo.date,
    day,
    isCurrentMonth,
    isToday: dayInfo.date === todayStr,
    dayInfo,
    holidayLabel
  }
}

const calendarDays = computed(() => {
  const days = []
  const todayStr = getLocalDateString(new Date())
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0)
  const startPadding = firstDay.getDay()

  // Previous month padding
  const prevMonthLastDay = new Date(viewYear.value, viewMonth.value, 0).getDate()
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(viewYear.value, viewMonth.value - 1, prevMonthLastDay - i)
    days.push(createCalendarDay(date, prevMonthLastDay - i, false, todayStr))
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(viewYear.value, viewMonth.value, i)
    days.push(createCalendarDay(date, i, true, todayStr))
  }

  // Next month padding
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(viewYear.value, viewMonth.value + 1, i)
    days.push(createCalendarDay(date, i, false, todayStr))
  }

  return days
})

function getTodoCount(dateStr: string) {
  const todos = todoStore.getTodosByDate(dateStr)
  const total = todos.length
  const completed = todos.filter(t => t.completed).length
  return { total, completed }
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function goToToday() {
  const today = new Date()
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal overview-modal">
      <div class="modal-title">
        <span>月总览</span>
        <div class="month-nav">
          <button class="icon-btn" @click="prevMonth">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span class="month-label" @click="goToToday">
            {{ viewYear }}年 {{ monthNames[viewMonth] }}
          </span>
          <button class="icon-btn" @click="nextMonth">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="calendar">
        <div v-if="!holidayDataAvailable" class="holiday-data-tip">
          当前年份暂无已公布的节假日数据
        </div>
        <div class="weekday-header">
          <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
        </div>
        
        <div class="calendar-grid">
          <div 
            v-for="day in calendarDays" 
            :key="day.date"
            class="calendar-day"
            :class="{ 
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'holiday': day.dayInfo.isHoliday,
              'in-lieu': day.dayInfo.isInLieu,
              'makeup-workday': day.dayInfo.type === 'makeup-workday'
            }"
          >
            <span class="day-number">{{ day.day }}</span>
            <span
              v-if="day.holidayLabel"
              class="holiday-tag"
              :class="{ 'makeup-workday-tag': day.dayInfo.type === 'makeup-workday' }"
            >
              {{ day.holidayLabel }}
            </span>
            <div class="day-todos" v-if="getTodoCount(day.date).total > 0">
              <div 
                class="todo-dot" 
                :style="{ 
                  backgroundColor: getTodoCount(day.date).completed === getTodoCount(day.date).total ? '#52c41a' : '#1890ff'
                }"
              ></div>
              <span class="todo-count">
                {{ getTodoCount(day.date).completed }}/{{ getTodoCount(day.date).total }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="overview-footer">
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot" style="background: #1890ff"></span>
            有待办
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background: #52c41a"></span>
            全部完成
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background: var(--error-color)"></span>
            节假日/调休
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background: #d46b08"></span>
            调休上班
          </span>
        </div>
        <button class="btn btn-primary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-modal {
  width: min(90vw, 600px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-label {
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  min-width: 120px;
  text-align: center;
}

.month-label:hover {
  color: var(--primary-color);
}

.calendar {
  margin-top: 12px;
  flex: 1;
  overflow-y: auto;
}

.holiday-data-tip {
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  background: rgba(250, 173, 20, 0.12);
  color: #d46b08;
  font-size: 11px;
  text-align: center;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-secondary);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 36px;
  padding: 4px 6px;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.calendar-day:has(.day-todos) {
  min-height: 56px;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day.other-month {
  background: var(--bg-secondary);
  opacity: 0.5;
}

.calendar-day.today {
  background: rgba(24, 144, 255, 0.1);
}

.calendar-day.today .day-number {
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.calendar-day.holiday .day-number {
  color: var(--error-color);
}

.calendar-day.makeup-workday .day-number {
  color: #d46b08;
}

.day-number {
  font-size: 12px;
  font-weight: 500;
}

.holiday-tag {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 8px;
  color: var(--error-color);
  font-weight: 500;
}

.holiday-tag.makeup-workday-tag {
  color: #d46b08;
}

.day-todos {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-secondary);
}

.todo-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.overview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.btn {
  padding: 6px 16px;
  font-size: 13px;
}
</style>
