<template>
  <div class="w-full">
    <div
      :class="[
        'relative flex justify-center items-center w-full overflow-hidden infinite-scroll-wrapper',
        { 'infinite-scroll-wrapper--tilted': isTilted }
      ]"
      ref="wrapperRef"
      :style="{
        maxHeight: maxHeight,
        overscrollBehavior: 'none',
        '--tilt-cut': wrapperCut
      }"
    >
      <div
        v-if="isTilted"
        aria-hidden="true"
        class="infinite-scroll-frame"
      />
      <div
        class="flex flex-col px-4 infinite-scroll-container cursor-grab"
        ref="containerRef"
        :style="{
          transform: getTiltTransform(),
          width: width,
          overscrollBehavior: 'contain',
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d'
        }"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="box-border relative flex justify-center items-center p-4 rounded-[1.75rem] font-semibold text-center infinite-scroll-item select-none"
          :style="{
            height: itemMinHeight + 'px',
            marginTop: negativeMargin
          }"
        >
          <component :is="item.content" v-if="typeof item.content === 'object'" />

          <template v-else>{{ item.content }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap';
import { Observer } from 'gsap/all';
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

gsap.registerPlugin(Observer);

interface InfiniteScrollItem {
  content: string | object;
}

interface Props {
  width?: string;
  maxHeight?: string;
  negativeMargin?: string;
  items?: InfiniteScrollItem[];
  itemMinHeight?: number;
  isTilted?: boolean;
  tiltDirection?: 'left' | 'right';
  autoplay?: boolean;
  autoplaySpeed?: number;
  autoplayDirection?: 'down' | 'up';
  pauseOnHover?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: '30rem',
  maxHeight: '100%',
  negativeMargin: '-0.5em',
  items: () => [],
  itemMinHeight: 150,
  isTilted: false,
  tiltDirection: 'left',
  autoplay: false,
  autoplaySpeed: 0.5,
  autoplayDirection: 'down',
  pauseOnHover: false
});

const wrapperRef = useTemplateRef<HTMLDivElement>('wrapperRef');
const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const wrapperCut = ref('9rem');
let observer: Observer | null = null;
let rafId: number | null = null;
let velocity = 0;
let stopTicker: (() => void) | null = null;
let startTicker: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;

const getTiltTransform = (): string => {
  if (!props.isTilted) return 'none';
  return props.tiltDirection === 'left'
    ? 'rotateX(20deg) rotateZ(-20deg) skewX(20deg)'
    : 'rotateX(20deg) rotateZ(20deg) skewX(-20deg)';
};

const updateWrapperCut = () => {
  const wrapper = wrapperRef.value;
  if (!wrapper || !props.isTilted) {
    wrapperCut.value = '0px';
    return;
  }

  const height = wrapper.clientHeight;
  const width = wrapper.clientWidth;
  const maxCut = Math.max(width / 2 - 1, 0);

  // Prefer a 45deg side and clamp it to the widest valid parallelogram.
  wrapperCut.value = `${Math.min(height, maxCut)}px`;
};

const initializeScroll = () => {
  const container = containerRef.value;
  if (!container) return;
  if (props.items.length === 0) return;

  const divItems = gsap.utils.toArray<HTMLDivElement>(container.children);
  if (!divItems.length) return;

  const firstItem = divItems[0];
  const itemStyle = getComputedStyle(firstItem);
  const itemHeight = firstItem.offsetHeight;
  const itemMarginTop = parseFloat(itemStyle.marginTop) || 0;
  const totalItemHeight = itemHeight + itemMarginTop;
  const totalHeight = itemHeight * props.items.length + itemMarginTop * (props.items.length - 1);

  const wrapFn = gsap.utils.wrap(-totalHeight, totalHeight);

  divItems.forEach((child, i) => {
    const y = i * totalItemHeight;
    gsap.set(child, { y });
  });

  observer = Observer.create({
    target: container,
    type: 'wheel,touch,pointer',
    preventDefault: true,
    onPress: ({ target }) => {
      (target as HTMLElement).style.cursor = 'grabbing';
    },
    onRelease: ({ target }) => {
      (target as HTMLElement).style.cursor = 'grab';
      if (Math.abs(velocity) > 0.1) {
        const momentum = velocity * 0.8;
        divItems.forEach(child => {
          gsap.to(child, {
            duration: 1.5,
            ease: 'power2.out',
            y: `+=${momentum}`,
            modifiers: {
              y: gsap.utils.unitize(wrapFn)
            }
          });
        });
      }
      velocity = 0;
    },
    onChange: ({ deltaY, isDragging, event }) => {
      const d = event.type === 'wheel' ? -deltaY : deltaY;
      const distance = isDragging ? d * 5 : d * 1.5;

      velocity = distance * 0.5;

      divItems.forEach(child => {
        gsap.to(child, {
          duration: isDragging ? 0.3 : 1.2,
          ease: isDragging ? 'power1.out' : 'power3.out',
          y: `+=${distance}`,
          modifiers: {
            y: gsap.utils.unitize(wrapFn)
          }
        });
      });
    }
  });

  if (props.autoplay) {
    const directionFactor = props.autoplayDirection === 'down' ? 1 : -1;
    const speedPerFrame = props.autoplaySpeed * directionFactor;

    const tick = () => {
      divItems.forEach(child => {
        gsap.set(child, {
          y: `+=${speedPerFrame}`,
          modifiers: {
            y: gsap.utils.unitize(wrapFn)
          }
        });
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    if (props.pauseOnHover) {
      stopTicker = () => rafId && cancelAnimationFrame(rafId);
      startTicker = () => {
        rafId = requestAnimationFrame(tick);
      };

      container.addEventListener('mouseenter', stopTicker);
      container.addEventListener('mouseleave', startTicker);
    }
  }
};

const cleanup = () => {
  if (observer) {
    observer.kill();
    observer = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  velocity = 0;

  const container = containerRef.value;
  if (container && props.pauseOnHover && stopTicker && startTicker) {
    container.removeEventListener('mouseenter', stopTicker);
    container.removeEventListener('mouseleave', startTicker);
  }

  stopTicker = null;
  startTicker = null;
};

onMounted(() => {
  updateWrapperCut();
  if (typeof ResizeObserver !== 'undefined' && wrapperRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateWrapperCut();
    });
    resizeObserver.observe(wrapperRef.value);
  }
  initializeScroll();
});

onUnmounted(() => {
  cleanup();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

watch(
  [
    () => props.items,
    () => props.autoplay,
    () => props.autoplaySpeed,
    () => props.autoplayDirection,
    () => props.pauseOnHover,
    () => props.isTilted,
    () => props.tiltDirection,
    () => props.negativeMargin
  ],
  () => {
    updateWrapperCut();
    cleanup();
    setTimeout(() => {
      initializeScroll();
    }, 0);
  }
);
</script>

<style scoped>
.infinite-scroll-wrapper {
  isolation: isolate;
}

.infinite-scroll-wrapper--tilted {
  clip-path: polygon(var(--tilt-cut) 0, 100% 0, calc(100% - var(--tilt-cut)) 100%, 0 100%);
}

.infinite-scroll-frame {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  clip-path: inherit;
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.infinite-scroll-wrapper::before,
.infinite-scroll-wrapper::after {
  content: '';
  position: absolute;
  background: transparent;
  height: 25%;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.infinite-scroll-wrapper::before {
  top: 0;
}

.infinite-scroll-wrapper::after {
  --dir: to top;
  bottom: 0;
}

.infinite-scroll-container {
  position: relative;
  z-index: 1;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  -ms-backface-visibility: hidden;
}

.infinite-scroll-item {
  color: var(--scroll-item-text);
  border: 1px solid var(--scroll-item-border);
  background: var(--scroll-item-bg);
  box-shadow: var(--scroll-item-shadow);
  overflow: hidden;
  font-size: clamp(1rem, 2.2vw, 1.24rem);
  line-height: 1.15;
  letter-spacing: -0.04em;
  font-weight: 750;
  text-shadow: var(--scroll-item-text-shadow);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  -ms-backface-visibility: hidden;
  transform: translateZ(0);
  backdrop-filter: blur(18px);
}

.infinite-scroll-item::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--scroll-item-overlay);
  pointer-events: none;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .infinite-scroll-item {
    padding: 1rem;
    font-size: 1rem;
  }
}
</style>
