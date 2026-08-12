<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useTodoStore } from '../stores/todo'
import { getLocalDateString } from '../utils/date'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
])

const todoStore = useTodoStore()

// 当前选择的图表

const activeChart = ref('trend')
const charts = [
  { key: 'trend', label: '任务趋势' },
  { key: 'productivity', label: '计划任务总数' },
  { key: 'category', label: '分类任务占比' }
]

// 每个图表的时间范围
const chartRange = ref({
  trend: 'daily',
  productivity: 'daily',
  category: 'daily'
})

const rangeOptions = [
  { key: 'daily', label: '每日' },
  { key: 'weekly', label: '每周' },
  { key: 'monthly', label: '每月' }
]

// Get daily data
function getDailyData() {
  const data = []
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = getLocalDateString(date)
    const dayTodos = todoStore.getTodosByDate(dateStr)
    const planned = dayTodos.length
    const completedInPlan = dayTodos.filter(t => t.completed).length
    
    data.push({
      date: dateStr,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      planned,
      completedInPlan
    })
  }
  
  return data
}

// Get weekly data
function getWeeklyData() {
  const data = []
  const today = new Date()
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today)
    const dayOfWeek = weekStart.getDay() || 7
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1 - (i * 7))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const weekTodos = todoStore.getTodosByDateRange(
      getLocalDateString(weekStart),
      getLocalDateString(weekEnd)
    )
    
    const planned = weekTodos.length
    const completedInPlan = weekTodos.filter(t => t.completed).length
    
    data.push({
      label: `第${4 - i}周`,
      planned,
      completedInPlan
    })
  }
  
  return data
}

// Get monthly data
function getMonthlyData() {
  const data = []
  const today = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
    
    const monthTodos = todoStore.getTodosByDateRange(
      getLocalDateString(date),
      getLocalDateString(endDate)
    )
    
    const planned = monthTodos.length
    const completedInPlan = monthTodos.filter(t => t.completed).length
    
    data.push({
      label: `${date.getMonth() + 1}月`,
      planned,
      completedInPlan
    })
  }
  
  return data
}

function getCurrentData(range: string) {
  switch (range) {
    case 'daily': return getDailyData()
    case 'weekly': return getWeeklyData()
    case 'monthly': return getMonthlyData()
    default: return getDailyData()
  }
}

// 任务趋势图表
const trendOption = computed(() => {
  const data = getCurrentData(chartRange.value.trend)
  return {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['计划任务数', '计划期内已完成数'],
      bottom: 0,
      textStyle: { color: 'var(--text-color)' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.label),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
    },
    series: [
      {
        name: '计划任务数',
        type: 'line',
        data: data.map(d => d.planned),
        itemStyle: { color: '#1890ff' },
        smooth: true,
        areaStyle: { color: 'rgba(24, 144, 255, 0.1)' }
      },
      {
        name: '计划期内已完成数',
        type: 'line',
        data: data.map(d => d.completedInPlan),
        itemStyle: { color: '#52c41a' },
        smooth: true,
        areaStyle: { color: 'rgba(82, 196, 26, 0.1)' }
      }
    ]
  }
})

// 计划任务总数图表
const productivityOption = computed(() => {
  const data = getCurrentData(chartRange.value.productivity)
  return {
    tooltip: { trigger: 'axis' },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.label),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
    },
    series: [
      {
        name: '计划任务数',
        type: 'bar',
        data: data.map(d => ({ value: d.planned, itemStyle: { color: '#1890ff' } })),
        barWidth: '40%'
      }
    ]
  }
})

// 根据时间范围获取分类统计数据
function getCategoryStats(range: string) {
  const stats: Record<string, number> = {}
  let todosToCount = todoStore.todos
  const today = new Date()
  
  switch (range) {
    case 'daily':
      // 当天数据
      todosToCount = todoStore.getTodosByDate(getLocalDateString(today))
      break
    case 'weekly':
      // 本周数据（周一到周日）
      const weekStart = new Date(today)
      const dayOfWeek = today.getDay() || 7 // 周日是0，转换为7
      weekStart.setDate(today.getDate() - dayOfWeek + 1) // 本周一
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // 本周日
      todosToCount = todoStore.getTodosByDateRange(
        getLocalDateString(weekStart),
        getLocalDateString(weekEnd)
      )
      break
    case 'monthly':
      // 本月数据
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      todosToCount = todoStore.getTodosByDateRange(
        getLocalDateString(monthStart),
        getLocalDateString(monthEnd)
      )
      break
  }
  
  todosToCount.forEach(todo => {
    const tag = todo.tag || '未分类'
    stats[tag] = (stats[tag] || 0) + 1
  })
  
  const colors: Record<string, string> = {
    '需求': '#1890ff',
    'Bug': '#ff4d4f',
    '临时活': '#faad14',
    '未分类': '#8c8c8c'
  }
  
  return Object.entries(stats).map(([tag, count]) => ({
    name: tag,
    value: count,
    itemStyle: { color: colors[tag] || '#1890ff' }
  }))
}

// 分类占比图表
const categoryStats = computed(() => {
  return getCategoryStats(chartRange.value.category)
})

const categoryOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'horizontal',
    bottom: 10,
    left: 'center',
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 16,
    textStyle: { 
      color: 'var(--text-color)',
      fontSize: 12
    }
  },
  series: [
    {
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: 'var(--bg-color)',
        borderWidth: 2
      },
      label: { 
        show: false
      },
      emphasis: {
        label: {
          show: false
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      data: categoryStats.value
    }
  ]
}))

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal stats-modal">
      <div class="modal-header">
        <div class="modal-title">数据统计</div>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      
      <!-- 图表切换 -->
      <div class="chart-tabs">
        <button 
          v-for="chart in charts" 
          :key="chart.key"
          class="chart-tab"
          :class="{ active: activeChart === chart.key }"
          @click="activeChart = chart.key"
        >
          {{ chart.label }}
        </button>
      </div>
      
      <div class="stats-content">
        <!-- 任务趋势 -->
        <div v-show="activeChart === 'trend'" class="chart-section">
          <v-chart class="chart" :option="trendOption" autoresize />
          <div class="range-selector">
            <button 
              v-for="opt in rangeOptions"
              :key="opt.key"
              class="range-btn"
              :class="{ active: chartRange.trend === opt.key }"
              @click="chartRange.trend = opt.key"
            >{{ opt.label }}</button>
          </div>
        </div>
        
        <!-- 计划任务总数 -->
        <div v-show="activeChart === 'productivity'" class="chart-section">
          <v-chart class="chart" :option="productivityOption" autoresize />
          <div class="range-selector">
            <button 
              v-for="opt in rangeOptions"
              :key="opt.key"
              class="range-btn"
              :class="{ active: chartRange.productivity === opt.key }"
              @click="chartRange.productivity = opt.key"
            >{{ opt.label }}</button>
          </div>
        </div>
        
        <!-- 分类占比 -->
        <div v-show="activeChart === 'category'" class="chart-section">
          <v-chart class="chart pie-chart" :option="categoryOption" autoresize />
          <div class="range-selector">
            <button 
              v-for="opt in rangeOptions"
              :key="opt.key"
              class="range-btn"
              :class="{ active: chartRange.category === opt.key }"
              @click="chartRange.category = opt.key"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-modal {
  width: min(90vw, 500px);
  max-height: 85vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
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

.chart-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.chart-tab {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.chart-tab:hover {
  border-color: var(--primary-color);
}

.chart-tab.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.stats-content {
  overflow-y: auto;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart {
  width: 100%;
  height: 280px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.pie-chart {
  height: 320px;
}

.range-selector {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.range-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-secondary);
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.range-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.range-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}
</style>
