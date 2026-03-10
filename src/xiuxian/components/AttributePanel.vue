<template>
  <div class="attribute-plaque">
    <div class="plaque-header">
      <div class="cloud-decoration cloud-top-left"></div>
      <div class="cloud-decoration cloud-top-right"></div>
      <h3 class="plaque-title">{{ title }}</h3>
    </div>
    <div class="plaque-content">
      <slot></slot>
    </div>
    <div class="plaque-footer">
      <div class="cloud-decoration cloud-bottom-left"></div>
      <div class="cloud-decoration cloud-bottom-right"></div>
      <div class="seal-mark">仙</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '属性'
  }
})
</script>

<style scoped>
.attribute-plaque {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  position: relative;
  box-shadow:
    0 4px 8px rgba(139, 69, 19, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.plaque-header {
  text-align: center;
  position: relative;
  margin-bottom: var(--spacing-md);
}

.plaque-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: bold;
  color: var(--color-gold);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  margin: 0;
  letter-spacing: 4px;
}

.plaque-content {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  min-height: 60px;
}

.plaque-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
  position: relative;
}

.seal-mark {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-cinnabar);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 18px;
  color: var(--color-cinnabar);
  background-color: rgba(200, 48, 44, 0.1);
  margin: 0 auto;
}

.cloud-decoration {
  position: absolute;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='rgba(255,255,255,0.3)' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M17.5 19c-1.5 0-2.8-.8-3.5-2-.7 1.2-2 2-3.5 2-2.5 0-4.5-2-4.5-4.5 0-1.5.8-2.8 2-3.5C6.8 12.3 6 11 6 9.5c0-2.5 2-4.5 4.5-4.5 1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2 2.5 0 4.5 2 4.5 4.5 0 1.5-.8 2.8-2 3.5 1.2.7 2 2 2 3.5 0 2.5-2 4.5-4.5 4.5z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
}

.cloud-top-left { top: 4px; left: 4px; }
.cloud-top-right { top: 4px; right: 4px; }
.cloud-bottom-left { bottom: 4px; left: 4px; }
.cloud-bottom-right { bottom: 4px; right: 4px; }
</style>
