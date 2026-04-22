<template>
  <canvas ref="canvasRef" class="w-full h-full block mix-blend-screen relative"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue';

interface LightningProps {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
  qualityScale?: number;
  targetFps?: number;
}

const props = withDefaults(defineProps<LightningProps>(), {
  hue: 230,
  xOffset: 0,
  speed: 1,
  intensity: 1,
  size: 1,
  qualityScale: 0.7,
  targetFps: 24,
});

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
let animationId = 0;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let vertexBuffer: WebGLBuffer | null = null;
let startTime = 0;
let resizeObserver: ResizeObserver | null = null;
let resizeCleanup: (() => void) | null = null;
let visibilityCleanup: (() => void) | null = null;
let lastFrameTime = 0;
let needsStaticUniformUpdate = true;

const uniformLocations: {
  iResolution: WebGLUniformLocation | null;
  iTime: WebGLUniformLocation | null;
  uHue: WebGLUniformLocation | null;
  uXOffset: WebGLUniformLocation | null;
  uSpeed: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uSize: WebGLUniformLocation | null;
} = {
  iResolution: null,
  iTime: null,
  uHue: null,
  uXOffset: null,
  uSpeed: null,
  uIntensity: null,
  uSize: null,
};

const vertexShaderSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uHue;
uniform float uXOffset;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSize;

#define OCTAVE_COUNT 5

vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

float hash11(float p) {
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rotate2d(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat2(c, -s, s, c);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float a = hash12(ip);
    float b = hash12(ip + vec2(1.0, 0.0));
    float c = hash12(ip + vec2(0.0, 1.0));
    float d = hash12(ip + vec2(1.0, 1.0));
    
    vec2 t = smoothstep(0.0, 1.0, fp);
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < OCTAVE_COUNT; ++i) {
        value += amplitude * noise(p);
        p *= rotate2d(0.45);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord / iResolution.xy;
    uv = 2.0 * uv - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    uv.x += uXOffset;
    
    uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
    
    float dist = abs(uv.x);
    vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
    vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
    col = pow(col, vec3(1.0));
    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

const compileShader = (source: string, type: number): WebGLShader | null => {
  if (!gl) return null;
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const initWebGL = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const resizeCanvas = () => {
    const container = canvas.parentElement;
    const rect = container?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const effectiveDpr = Math.min(dpr, 1.0);

    let width = rect.width;
    let height = rect.height;

    let parent = canvas.parentElement;
    while (parent && (!width || !height)) {
      if (parent.offsetWidth && parent.offsetHeight) {
        width = parent.offsetWidth;
        height = parent.offsetHeight;
        break;
      }
      parent = parent.parentElement;
    }

    if (!width || !height) {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    width = Math.max(width, 300);
    height = Math.max(height, 300);

    const renderScale = Math.max(0.45, Math.min(props.qualityScale, 1));
    const nextWidth = Math.round(width * effectiveDpr * renderScale);
    const nextHeight = Math.round(height * effectiveDpr * renderScale);

    if (canvas.width === nextWidth && canvas.height === nextHeight) {
      return;
    }

    canvas.width = nextWidth;
    canvas.height = nextHeight;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uniformLocations.iResolution) {
        gl.uniform2f(uniformLocations.iResolution, canvas.width, canvas.height);
      }
    }
  };

  gl = canvas.getContext('webgl');
  if (!gl) {
    console.error('WebGL not supported');
    return;
  }

  resizeCanvas();

  const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) return;

  program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  uniformLocations.iResolution = gl.getUniformLocation(program, 'iResolution');
  uniformLocations.iTime = gl.getUniformLocation(program, 'iTime');
  uniformLocations.uHue = gl.getUniformLocation(program, 'uHue');
  uniformLocations.uXOffset = gl.getUniformLocation(program, 'uXOffset');
  uniformLocations.uSpeed = gl.getUniformLocation(program, 'uSpeed');
  uniformLocations.uIntensity = gl.getUniformLocation(program, 'uIntensity');
  uniformLocations.uSize = gl.getUniformLocation(program, 'uSize');

  gl.viewport(0, 0, canvas.width, canvas.height);
  if (uniformLocations.iResolution) {
    gl.uniform2f(uniformLocations.iResolution, canvas.width, canvas.height);
  }

  startTime = performance.now();
  lastFrameTime = startTime;
  render();

  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas.parentElement);
  } else {
    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCleanup = () => window.removeEventListener('resize', resizeCanvas);
  }

  return () => {
    window.removeEventListener('resize', resizeCanvas);
  };
};

const updateStaticUniforms = () => {
  if (!gl) {
    return;
  }

  if (uniformLocations.uHue) {
    gl.uniform1f(uniformLocations.uHue, props.hue);
  }
  if (uniformLocations.uXOffset) {
    gl.uniform1f(uniformLocations.uXOffset, props.xOffset);
  }
  if (uniformLocations.uSpeed) {
    gl.uniform1f(uniformLocations.uSpeed, props.speed);
  }
  if (uniformLocations.uIntensity) {
    gl.uniform1f(uniformLocations.uIntensity, props.intensity);
  }
  if (uniformLocations.uSize) {
    gl.uniform1f(uniformLocations.uSize, props.size);
  }

  needsStaticUniformUpdate = false;
};

const render = (timestamp = performance.now()) => {
  if (!gl || !program || !canvasRef.value) return;

  const minFrameDuration = 1000 / Math.max(12, props.targetFps);
  if (timestamp - lastFrameTime < minFrameDuration) {
    animationId = requestAnimationFrame(render);
    return;
  }
  lastFrameTime = timestamp;

  if (needsStaticUniformUpdate) {
    updateStaticUniforms();
  }

  const currentTime = timestamp;
  if (uniformLocations.iTime) {
    gl.uniform1f(uniformLocations.iTime, (currentTime - startTime) / 1000.0);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  animationId = requestAnimationFrame(render);
};

const startRenderLoop = () => {
  if (!animationId) {
    animationId = requestAnimationFrame(render);
  }
};

const stopRenderLoop = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
};

onMounted(() => {
  initWebGL();
  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopRenderLoop();
    } else {
      lastFrameTime = performance.now();
      startRenderLoop();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
  visibilityCleanup = () => document.removeEventListener('visibilitychange', handleVisibilityChange);
});

watch(
  () => [props.hue, props.xOffset, props.speed, props.intensity, props.size],
  () => {
    needsStaticUniformUpdate = true;
  }
);

onUnmounted(() => {
  stopRenderLoop();

  resizeObserver?.disconnect();
  resizeCleanup?.();
  visibilityCleanup?.();
  resizeObserver = null;
  resizeCleanup = null;
  visibilityCleanup = null;

  if (gl && vertexBuffer) {
    gl.deleteBuffer(vertexBuffer);
  }

  if (gl && program) {
    gl.deleteProgram(program);
  }

  vertexBuffer = null;
  program = null;
  gl = null;
});
</script>

<style scoped>
canvas {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 1 !important;
}
</style>
