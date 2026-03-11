<template>
  <div class="evolve-container">
    <iframe
      src="/evolve/index.html"
      frameborder="0"
      class="game-frame"
    />
  </div>
</template>

<script setup>
// Evolve 游戏的视图包装器
// 使用 iframe 加载游戏，保持与项目 Vue 3 的隔离
</script>

<style scoped>
.evolve-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.game-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
