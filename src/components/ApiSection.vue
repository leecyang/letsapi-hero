<script setup>
defineProps({
  apiUrl: {
    type: String,
    required: true,
  },
});

defineEmits(['copy-api']);
</script>

<template>
  <div class="panel">
    <p class="eyebrow">零心智切换</p>
    <h2 class="section-title">一行代码，即刻唤醒。</h2>
    <p class="section-desc">保留熟悉的 OpenAI 风格调用方式，接入成本极低，滚动到这里自动稳住节奏，方便用户停留和复制。</p>

    <div class="api-container">
      <div class="api-method">POST</div>
      <div class="api-url">{{ apiUrl }}</div>
      <button class="copy-btn" aria-label="复制 API 地址" @click="$emit('copy-api')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  </div>
</template>
