<script setup>
const props = defineProps({
  models: {
    type: Array,
    required: true,
  },
});

const getBadge = (model) => {
  if (model.includes('spark')) {
    return { className: 'spark', text: 'SPARK' };
  }

  if (model.includes('max')) {
    return { className: 'max', text: 'MAX' };
  }

  if (model.includes('mini')) {
    return { className: 'mini', text: 'MINI' };
  }

  if (model.includes('codex')) {
    return { className: 'codex', text: 'CODEX' };
  }

  return { className: 'base', text: 'BASE' };
};
</script>

<template>
  <div class="panel panel--wide">
    <p class="eyebrow">矩阵就绪</p>
    <h2 class="section-title">全系矩阵，严阵以待。</h2>
    <p class="section-desc">模型卡片保留信息密度，但滚动切入这一屏时会自动吸附并减速，避免用户在信息区一滑而过。</p>

    <div class="model-grid">
      <article v-for="model in props.models" :key="model" class="model-card">
        <div class="model-name">{{ model }}</div>
        <span class="badge" :class="getBadge(model).className">{{ getBadge(model).text }}</span>
      </article>
    </div>
  </div>
</template>
