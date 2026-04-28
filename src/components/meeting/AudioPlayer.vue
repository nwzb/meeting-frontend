<template>
  <div class="audio-player-top">
    <div class="main-controls">
      <div class="minimal-play-btn" @click="toggle" :title="playing ? '暂停' : '播放'">
        <el-icon :size="42">
          <VideoPause v-if="playing" />
          <VideoPlay v-else />
        </el-icon>
      </div>

      <div class="waveform-wrapper">
        <div ref="waveformRef" class="waveform-container"></div>
      </div>
    </div>

    <div class="toolbar">
      <div class="time-info">
        <span class="current">{{ formatTime(current) }}</span>
        <span class="divider">/</span>
        <span class="total">{{ formatTime(total) }}</span>
      </div>

      <div class="zoom-controls">
        <el-icon class="zoom-btn" @click="stepZoom(-10)" title="缩小波形"><ZoomOut /></el-icon>

        <el-slider
            v-model="zoomLevel"
            :min="0"
            :max="200"
            :step="1"
            :show-tooltip="false"
            class="zoom-slider"
            @input="handleZoomChange"
            @change="handleZoomChange"
        />

        <el-icon class="zoom-btn" @click="stepZoom(10)" title="放大波形"><ZoomIn /></el-icon>

        <span class="zoom-text">波形缩放</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { ZoomIn, ZoomOut, VideoPlay, VideoPause } from '@element-plus/icons-vue';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import { formatTime } from '@/utils/timeFormat';
import type { MeetingContent } from '@/types/meeting';

const props = defineProps<{
  src?: string;
  contents?: MeetingContent[];
}>();
const emit = defineEmits(['timeupdate']);

const waveformRef = ref<HTMLElement | null>(null);
const playing = ref(false);
const current = ref(0);
const total = ref(0);
const zoomLevel = ref(0);

let wavesurfer: WaveSurfer | null = null;
let wsRegions: RegionsPlugin | null = null;

const ribbonColors = [
  '#FF6F42', '#E91E63', '#9C27B0', '#009688', '#3F51B5',
  '#4CAF50', '#FF9800', '#795548', '#2196F3', '#F44336'
];

const getRegionColor = (name?: string) => {
  if (!name) return '#909399';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ribbonColors[Math.abs(hash) % ribbonColors.length];
};

const initWaveSurfer = () => {
  if (!waveformRef.value || !props.src) return;

  wavesurfer = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#DCDFE6',
    progressColor: '#409EFF',
    cursorColor: '#337ecc',
    cursorWidth: 2,
    height: 80,
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    normalize: true,
    minPxPerSec: zoomLevel.value,
    autoScroll: true,
    hideScrollbar: false,
    interact: true,
    plugins: [
      Hover.create({
        lineColor: 'rgba(51, 126, 204, 0.4)',
        lineWidth: 2,
        labelBackground: 'rgba(0, 0, 0, 0.75)',
        labelColor: '#fff',
        labelSize: '12px',
      }),
    ],
  });

  wsRegions = wavesurfer.registerPlugin(RegionsPlugin.create());

  wavesurfer.on('ready', () => {
    total.value = wavesurfer?.getDuration() || 0;
    renderRegions();
  });

  wavesurfer.on('audioprocess', (currentTime) => {
    current.value = currentTime;
    emit('timeupdate', currentTime);
  });

  wavesurfer.on('interaction', () => {
    if (wavesurfer) {
      current.value = wavesurfer.getCurrentTime();
      emit('timeupdate', current.value);
    }
  });

  wavesurfer.on('play', () => playing.value = true);
  wavesurfer.on('pause', () => playing.value = false);

  // ★ 修复点：添加 .catch 捕获 load 被中断的错误
  wavesurfer.load(props.src).catch((err) => {
    if (err.name !== 'AbortError') console.error('WaveSurfer Load Error:', err);
  });
};

const renderRegions = () => {
  if (!wsRegions || !props.contents) return;
  wsRegions.clearRegions();

  props.contents.forEach(item => {
    wsRegions!.addRegion({
      start: item.startTime,
      end: item.endTime,
      color: getRegionColor(item.speaker),
      drag: false,
      resize: false,
    });
  });

  wsRegions.on('region-clicked', (region, e) => {
    e.stopPropagation();
    if (wavesurfer) {
      wavesurfer.seekTo(region.start / wavesurfer.getDuration());
    }
  });
};

const toggle = () => {
  // ★ 修复点：添加 .catch 捕获快速连按导致的 AbortError
  wavesurfer?.playPause().catch((err) => {
    if (err.name !== 'AbortError') console.error('WaveSurfer Play/Pause Error:', err);
  });
};

const handleZoomChange = (val: number) => {
  if (wavesurfer) {
    wavesurfer.zoom(val);
  }
};

const stepZoom = (delta: number) => {
  if (!wavesurfer) return;

  let newVal = zoomLevel.value + delta;
  if (newVal < 0) newVal = 0;
  if (newVal > 200) newVal = 200;

  zoomLevel.value = newVal;
  wavesurfer.zoom(newVal);
};

watch(() => props.src, (newSrc) => {
  if (newSrc && wavesurfer) {
    // ★ 修复点：重新加载数据时捕获中断异常
    wavesurfer.load(newSrc).catch((err) => {
      if (err.name !== 'AbortError') console.error('WaveSurfer Load Error:', err);
    });
  } else if (newSrc && !wavesurfer) {
    initWaveSurfer();
  }
});

watch(() => props.contents, () => {
  renderRegions();
}, { deep: true });

onMounted(() => {
  initWaveSurfer();
});

onUnmounted(() => {
  wavesurfer?.destroy();
});

defineExpose({
  seek: (t: number) => {
    if (wavesurfer) {
      const duration = wavesurfer.getDuration();
      if (duration > 0) {
        wavesurfer.seekTo(t / duration);
        // ★ 修复点：点击对话气泡触发跳转播放时，静默过滤 AbortError
        wavesurfer.play().catch((err) => {
          if (err.name !== 'AbortError') console.error('WaveSurfer Seek/Play Error:', err);
        });
      }
    }
  }
});
</script>

<style scoped lang="scss">
:deep(.wavesurfer-region),
:deep(::part(region)) {
  top: auto !important;
  bottom: 0 !important;
  height: 8px !important;
  opacity: 1 !important;
  border-radius: 4px 4px 0 0;
  cursor: pointer !important;
  z-index: 10;
  transition: height 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
  filter 0.2s ease,
  background-color 0.2s ease !important;
}

:deep(.wavesurfer-region:hover),
:deep(::part(region):hover) {
  height: 16px !important;
  filter: brightness(1.1);
  z-index: 11;
}

:deep(::part(cursor)) {
  border-radius: 2px;
}

.audio-player-top {
  padding: 16px 24px;
  background-color: #fff;
  border-bottom: 1px solid #e8f3ff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;

  .main-controls {
    display: flex;
    align-items: center;
    gap: 24px;
    width: 100%;

    .minimal-play-btn {
      flex-shrink: 0;
      color: #909399;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover {
        color: #337ecc;
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .waveform-wrapper {
      flex: 1;
      min-width: 0;
      height: 110px;
      position: relative;
      border-radius: 6px;
      background: #fafafa;
      border: 1px solid #ebeef5;
      padding: 5px 0 12px 0;
      box-sizing: border-box;

      .waveform-container {
        width: 100%;
        height: 100%;
      }
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-left: 66px;

    .time-info {
      font-family: 'Courier New', Courier, monospace;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 8px;

      .current { color: #337ecc; }
      .divider { color: #c0c4cc; font-weight: normal; }
      .total { color: #909399; }
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #606266;
      font-size: 18px;

      /* ★ 新增：可点击图标样式 */
      .zoom-btn {
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 4px;
        border-radius: 4px;

        &:hover {
          color: #337ecc;
          background-color: #f0f2f5;
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.9);
        }
      }

      .zoom-slider {
        width: 150px;
        margin: 0 4px; /* 稍微压缩滑块与按钮的间距，让视觉更紧凑 */
      }

      .zoom-text {
        font-size: 13px;
        color: #909399;
        margin-left: 8px;
      }
    }
  }
}
</style>