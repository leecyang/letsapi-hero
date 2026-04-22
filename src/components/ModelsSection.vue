<script setup>
import { computed } from 'vue';
import InfiniteScroll from './InfiniteScroll.vue';

const props = defineProps({
  models: {
    type: Array,
    required: true,
  },
});

const items = computed(() =>
  props.models.map((model) => ({
    content: model,
  }))
);
</script>

<template>
  <div class="panel panel--wide models-layout">
    <div class="models-copy">
      <h2 class="section-title">全系矩阵，<br>严阵以待。</h2>
      <p class="section-note models-note">
        覆盖全场景的业务需求，全系列 Codex 矩阵为您提供最坚实的算力底座。
      </p>
    </div>

    <div class="model-scroll-shell">
      <InfiniteScroll
        :items="items"
        width="20.5rem"
        max-height="100%"
        :item-min-height="150"
        :is-tilted="true"
        tilt-direction="right"
        :autoplay="true"
        :autoplay-speed="0.8"
        autoplay-direction="down"
        :pause-on-hover="false"
        negative-margin="-0.5em"
      />
    </div>
  </div>
</template>
