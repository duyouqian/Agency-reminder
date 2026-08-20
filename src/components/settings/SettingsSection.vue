<script setup lang="ts">
defineProps<{
  icon: string
  title: string
}>()
</script>

<template>
  <div class="settings-section">
    <div class="section-header">
      <div class="section-icon">{{ icon }}</div>
      <div class="section-title">{{ title }}</div>
    </div>
    <div class="section-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 20px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  border-radius: 8px;
}

.dark .section-icon {
  background: linear-gradient(135deg, #3730a3, #4f46e5);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color);
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
