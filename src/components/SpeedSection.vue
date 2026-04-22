<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import GlassSurface from './GlassSurface.vue';
import Lightning from './Lightning.vue';

const props = withDefaults(
  defineProps<{
    isActive?: boolean;
  }>(),
  {
    isActive: true,
  }
);

interface PublicMonitor {
  id: number;
  name: string;
  type: string;
}

interface PublicGroup {
  id: number;
  name: string;
  weight: number;
  monitorList: PublicMonitor[];
}

interface StatusMetaResponse {
  publicGroupList: PublicGroup[];
}

interface HeartbeatEntry {
  status: number;
  time: string;
  msg: string;
  ping: number | null;
}

interface HeartbeatResponse {
  heartbeatList: Record<string, HeartbeatEntry[]>;
  uptimeList: Record<string, number>;
}

const KUMA_PUBLIC_PAGE_URL = 'https://api-kuma.way2api.fun/status/api';
const KUMA_PROXY_BASE = import.meta.env.VITE_KUMA_PROXY_BASE || '/kuma/api/status-page';
const KUMA_DIRECT_BASE =
  import.meta.env.VITE_KUMA_DIRECT_BASE || 'https://api-kuma.way2api.fun/api/status-page';
const REFRESH_INTERVAL = 60_000;

const monitorMeta = ref<StatusMetaResponse | null>(null);
const heartbeatData = ref<HeartbeatResponse | null>(null);
const isLoading = ref(true);
const loadError = ref('');
const effectsEnabled = ref(false);
const hasLoadedOnce = ref(false);
const prefersLightMode = ref(false);

let refreshTimer = 0;
let activeController: AbortController | null = null;
let effectTimer = 0;
let colorSchemeCleanup: (() => void) | null = null;

const flatMonitors = computed(() =>
  (monitorMeta.value?.publicGroupList ?? []).flatMap((group) => group.monitorList)
);

const latestHeartbeatMap = computed<Record<string, HeartbeatEntry | null>>(() => {
  const entries = heartbeatData.value?.heartbeatList ?? {};

  return flatMonitors.value.reduce<Record<string, HeartbeatEntry | null>>((map, monitor) => {
    const list = entries[String(monitor.id)] ?? [];
    map[String(monitor.id)] = list.length > 0 ? list[list.length - 1] : null;
    return map;
  }, {});
});

const monitorRows = computed(() =>
  flatMonitors.value.map((monitor) => {
    const history = heartbeatData.value?.heartbeatList?.[`${monitor.id}`] ?? [];
    const recentHistory = history.slice(-36);
    const latest = latestHeartbeatMap.value[String(monitor.id)];
    const uptime = heartbeatData.value?.uptimeList?.[`${monitor.id}_24`] ?? null;

    return {
      ...monitor,
      historyBars: compressHistory(recentHistory, 18),
      uptime,
      statusText: getStatusText(latest?.status),
      latestPingText: formatPing(latest?.ping ?? null),
      uptimeText: formatUptime(uptime),
    };
  })
);

const lightningConfig = computed(() =>
  prefersLightMode.value
    ? {
        hue: 208,
        xOffset: 0,
        speed: 0.82,
        intensity: 1.5,
        size: 0.94,
        qualityScale: 0.68,
        targetFps: 20,
      }
    : {
        hue: 230,
        xOffset: 0,
        speed: 0.85,
        intensity: 0.92,
        size: 0.92,
        qualityScale: 0.62,
        targetFps: 20,
      }
);

const monitorGlassProps = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: 28,
  brightness: prefersLightMode.value ? 86 : 82,
  opacity: prefersLightMode.value ? 0.88 : 0.9,
  blur: prefersLightMode.value ? 11 : 10,
  displace: 0.45,
  backgroundOpacity: prefersLightMode.value ? 0.05 : 0.08,
  saturation: prefersLightMode.value ? 1.25 : 1.35,
  mixBlendMode: 'normal' as const,
  className: 'speed-monitor-glass',
}));

async function fetchJson<T>(url: string, controller: AbortController) {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function loadMonitorData() {
  activeController?.abort();
  activeController = new AbortController();

  const candidates = [
    {
      label: 'proxy',
      metaUrl: `${KUMA_PROXY_BASE}/api`,
      heartbeatUrl: `${KUMA_PROXY_BASE}/heartbeat/api`,
    },
    {
      label: 'direct',
      metaUrl: `${KUMA_DIRECT_BASE}/api`,
      heartbeatUrl: `${KUMA_DIRECT_BASE}/heartbeat/api`,
    },
  ];

  let lastError: unknown = null;

  for (const source of candidates) {
    try {
      const [meta, heartbeat] = await Promise.all([
        fetchJson<StatusMetaResponse>(source.metaUrl, activeController),
        fetchJson<HeartbeatResponse>(source.heartbeatUrl, activeController),
      ]);

      monitorMeta.value = meta;
      heartbeatData.value = heartbeat;
      hasLoadedOnce.value = true;
      loadError.value = '';
      isLoading.value = false;
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      lastError = error;
    }
  }

  isLoading.value = false;
  loadError.value =
    lastError instanceof Error
      ? lastError.message
      : '监控接口暂时不可达，请确认已将 /kuma 反向代理到 Kuma 服务';
}

function startPolling() {
  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setInterval(() => {
    void loadMonitorData();
  }, REFRESH_INTERVAL);
}

function stopPolling() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = 0;
  }
}

function formatPing(ping: number | null) {
  if (typeof ping !== 'number') {
    return '--';
  }

  if (ping >= 1000) {
    return `${(ping / 1000).toFixed(2)}s`;
  }

  return `${Math.round(ping)}ms`;
}

function formatUptime(uptime: number | null) {
  if (typeof uptime !== 'number') {
    return '--';
  }

  return `${(uptime * 100).toFixed(2)}%`;
}

function formatTime(value?: string | null) {
  if (!value) {
    return '--:--';
  }

  const [, timePart = '--:--'] = value.split(' ');
  return timePart.slice(0, 5);
}

function getStatusText(status?: number) {
  if (status === 1) {
    return '在线';
  }

  if (status === 2) {
    return '波动';
  }

  if (status === 0) {
    return '离线';
  }

  return '未知';
}

function getDotClass(status?: number) {
  if (status === 1) {
    return 'is-up';
  }

  if (status === 2) {
    return 'is-warn';
  }

  if (status === 0) {
    return 'is-down';
  }

  return 'is-idle';
}

function getHeartbeatTooltip(heartbeat: HeartbeatEntry) {
  return `${getStatusText(heartbeat.status)} · ${formatTime(heartbeat.time)} · ${formatPing(heartbeat.ping)}`;
}

function compressHistory(history: HeartbeatEntry[], targetBars: number) {
  if (!history.length) {
    return [];
  }

  if (history.length <= targetBars) {
    return history;
  }

  const bars: HeartbeatEntry[] = [];
  const chunkSize = history.length / targetBars;

  for (let index = 0; index < targetBars; index += 1) {
    const start = Math.floor(index * chunkSize);
    const end = Math.min(history.length, Math.floor((index + 1) * chunkSize));
    const chunk = history.slice(start, Math.max(start + 1, end));
    const latest = chunk[chunk.length - 1];
    const hasDown = chunk.some((item) => item.status === 0);
    const hasWarn = chunk.some((item) => item.status === 2);

    bars.push({
      ...latest,
      status: hasDown ? 0 : hasWarn ? 2 : latest.status,
    });
  }

  return bars;
}

function clearEffectTimer() {
  if (effectTimer) {
    window.clearTimeout(effectTimer);
    effectTimer = 0;
  }
}

function setupColorSchemeWatcher() {
  if (typeof window === 'undefined') {
    return;
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  prefersLightMode.value = mediaQuery.matches;

  const handleChange = (event: MediaQueryListEvent) => {
    prefersLightMode.value = event.matches;
  };

  mediaQuery.addEventListener('change', handleChange);
  colorSchemeCleanup = () => mediaQuery.removeEventListener('change', handleChange);
}

watch(
  () => props.isActive,
  (active) => {
    clearEffectTimer();

    if (active) {
      isLoading.value = !hasLoadedOnce.value;
      effectTimer = window.setTimeout(() => {
        effectsEnabled.value = true;
      }, 180);

      void loadMonitorData();
      startPolling();
      return;
    }

    effectsEnabled.value = false;
    stopPolling();
    activeController?.abort();
  },
  { immediate: true }
);

onMounted(() => {
  setupColorSchemeWatcher();
});

onBeforeUnmount(() => {
  clearEffectTimer();
  stopPolling();
  activeController?.abort();
  colorSchemeCleanup?.();
  colorSchemeCleanup = null;
});
</script>

<template>
  <div class="panel panel--wide speed-layout">
    <div class="speed-copy">
      <h2 class="section-title">极速响应，<br>瞬时触达。</h2>
    </div>

    <div class="speed-stage" aria-label="Kuma 实时监控面板">
      <div class="speed-stage__glow" aria-hidden="true"></div>
      <div v-if="effectsEnabled" class="speed-stage__lightning" aria-hidden="true">
        <Lightning
          :hue="lightningConfig.hue"
          :x-offset="lightningConfig.xOffset"
          :speed="lightningConfig.speed"
          :intensity="lightningConfig.intensity"
          :size="lightningConfig.size"
          :quality-scale="lightningConfig.qualityScale"
          :target-fps="lightningConfig.targetFps"
          class="w-full h-full"
        />
      </div>

      <div class="speed-monitor-shell">
        <component
          :is="effectsEnabled ? GlassSurface : 'div'"
          v-bind="effectsEnabled
            ? monitorGlassProps
            : {
                class: 'speed-monitor-glass speed-monitor-glass--fallback',
              }"
        >
          <div class="speed-monitor">
            <div v-if="isLoading" class="speed-monitor__empty">
              正在拉取实时状态...
            </div>

            <div v-else-if="loadError" class="speed-monitor__empty speed-monitor__empty--error">
              <span>当前页面未能拉到真实心跳数据。</span>
              <span>请确认已经把 `/kuma` 同源反向代理到 Kuma 服务。</span>
              <a
                class="speed-monitor__link"
                :href="KUMA_PUBLIC_PAGE_URL"
                target="_blank"
                rel="noreferrer"
              >
                打开原始状态页
              </a>
            </div>

            <div v-else class="speed-monitor__list">
              <article
                v-for="monitor in monitorRows"
                :key="monitor.id"
                class="speed-monitor-row"
              >
                <div class="speed-monitor-row__main">
                  <strong class="speed-monitor-row__name">{{ monitor.name }}</strong>
                  <span class="speed-monitor-row__meta">
                    {{ monitor.uptimeText }} / {{ monitor.latestPingText }}
                  </span>
                </div>

                <div class="speed-monitor-row__dots" aria-hidden="true">
                  <span
                    v-for="(heartbeat, index) in monitor.historyBars"
                    :key="`${monitor.id}-${index}-${heartbeat.time}`"
                    class="speed-monitor-row__dot"
                    :class="getDotClass(heartbeat.status)"
                    :title="getHeartbeatTooltip(heartbeat)"
                  ></span>
                </div>

                <span class="speed-monitor-row__status">
                  {{ monitor.statusText }}
                </span>
              </article>
            </div>

            <p class="section-note speed-note">
              毫秒级首字延迟（TTFB），99% 运行可靠性保障。
            </p>
          </div>
        </component>
      </div>
    </div>
  </div>
</template>
