<script setup lang="ts">
import CountUp from './CountUp.vue';

const props = withDefaults(
  defineProps<{
    isActive?: boolean;
  }>(),
  {
    isActive: true,
  }
);
</script>

<template>
  <div class="panel">
    <div class="price-title">
      <CountUp
        :from="1.0"
        :to="0.1"
        direction="down"
        :duration="2.2"
        :delay="0"
        :start-when="props.isActive"
        :decimals="2"
        :trim-trailing-zeros="true"
        class-name="price-number"
      />
      <span class="price-unit">元 / 500000 tokens</span>
    </div>
    <div class="price-subtitle">的极致价格</div>
    <p class="price-desc">告别高昂成本。在这里，你将以十分之一的价格，<br>完整体验 100% 满血性能的 Codex 全系列模型。</p>
  </div>
</template>
