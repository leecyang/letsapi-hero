<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import HeroSection from './components/HeroSection.vue';
import PriceSection from './components/PriceSection.vue';
import ApiSection from './components/ApiSection.vue';
import ModelsSection from './components/ModelsSection.vue';

const sections = [
  { id: 'hero', component: HeroSection },
  { id: 'price', component: PriceSection },
  { id: 'api', component: ApiSection },
  { id: 'models', component: ModelsSection },
];

const models = [
  'gpt-5',
  'gpt-5-codex',
  'gpt-5-codex-mini',
  'gpt-5.1',
  'gpt-5.1-codex',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
  'gpt-5.2',
  'gpt-5.2-codex',
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'gpt-5.4',
  'gpt-5.4-mini',
];

const apiUrl = 'https://letsapi.store/v1/responses';
const scrollContainer = ref(null);
const activeIndex = ref(0);
const currentProgress = ref(0);
const toastVisible = ref(false);
const isAutoSnapping = ref(false);

let snapTimer = 0;
let animationFrame = 0;

const totalSections = sections.length;

const progressWidth = computed(() => {
  const totalProgress = ((activeIndex.value + currentProgress.value) / (totalSections - 1)) * 100;
  return `${Math.min(100, Math.max(0, totalProgress))}%`;
});

const sceneState = computed(() => {
  const value = activeIndex.value + currentProgress.value;
  const depth = Math.max(0, value - 2);

  let scale = 1 + Math.min(value, 1) * 0.55;
  let opacity = 0.15 + Math.min(value, 1) * 0.12;

  if (value >= 1 && value < 2) {
    const mid = value - 1;
    scale = 1.55 + mid * 0.45;
    opacity = 0.27 + mid * 0.23;
  }

  if (value >= 2) {
    scale = 2 + Math.pow(depth, 3) * 5.5;
    opacity = 0.5 - depth * 0.33;
  }

  return {
    rotation: value * 84,
    scale,
    opacity: Math.max(0.08, opacity),
  };
});

const sectionStyle = (index) => {
  const distance = activeIndex.value + currentProgress.value - index;
  const absDistance = Math.abs(distance);
  const opacity = Math.max(0, 1 - absDistance * 1.55);
  const translateY = distance * -52;
  const scale = 1 - Math.min(absDistance * 0.06, 0.18);

  return {
    opacity,
    transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
    pointerEvents: opacity > 0.58 ? 'auto' : 'none',
  };
};

const updateScrollState = () => {
  const container = scrollContainer.value;

  if (!container) {
    return;
  }

  const viewportHeight = container.clientHeight || window.innerHeight;
  const scrollTop = container.scrollTop;
  const rawIndex = scrollTop / viewportHeight;
  const nextIndex = Math.round(rawIndex);

  activeIndex.value = Math.min(totalSections - 1, Math.max(0, nextIndex));
  currentProgress.value = rawIndex - activeIndex.value;
};

const clearSnapTimer = () => {
  if (snapTimer) {
    window.clearTimeout(snapTimer);
    snapTimer = 0;
  }
};

const scheduleSnap = () => {
  clearSnapTimer();

  snapTimer = window.setTimeout(() => {
    snapToNearest();
  }, 130);
};

const snapTo = (index) => {
  const container = scrollContainer.value;

  if (!container) {
    return;
  }

  isAutoSnapping.value = true;
  container.scrollTo({
    top: index * container.clientHeight,
    behavior: 'smooth',
  });

  window.setTimeout(() => {
    isAutoSnapping.value = false;
    updateScrollState();
  }, 460);
};

const snapToNearest = () => {
  const container = scrollContainer.value;

  if (!container || isAutoSnapping.value) {
    return;
  }

  const viewportHeight = container.clientHeight || window.innerHeight;
  const index = Math.round(container.scrollTop / viewportHeight);
  snapTo(Math.min(totalSections - 1, Math.max(0, index)));
};

const onScroll = () => {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
  }

  animationFrame = window.requestAnimationFrame(() => {
    updateScrollState();
  });

  scheduleSnap();
};

const onResize = () => {
  updateScrollState();
  snapToNearest();
};

const copyApi = async () => {
  try {
    await navigator.clipboard.writeText(apiUrl);
    toastVisible.value = true;
    window.setTimeout(() => {
      toastVisible.value = false;
    }, 2000);
  } catch {
    toastVisible.value = false;
  }
};

onMounted(() => {
  updateScrollState();
  window.addEventListener('resize', onResize, { passive: true });
});

onBeforeUnmount(() => {
  clearSnapTimer();
  window.removeEventListener('resize', onResize);

  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
  }
});
</script>

<template>
  <div class="page-shell">
    <div class="progress-bar" :style="{ width: progressWidth }"></div>

    <div class="scroll-container" ref="scrollContainer" @scroll.passive="onScroll">
      <div class="bg-layer" :style="{
        transform: `translate3d(-50%, -50%, 0) rotate(${sceneState.rotation}deg) scale(${sceneState.scale})`,
        opacity: sceneState.opacity,
      }">
        <svg class="openai-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00ff88" />
              <stop offset="50%" stop-color="#00c6ff" />
              <stop offset="100%" stop-color="#a020f0" />
            </linearGradient>
          </defs>
          <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 0 0-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 0 1 .476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 0 1 4.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 0 1-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 0 0 5.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0 0 10.205 0a5.947 5.947 0 0 0-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 0 0 4.162 1.713z" />
        </svg>
      </div>

      <section
        v-for="(section, index) in sections"
        :id="section.id"
        :key="section.id"
        class="scene-section"
      >
        <div class="scene-content" :style="sectionStyle(index)">
          <component
            :is="section.component"
            :api-url="apiUrl"
            :models="models"
            :is-active="activeIndex === index"
            @copy-api="copyApi"
          />
        </div>
      </section>
    </div>

    <div class="dot-nav" aria-label="页面导航">
      <button
        v-for="(section, index) in sections"
        :key="`${section.id}-dot`"
        class="dot-nav__item"
        :class="{ 'is-active': activeIndex === index }"
        :aria-label="`跳转到第 ${index + 1} 屏`"
        @click="snapTo(index)"
      ></button>
    </div>

    <div class="toast" :class="{ show: toastVisible }">已复制 API 地址</div>
  </div>
</template>
