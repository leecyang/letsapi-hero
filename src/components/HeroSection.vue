<script setup lang="ts">
import GlitchText from './GlitchText.vue';
</script>

<template>
  <div class="panel panel--hero">
    <h1 class="hero-title hero-title--glitch">
      <span>超越边界的</span>
      <span class="hero-title__line">
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
}

.hero-title__line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.24em;
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
  color: #ffffff;
}
</style>
