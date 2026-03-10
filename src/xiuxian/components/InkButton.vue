<template>
  <button
    :class="['ink-button', `ink-button-${type}`, { 'is-disabled': disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    <span class="button-content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  emit('click', e)
}
</script>

<style scoped>
.ink-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
  min-width: 80px;
  letter-spacing: 2px;
}

.ink-button-primary {
  background-color: var(--color-cinnabar);
  color: white;
  box-shadow:
    0 2px 4px rgba(200, 48, 44, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.ink-button-primary:hover:not(.is-disabled) {
  background-color: var(--color-cinnabar-light);
  transform: translateY(-1px);
  box-shadow:
    0 4px 8px rgba(200, 48, 44, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.ink-button-secondary {
  background-color: var(--color-paper);
  color: var(--color-ink);
  border: 2px solid var(--color-ink);
}

.ink-button-secondary:hover:not(.is-disabled) {
  background-color: #d4d0c7; /* 深一点的米色 */
  color: var(--color-ink);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(44, 44, 44, 0.15);
}

.ink-button-success {
  background-color: var(--color-jade);
  color: white;
}

.ink-button-success:hover:not(.is-disabled) {
  background-color: #4a8a6f; /* 深一点的玉色 */
  color: white;
  transform: translateY(-1px);
  box-shadow:
    0 4px 8px rgba(95, 141, 110, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.ink-button-warning {
  background-color: var(--color-gold);
  color: white;
}

.ink-button-warning:hover:not(.is-disabled) {
  background-color: #9a7509; /* 深一点的古铜金 */
  color: white;
  transform: translateY(-1px);
  box-shadow:
    0 4px 8px rgba(184, 134, 11, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.ink-button.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.ink-button:active:not(.is-disabled) {
  transform: scale(0.95);
}

/* 水墨溅射效果 */
.ink-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width var(--transition-normal), height var(--transition-normal);
}

.ink-button:active::before {
  width: 200px;
  height: 200px;
}
</style>
