<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'danger', 'warning'].includes(value)
  },
  icon: {
    type: String,
    default: '⚠️'
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

const localShow = ref(props.show)

watch(() => props.show, (newVal) => {
  localShow.value = newVal
})

watch(localShow, (newVal) => {
  emit('update:show', newVal)
})

const handleConfirm = () => {
  emit('confirm')
  localShow.value = false
}

const handleCancel = () => {
  emit('cancel')
  localShow.value = false
}

const handleOverlayClick = () => {
  handleCancel()
}
</script>

<template>
  <transition name="fade">
    <div v-if="localShow" class="confirm-dialog-overlay" @click="handleOverlayClick">
      <div class="confirm-dialog-box" @click.stop>
        <div class="confirm-dialog-header">
          <div class="confirm-dialog-icon">{{ icon }}</div>
          <h3>{{ title }}</h3>
        </div>

        <div class="confirm-dialog-body">
          <p>{{ message }}</p>
        </div>

        <div class="confirm-dialog-footer">
          <button class="confirm-dialog-btn cancel" @click="handleCancel">
            {{ cancelText }}
          </button>
          <button
            class="confirm-dialog-btn"
            :class="[type]"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog-box {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  min-width: 400px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.confirm-dialog-header {
  text-align: center;
  margin-bottom: 20px;
}

.confirm-dialog-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.confirm-dialog-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.confirm-dialog-body {
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.confirm-dialog-body p {
  margin: 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.confirm-dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-dialog-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  max-width: 120px;
}

.confirm-dialog-btn:hover {
  transform: translateY(-2px);
}

.confirm-dialog-btn.cancel {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
}

.confirm-dialog-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
}

.confirm-dialog-btn.primary {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.confirm-dialog-btn.primary:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: rgba(76, 175, 80, 0.4);
}

.confirm-dialog-btn.danger {
  background: rgba(255, 107, 107, 0.15);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.confirm-dialog-btn.danger:hover {
  background: rgba(255, 107, 107, 0.25);
  border-color: rgba(255, 107, 107, 0.4);
}

.confirm-dialog-btn.warning {
  background: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
  color: #ffc107;
}

.confirm-dialog-btn.warning:hover {
  background: rgba(255, 193, 7, 0.25);
  border-color: rgba(255, 193, 7, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .confirm-dialog-box {
    min-width: 90%;
    padding: 20px;
  }

  .confirm-dialog-footer {
    flex-direction: column;
  }

  .confirm-dialog-btn {
    max-width: 100%;
  }
}
</style>
