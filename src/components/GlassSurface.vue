<template>
  <div ref="containerRef" :class="[glassSurfaceClasses, focusVisibleClasses, className]" :style="containerStyles">
    <svg class="w-full h-full pointer-events-none absolute inset-0 opacity-0 -z-10" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter :id="filterId" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage ref="feImageRef" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

          <feDisplacementMap ref="redChannelRef" in="SourceGraphic" in2="map" id="redchannel" result="dispRed" />
          <feColorMatrix
            in="dispRed"
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="red"
          />

          <feDisplacementMap ref="greenChannelRef" in="SourceGraphic" in2="map" id="greenchannel" result="dispGreen" />
          <feColorMatrix
            in="dispGreen"
            type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="green"
          />

          <feDisplacementMap ref="blueChannelRef" in="SourceGraphic" in2="map" id="bluechannel" result="dispBlue" />
          <feColorMatrix
            in="dispBlue"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
            result="blue"
          />

          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="output" />
          <feGaussianBlur ref="gaussianBlurRef" in="output" stdDeviation="0.7" />
        </filter>
      </defs>
    </svg>

    <div class="w-full h-full flex items-center justify-center p-2 rounded-[inherit] relative z-10">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type CSSProperties, useTemplateRef, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';

interface GlassSurfaceProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: 'R' | 'G' | 'B';
  yChannel?: 'R' | 'G' | 'B';
  mixBlendMode?:
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity'
    | 'plus-darker'
    | 'plus-lighter';
  className?: string;
  style?: CSSProperties;
}

const props = withDefaults(defineProps<GlassSurfaceProps>(), {
  width: '200px',
  height: '200px',
  borderRadius: 20,
  borderWidth: 0.07,
  brightness: 70,
  opacity: 0.93,
  blur: 11,
  displace: 0.5,
  backgroundOpacity: 0,
  saturation: 1,
  distortionScale: -180,
  redOffset: 0,
  greenOffset: 10,
  blueOffset: 20,
  xChannel: 'R',
  yChannel: 'G',
  mixBlendMode: 'difference',
  className: '',
  style: () => ({})
});

const isDarkMode = ref(false);

const updateDarkMode = () => {
  if (typeof window === 'undefined') return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  isDarkMode.value = mediaQuery.matches;

  const handler = (e: MediaQueryListEvent) => {
    isDarkMode.value = e.matches;
  };

  mediaQuery.addEventListener('change', handler);

  return () => mediaQuery.removeEventListener('change', handler);
};

// Generate unique IDs for SVG elements
const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15);
};

const uniqueId = generateUniqueId();
const filterId = `glass-filter-${uniqueId}`;
const redGradId = `red-grad-${uniqueId}`;
const blueGradId = `blue-grad-${uniqueId}`;

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const feImageRef = useTemplateRef<SVGSVGElement>('feImageRef');
const redChannelRef = useTemplateRef<SVGSVGElement>('redChannelRef');
const greenChannelRef = useTemplateRef<SVGSVGElement>('greenChannelRef');
const blueChannelRef = useTemplateRef<SVGSVGElement>('blueChannelRef');
const gaussianBlurRef = useTemplateRef<SVGSVGElement>('gaussianBlurRef');

let resizeObserver: ResizeObserver | null = null;

const generateDisplacementMap = () => {
  const rect = containerRef.value?.getBoundingClientRect();
  const actualWidth = rect?.width || 400;
  const actualHeight = rect?.height || 200;
  const edgeSize = Math.min(actualWidth, actualHeight) * (props.borderWidth * 0.5);
  const baseFill = isDarkMode.value ? '#000000' : '#f7fbff';
  const redStop = isDarkMode.value ? 'red' : '#dbe9ff';
  const blueStop = isDarkMode.value ? 'blue' : '#bad3ff';
  const surfaceLightness = isDarkMode.value
    ? props.brightness
    : Math.min(99, props.brightness + 14);
  const surfaceOpacity = isDarkMode.value
    ? props.opacity
    : Math.min(0.88, props.opacity);
  const surfaceFill = isDarkMode.value
    ? `hsl(0 0% ${surfaceLightness}% / ${surfaceOpacity})`
    : `hsl(210 100% ${surfaceLightness}% / ${surfaceOpacity})`;

  const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="${redStop}"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="${blueStop}"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="${baseFill}"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${props.borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${props.borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${props.mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${props.borderRadius}" fill="${surfaceFill}" style="filter:blur(${props.blur}px)" />
      </svg>
    `;

  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
};

const updateDisplacementMap = () => {
  if (feImageRef.value) {
    feImageRef.value.setAttribute('href', generateDisplacementMap());
  }
};

const supportsSVGFilters = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);

  if (isWebkit || isFirefox) {
    return false;
  }

  const div = document.createElement('div');
  div.style.backdropFilter = `url(#${filterId})`;
  return div.style.backdropFilter !== '';
};

const supportsBackdropFilter = () => {
  if (typeof window === 'undefined') return false;
  return CSS.supports('backdrop-filter', 'blur(10px)');
};

const containerStyles = computed(() => {
  const baseStyles: Record<string, string | number> = {
    ...props.style,
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    borderRadius: `${props.borderRadius}px`,
    '--glass-frost': props.backgroundOpacity,
    '--glass-saturation': props.saturation
  };

  const svgSupported = supportsSVGFilters();
  const backdropFilterSupported = supportsBackdropFilter();

  if (svgSupported) {
    return {
      ...baseStyles,
      background: isDarkMode.value
        ? `hsl(0 0% 0% / ${props.backgroundOpacity})`
        : `linear-gradient(180deg, rgba(255, 255, 255, ${Math.max(props.backgroundOpacity, 0.42)}), rgba(240, 246, 255, ${Math.max(props.backgroundOpacity - 0.04, 0.3)}))`,
      backdropFilter: isDarkMode.value
        ? `url(#${filterId}) saturate(${props.saturation})`
        : `url(#${filterId}) saturate(${Math.max(props.saturation, 1.2)}) brightness(1.03)`,
      border: isDarkMode.value
        ? '1px solid rgba(255, 255, 255, 0.12)'
        : '1px solid rgba(125, 154, 193, 0.22)',
      boxShadow: isDarkMode.value
        ? `0 0 2px 1px color-mix(in oklch, white, transparent 65%) inset,
           0 0 10px 4px color-mix(in oklch, white, transparent 85%) inset,
           0px 4px 16px rgba(17, 17, 26, 0.05),
           0px 8px 24px rgba(17, 17, 26, 0.05),
           0px 16px 56px rgba(17, 17, 26, 0.05),
           0px 4px 16px rgba(17, 17, 26, 0.05) inset,
           0px 8px 24px rgba(17, 17, 26, 0.05) inset,
           0px 16px 56px rgba(17, 17, 26, 0.05) inset`
        : `0 20px 48px rgba(123, 145, 179, 0.16),
           0 10px 24px rgba(123, 145, 179, 0.12),
           inset 0 1px 0 rgba(255, 255, 255, 0.98),
           inset 0 -1px 0 rgba(206, 221, 242, 0.5),
           inset 0 0 0 1px rgba(255, 255, 255, 0.32)`
    };
  } else {
    if (isDarkMode.value) {
      if (!backdropFilterSupported) {
        return {
          ...baseStyles,
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                      inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)`
        };
      } else {
        return {
          ...baseStyles,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px) saturate(1.8) brightness(1.2)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.8) brightness(1.2)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                      inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)`
        };
      }
    } else {
      if (!backdropFilterSupported) {
        return {
          ...baseStyles,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(239, 246, 255, 0.72))',
          border: '1px solid rgba(125, 154, 193, 0.24)',
          boxShadow: `0 18px 42px rgba(117, 138, 170, 0.16),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.94),
                      inset 0 -1px 0 0 rgba(205, 220, 241, 0.52)`
        };
      } else {
        return {
          ...baseStyles,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(239, 246, 255, 0.62))',
          backdropFilter: 'blur(18px) saturate(1.45) brightness(1.04)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.45) brightness(1.04)',
          border: '1px solid rgba(125, 154, 193, 0.24)',
          boxShadow: `0 18px 42px rgba(117, 138, 170, 0.16),
                      0 8px 18px rgba(117, 138, 170, 0.1),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.96),
                      inset 0 -1px 0 0 rgba(205, 220, 241, 0.56)`
        };
      }
    }
  }
});

const glassSurfaceClasses =
  'relative flex items-center justify-center overflow-hidden transition-opacity duration-[260ms] ease-out';

const focusVisibleClasses = computed(() => {
  return isDarkMode.value
    ? 'focus-visible:outline-2 focus-visible:outline-[#0A84FF] focus-visible:outline-offset-2'
    : 'focus-visible:outline-2 focus-visible:outline-[#007AFF] focus-visible:outline-offset-2';
});

const updateFilterElements = () => {
  const elements = [
    { ref: redChannelRef, offset: props.redOffset },
    { ref: greenChannelRef, offset: props.greenOffset },
    { ref: blueChannelRef, offset: props.blueOffset }
  ];

  elements.forEach(({ ref, offset }) => {
    if (ref.value) {
      ref.value.setAttribute('scale', (props.distortionScale + offset).toString());
      ref.value.setAttribute('xChannelSelector', props.xChannel);
      ref.value.setAttribute('yChannelSelector', props.yChannel);
    }
  });

  if (gaussianBlurRef.value) {
    gaussianBlurRef.value.setAttribute('stdDeviation', props.displace.toString());
  }
};

const setupResizeObserver = () => {
  if (!containerRef.value || typeof ResizeObserver === 'undefined') return;

  resizeObserver = new ResizeObserver(() => {
    setTimeout(updateDisplacementMap, 0);
  });

  resizeObserver.observe(containerRef.value);
};

watch(
  [
    () => props.width,
    () => props.height,
    () => props.borderRadius,
    () => props.borderWidth,
    () => props.brightness,
    () => props.opacity,
    () => props.blur,
    () => props.displace,
    () => props.distortionScale,
    () => props.redOffset,
    () => props.greenOffset,
    () => props.blueOffset,
    () => props.xChannel,
    () => props.yChannel,
    () => props.mixBlendMode
  ],
  () => {
    updateDisplacementMap();
    updateFilterElements();
  }
);

watch([() => props.width, () => props.height], () => {
  setTimeout(updateDisplacementMap, 0);
});

onMounted(() => {
  const cleanup = updateDarkMode();

  nextTick(() => {
    updateDisplacementMap();
    updateFilterElements();
    setupResizeObserver();
  });

  onUnmounted(() => {
    if (cleanup) cleanup();
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });
});
</script>
