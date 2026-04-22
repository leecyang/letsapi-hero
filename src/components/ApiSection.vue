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
    <h2 class="section-title">一行改动，即刻唤醒。</h2>
    
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

    <p class="section-note section-note--center">
      完美兼容 OpenAI 标准 SDK。您只需在现有代码中修改
      <span class="section-note__code">BASE_URL</span>
      即可完成平滑迁移。
    </p>
  </div>
</template>
