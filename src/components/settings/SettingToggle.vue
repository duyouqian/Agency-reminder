<script setup lang="ts">
defineProps<{
  label: string
  desc: string
  checked: boolean
}>()

const emit = defineEmits<{
  change: [value: boolean]
}>()
</script>

<template>
  <div class="setting-card">
    <div class="setting-info">
      <span class="setting-label">{{ label }}</span>
      <span class="setting-desc">{{ desc }}</span>
    </div>
    <label class="toggle">
      <input
        type="checkbox"
        :checked="checked"
        @change="emit('change', ($event.target as HTMLInputElement).checked)"
      />
      <span class="toggle-slider"></span>
    </label>
  </div>
</template>

<style scoped>
.setting-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.setting-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  display: block;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 28px;
}

.dark .toggle-slider {
  background-color: #4b5563;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, var(--primary-color), #3b82f6);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}
</style>
