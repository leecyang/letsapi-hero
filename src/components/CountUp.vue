<template>
  <span ref="elementRef" :class="className" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, useTemplateRef } from 'vue';

interface Props {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  decimals?: number;
  trimTrailingZeros?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

const emit = defineEmits<{
  (e: 'start'): void;
  (e: 'end'): void;
}>();

const props = withDefaults(defineProps<Props>(), {
  from: 0,
  direction: 'up',
  delay: 0,
  duration: 2,
  className: '',
  startWhen: true,
  separator: '',
  trimTrailingZeros: false
});

const elementRef = useTemplateRef<HTMLSpanElement>('elementRef');
const currentValue = ref(props.from);
const isInView = ref(false);
const animationId = ref<number | null>(null);
const hasStarted = ref(false);
const delayTimeoutId = ref<number | null>(null);

let intersectionObserver: IntersectionObserver | null = null;

const damping = computed(() => 20 + 40 * (1 / props.duration));
const stiffness = computed(() => 100 * (1 / props.duration));
const fractionDigits = computed(() => {
  if (typeof props.decimals === 'number') {
    return Math.max(0, props.decimals);
  }

  const getDecimalLength = (value: number) => {
    const decimalPart = value.toString().split('.')[1];
    return decimalPart ? decimalPart.length : 0;
  };

  return Math.max(getDecimalLength(props.from), getDecimalLength(props.to));
});

let velocity = 0;
let startTime = 0;

const formatNumber = (value: number) => {
  const options = {
    useGrouping: !!props.separator,
    minimumFractionDigits: props.trimTrailingZeros ? 0 : fractionDigits.value,
    maximumFractionDigits: fractionDigits.value
  };

  const roundedValue = Number(value.toFixed(fractionDigits.value));
  const formattedNumber = Intl.NumberFormat('en-US', options).format(roundedValue);

  return props.separator ? formattedNumber.replace(/,/g, props.separator) : formattedNumber;
};

const updateDisplay = () => {
  if (elementRef.value) {
    elementRef.value.textContent = formatNumber(currentValue.value);
  }
};

const springAnimation = (timestamp: number) => {
  if (!startTime) startTime = timestamp;

  const target = props.to;
  const current = currentValue.value;

  const displacement = target - current;
  const springForce = displacement * stiffness.value;
  const dampingForce = velocity * damping.value;
  const acceleration = springForce - dampingForce;

  velocity += acceleration * 0.016; // Assuming 60fps
  currentValue.value += velocity * 0.016;

  updateDisplay();

  if (Math.abs(displacement) > 0.01 || Math.abs(velocity) > 0.01) {
    animationId.value = requestAnimationFrame(springAnimation);
  } else {
    currentValue.value = target;
    updateDisplay();
    animationId.value = null;

    props.onEnd?.();
    emit('end');
  }
};

const startAnimation = () => {
  if (hasStarted.value || !isInView.value || !props.startWhen) return;

  hasStarted.value = true;

  props.onStart?.();
  emit('start');

  delayTimeoutId.value = window.setTimeout(() => {
    startTime = 0;
    velocity = 0;
    animationId.value = requestAnimationFrame(springAnimation);
  }, props.delay * 1000);
};

const setupIntersectionObserver = () => {
  if (!elementRef.value) return;

  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !isInView.value) {
        isInView.value = true;
        startAnimation();
      }
    },
    {
      threshold: 0,
      rootMargin: '0px'
    }
  );

  intersectionObserver.observe(elementRef.value);
};

const cleanup = () => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
    animationId.value = null;
  }

  if (delayTimeoutId.value) {
    window.clearTimeout(delayTimeoutId.value);
    delayTimeoutId.value = null;
  }

  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
};

watch(
  [() => props.from, () => props.to, () => props.direction],
  () => {
    currentValue.value = props.from;
    updateDisplay();
    hasStarted.value = false;
  },
  { immediate: true }
);

watch(
  () => props.startWhen,
  () => {
    if (props.startWhen && isInView.value && !hasStarted.value) {
      startAnimation();
    }
  }
);

onMounted(() => {
  updateDisplay();
  setupIntersectionObserver();
});

onUnmounted(() => {
  cleanup();
});
</script>
