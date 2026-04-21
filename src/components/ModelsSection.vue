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
      <p class="section-desc">这一屏改成了无限滚动模型流，用户停在这里时可以持续扫读完整矩阵，信息密度更高，视觉节奏也更顺。</p>
    </div>

    <div class="model-scroll-shell">
      <InfiniteScroll
        :items="items"
        width="19rem"
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
