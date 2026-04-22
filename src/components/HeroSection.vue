<script setup lang="ts">
import GlitchText from './GlitchText.vue';
</script>

<template>
  <div class="panel panel--hero">
    <h1 class="hero-title hero-title--glitch">
      <span class="hero-title__line hero-title__line--full">超越边界的</span>
      <span class="hero-title__line hero-title__line--full">
        <span class="hero-title__glitch">
          <GlitchText
            children="Codex"
            :speed="0.5"
            :enable-shadows="true"
            :enable-on-hover="false"
            class-name="hero-glitch-text"
          />
        </span>
        <span>体验。</span>
      </span>
    </h1>
    <p class="hero-subtitle">LetsAPI Store 带你无缝跨入原生大模型新纪元。</p>
  </div>
</template>

<style scoped>
.hero-title--glitch {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-title__line {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  gap: 0.24em;
}

.hero-title__line--full {
  width: 100%;
  text-align: center;
}

.hero-title__glitch {
  display: inline-flex;
  align-items: baseline;
  line-height: 1;
}

.hero-title__glitch :deep(.hero-glitch-text) {
  margin-inline: 0;
  font-size: inherit !important;
  line-height: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  color: var(--glitch-text-color);
  text-shadow: 0 12px 30px rgba(0, 198, 255, 0.08);
}
</style>
