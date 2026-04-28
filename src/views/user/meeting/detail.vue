<template>
  <div class="meeting-detail-container">
    <header class="detail-header">
      <div class="left">
        <el-button icon="ArrowLeft" circle @click="$router.back()" />
        <h2 class="title">{{ meetingStore.currentMeeting?.title }}</h2>

        <StatusTag :status="meetingStore.currentMeeting?.status" />

        <el-tag v-if="isAuditorMode" type="warning" effect="dark" style="margin-left: 12px; border-radius: 12px;">
          审计只读模式
        </el-tag>

        <el-tag v-if="isArchived" type="warning" effect="dark" style="margin-left: 12px; border-radius: 12px;">
          已归档
        </el-tag>

        <el-tag
            v-if="sensitiveWordCount > 0"
            type="danger"
            effect="dark"
            style="margin-left: 12px; border-radius: 12px;"
        >
          <span style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <el-icon><WarningFilled /></el-icon>
            <span>发现 {{ sensitiveWordCount }} 处敏感词</span>
          </span>
        </el-tag>
      </div>
      <div class="right">
        <el-button
            v-if="!isAuditorMode && meetingStore.currentMeeting?.status !== 4"
            color="#8b5cf6"
            plain
            :icon="MagicStick"
            :loading="isPartialSummaryLoading"
            :disabled="meetingStore.currentMeeting?.status !== 2 || isReadOnly"
            @click="handleRequestPartialSummary"
        >
          立即生成部分纪要
        </el-button>

        <el-button
            v-if="!isAuditorMode && (meetingStore.currentMeeting?.status === 4 || meetingStore.currentMeeting?.status === 9)"
            type="warning"
            plain
            :icon="RefreshRight"
            :loading="isRegenerating"
            :disabled="isReadOnly"
            @click="handleRegenerateSummary"
        >
          重新生成摘要
        </el-button>

        <el-button
            v-if="!isAuditorMode"
            type="success"
            plain
            :icon="DocumentAdd"
            @click="openImportNoteDialog"
            :disabled="isReadOnly"
        >
          导入笔记
        </el-button>

        <el-button
            v-if="!isAuditorMode"
            class="feishu-plain-btn"
            type="primary"
            plain
            :icon="Check"
            @click="handleGlobalSave"
            :loading="isSaving"
            :disabled="isReadOnly"
        >
          保存修改
        </el-button>
        <ExportMenu @export="handleMeetingExport" />
      </div>
    </header>

    <div class="top-player-section" v-if="meetingStore.currentMeeting?.audioUrl">
      <AudioPlayer
          ref="audioPlayerRef"
          :src="getFullAudioUrl(meetingStore.currentMeeting?.audioUrl)"
          :contents="meetingStore.contents"
          @timeupdate="onPlayerTimeUpdate"
      />
    </div>

    <main class="detail-content">
      <section class="transcript-section" :style="{ width: leftWidth + '%' }">
        <el-alert
            v-if="meetingStore.currentMeeting?.status === 1"
            title="排队中：当前 GPU 资源紧张，AI 正在排队准备识别..."
            type="warning"
            show-icon
        />

        <div style="padding: 12px 8% 0; display: flex; justify-content: flex-end;">
          <el-button
              v-if="!isReadOnly"
              size="small"
              type="primary"
              class="global-rename-btn"
              @click="globalRenameDialogVisible = true"
          >
            <el-icon><Edit /></el-icon> 全局角色重命名
          </el-button>
        </div>

        <div class="scroll-wrapper" ref="transcriptScroll">
          <SpeakerTimeline
              :contents="meetingStore.contents"
              :active-index="activeContentIndex"
              :is-processing="meetingStore.isProcessing"
              :highlight-keywords="keywords"
              :sensitive-keywords="sensitiveWords"
              :is-archived="isReadOnly"
              :is-auditor="isAuditorMode"
              @seek="handleJump"
              @convert-todo="handleConvertToTodo"
              @rename-speaker="handleSingleRenameSpeaker"
          />
        </div>
      </section>

      <el-dialog
          v-model="globalRenameDialogVisible"
          title="全局角色重命名"
          width="400px"
          align-center
      >
        <el-form label-width="100px" @submit.prevent>
          <el-form-item label="原说话人名称">
            <el-select
                v-model="renameForm.oldName"
                placeholder="请选择原说话人"
                style="width: 100%"
            >
              <el-option
                  v-for="speaker in uniqueSpeakers"
                  :key="speaker"
                  :label="speaker"
                  :value="speaker"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="新说话人名称">
            <el-input v-model="renameForm.newName" placeholder="例如: 张总" />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="globalRenameDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="executeGlobalRename">确认替换</el-button>
          </span>
        </template>
      </el-dialog>

      <div class="resize-handler" @mousedown="startResize">
        <div class="resize-line"></div>
      </div>

      <aside class="ai-aside">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="智能摘要" name="summary">
            <div class="summary-card">
              <h3 class="section-title">智能关键词</h3>
              <div class="keywords">
                <KeywordTag
                    v-for="tag in keywords"
                    :key="tag"
                    :text="tag"
                    @click="handleKeywordClick"
                />
              </div>

              <h3 class="section-title">全文深度总结</h3>
              <AIEditor
                  v-if="meetingStore.currentMeeting"
                  :meeting-id="meetingId"
                  :model-value="meetingStore.currentMeeting.fullSummary || ''"
                  :highlight-keywords="keywords"
                  :sensitive-keywords="sensitiveWords"
                  :is-archived="isReadOnly"
                  :is-auditor="isAuditorMode"
                  @update:model-value="meetingStore.currentMeeting.fullSummary = $event"
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="章节大纲" name="agenda">
            <AgendaList
                :agendas="meetingStore.agendas"
                :highlight-keywords="keywords"
                :sensitive-keywords="sensitiveWords"
                :is-archived="isReadOnly"
                :is-auditor="isAuditorMode"
                @jump="handleJump"
            />
          </el-tab-pane>

          <el-tab-pane label="智能待办" name="todo">
            <div class="todo-card" v-if="meetingStore.currentMeeting">
              <div class="todo-header">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <h3 class="section-title" style="margin: 0;">AI 提取待办</h3>
                  <el-checkbox
                      v-model="isAllSelected"
                      :indeterminate="isIndeterminate"
                      :disabled="isReadOnly"
                      @change="handleSelectAll"
                  >全选</el-checkbox>
                </div>
                <el-button
                    v-if="!isAuditorMode"
                    type="primary"
                    size="small"
                    @click="handleImportTodos"
                    :loading="isImporting"
                    :disabled="isReadOnly"
                >
                  <el-icon><Select /></el-icon> 确认导入
                </el-button>
              </div>

              <div class="todo-list" v-if="localTodos.length > 0">
                <div v-for="(todo, index) in localTodos" :key="index" class="todo-item-wrapper">
                  <el-checkbox v-model="todo.selected" class="todo-checkbox" :disabled="isReadOnly" />

                  <el-input
                      v-model="todo.text"
                      placeholder="请输入待办事项内容"
                      class="todo-input"
                      :readonly="isReadOnly"
                      @click.stop="isReadOnly && showArchiveMsg()"
                  >
                    <template #append>
                      <el-dropdown trigger="click" @command="(val: number) => todo.quadrant = val" :disabled="isReadOnly">
                        <span class="quadrant-trigger" :style="{ cursor: isReadOnly ? 'not-allowed' : 'pointer' }">
                          <span class="quadrant-dot" :style="{ backgroundColor: quadrantColors[todo.quadrant] }"></span>
                        </span>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item v-for="opt in quadrantOptions" :key="opt.value" :command="opt.value">
                              <span class="quadrant-dot" :style="{ backgroundColor: opt.color, marginRight: '8px' }"></span>
                              {{ opt.label }}
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>

                      <el-button @click="removeTodoItem(index)" :disabled="isReadOnly">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </template>
                  </el-input>
                </div>
              </div>

              <el-empty v-else description="暂无智能提取的待办事项" :image-size="60" />

              <el-button v-if="!isAuditorMode" class="add-todo-btn" type="primary" text @click="addTodoItem" :disabled="isReadOnly">
                <el-icon><Plus /></el-icon> 添加补充待办
              </el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </aside>
    </main>

    <el-dialog
        v-model="importNoteDialogVisible"
        title="导入为笔记"
        width="400px"
        align-center
    >
      <div style="margin-bottom: 20px;">
        <span style="display: block; margin-bottom: 8px; color: #606266;">选择存放的分类：</span>
        <el-select
            v-model="selectedCollectionId"
            placeholder="默认文件夹"
            style="width: 100%;"
            v-loading="isCollectionsLoading"
        >
          <el-option label="默认文件夹" :value="null" />
          <el-option
              v-for="col in noteCollections.filter(c => (c.id || c.collectionId) !== 0 && (c.id || c.collectionId) !== null)"
              :key="col.id || col.collectionId"
              :label="col.name || col.collectionName"
              :value="col.id || col.collectionId"
          />
        </el-select>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importNoteDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="isImportingNote" @click="handleConfirmImportNote">
            确认导入
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, reactive } from 'vue';
import { useRoute, onBeforeRouteLeave} from 'vue-router';
import { ElNotification, ElMessage, ElLoading, ElMessageBox} from 'element-plus';
import { useMeetingStore } from '@/store/meeting';
import { useUserStore } from '@/store/user';
import { meetingApi } from '@/api/meeting';

import { getNoteTree, addNote } from '@/api/note';

import { exportLocalTextFile, exportWordFile, exportPdfFile, type ExportData } from '@/utils/exportUtils';
import { formatTime } from '@/utils/timeFormat';

// 引入原有的图标，并新增 RefreshRight
import {Edit, Select, Delete, Plus, MagicStick, WarningFilled, DocumentAdd, Check, RefreshRight } from '@element-plus/icons-vue';

import SpeakerTimeline from '@/components/meeting/SpeakerTimeline.vue';
import AudioPlayer from '@/components/meeting/AudioPlayer.vue';
import AIEditor from '@/components/meeting/AIEditor.vue';
import KeywordTag from '@/components/meeting/KeywordTag.vue';
import AgendaList from '@/components/meeting/AgendaList.vue';
import StatusTag from '@/components/common/StatusTag.vue';
import ExportMenu from '@/components/common/ExportMenu.vue';
import router from "@/router";

const route = useRoute();
const meetingStore = useMeetingStore();
const userStore = useUserStore();

const meetingId = route.params.id as string;
const activeTab = ref('summary');
const transcriptScroll = ref<HTMLElement | null>(null);
const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null);
const currentPlayTime = ref(0);

// 响应式变量定义区
const isImporting = ref(false);
const isSaving = ref(false);
const isPartialSummaryLoading = ref(false);
const isRegenerating = ref(false);
const isPageLoading = ref(true);
const hasUnsavedChanges = ref(false);

// --- 全局重命名弹窗状态 ---
const globalRenameDialogVisible = ref(false);
const renameForm = reactive({
  oldName: '',
  newName: ''
});

// 计算出当前所有不重复的说话人名称（用于下拉框选择）
const uniqueSpeakers = computed(() => {
  if (!meetingStore.contents || meetingStore.contents.length === 0) return [];
  // 提取所有说话人并用 Set 去重
  const speakers = meetingStore.contents.map((item: any) => item.speaker).filter(Boolean);
  return Array.from(new Set(speakers));
});

const isArchived = computed(() => meetingStore.currentMeeting?.auditStatus === 1);

const isAuditorMode = computed(() => {
  const meetingUserId = meetingStore.currentMeeting?.userId;
  const currentLoginUserId = userStore.userInfo?.id;

  if (!meetingUserId || !currentLoginUserId) return false;
  return String(meetingUserId) !== String(currentLoginUserId);
});

const isReadOnly = computed(() => isArchived.value || isAuditorMode.value);

const showArchiveMsg = () => {
  if (isAuditorMode.value) {
    ElMessage.warning('审计只读模式，无法修改');
  } else {
    ElMessage.warning('该会议已归档，无法修改');
  }
};

const sensitiveWords = computed(() => (meetingStore as any).sensitiveWords || []);

const sensitiveWordCount = computed(() => {
  let count = 0;
  if (!sensitiveWords.value || sensitiveWords.value.length === 0) return 0;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const validWords = sensitiveWords.value.filter((k: string) => k.trim()).map(escapeRegExp);
  if (validWords.length === 0) return 0;

  const regex = new RegExp(`(${validWords.join('|')})`, 'gi');

  if (meetingStore.contents) {
    meetingStore.contents.forEach((item: any) => {
      const matches = item.content?.match(regex);
      if (matches) count += matches.length;
    });
  }

  if (meetingStore.currentMeeting?.fullSummary) {
    const matches = meetingStore.currentMeeting.fullSummary.match(regex);
    if (matches) count += matches.length;
  }

  if (meetingStore.agendas) {
    meetingStore.agendas.forEach((item: any) => {
      const matchTitle = item.title?.match(regex);
      if (matchTitle) count += matchTitle.length;

      const matchSummary = item.summary?.match(regex);
      if (matchSummary) count += matchSummary.length;
    });
  }

  return count;
});

let saveCountTimer: any = null;
watch(sensitiveWordCount, (newVal, oldVal) => {
  if (newVal === oldVal || isAuditorMode.value) return;
  if (saveCountTimer) clearTimeout(saveCountTimer);

  saveCountTimer = setTimeout(async () => {
    try {
      await meetingApi.updateSensitiveCount(meetingId, newVal);
    } catch (e) {
      console.error('同步敏感词数量失败', e);
    }
  }, 2000);
});

const leftWidth = ref(60);
const isResizing = ref(false);

const startResize = (e: MouseEvent) => {
  isResizing.value = true;
  document.body.style.cursor = 'col-resize';
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing.value) return;
  const container = document.querySelector('.detail-content') as HTMLElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

  if (newWidth < 30) newWidth = 30;
  if (newWidth > 80) newWidth = 80;

  leftWidth.value = newWidth;
};

const stopResize = () => {
  isResizing.value = false;
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopResize);
};

interface LocalTodo {
  text: string;
  selected: boolean;
  quadrant: number;
}
const localTodos = ref<LocalTodo[]>([]);

const quadrantColors: Record<number, string> = {
  1: '#F56C6C', 2: '#E6A23C', 3: '#409EFF', 4: '#909399'
};

const quadrantOptions = [
  { value: 1, label: '重要且紧急', color: '#F56C6C' },
  { value: 2, label: '重要不紧急', color: '#E6A23C' },
  { value: 3, label: '紧急不重要', color: '#409EFF' },
  { value: 4, label: '不重要不紧急', color: '#909399' }
];

watch(() => meetingStore.currentMeeting?.aiTodos, (newTodos) => {
  if (newTodos && localTodos.value.length === 0) {
    localTodos.value = newTodos.map((text: string) => ({ text, selected: true, quadrant: 4 }));
  }
}, { immediate: true });

const keywords = computed(() => meetingStore.currentMeeting?.aiKeywords?.split(',') || []);
const activeContentIndex = computed(() => {
  if (!meetingStore.contents || !Array.isArray(meetingStore.contents)) return -1;
  return meetingStore.contents.findIndex(item =>
      currentPlayTime.value >= item.startTime && currentPlayTime.value < item.endTime
  );
});

watch(activeContentIndex, (newIdx) => {
  if (newIdx !== -1 && transcriptScroll.value) {
    const activeEls = transcriptScroll.value.querySelectorAll('.bubble-item');
    const activeEl = activeEls[newIdx] as HTMLElement;
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

watch(() => meetingStore.contents.length, () => {
  if (meetingStore.isProcessing) {
    nextTick(() => {
      if (transcriptScroll.value) {
        transcriptScroll.value.scrollTop = transcriptScroll.value.scrollHeight;
      }
    });
  }
});

watch(
    [
      () => meetingStore.currentMeeting?.fullSummary,
      () => meetingStore.contents,
      () => localTodos.value
    ],
    () => {
      if (!isPageLoading.value && !isReadOnly.value) {
        hasUnsavedChanges.value = true;
      }
    },
    { deep: true }
);

onMounted(async () => {
  if (!meetingId) return;
  meetingStore.clearMeetingDetail();
  isPageLoading.value = true;
  hasUnsavedChanges.value = false;

  try {
    const res: any = await meetingApi.getDetail(meetingId);

    if (res.code === 200) {
      meetingStore.setMeetingDetail(res.data);
      meetingStore.initSocketListeners();

      nextTick(() => {
        if (isAuditorMode.value) return;
        const dbCount = meetingStore.currentMeeting?.sensitiveWordCount || 0;

        if (sensitiveWordCount.value !== dbCount) {
          meetingApi.updateSensitiveCount(meetingId, sensitiveWordCount.value);
        }

        setTimeout(() => {
          hasUnsavedChanges.value = false;
        }, 500);
      });
    } else {
      throw new Error(res.msg || '获取详情失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取详情失败');
    setTimeout(() => {
      router.replace('/meeting/list');
    }, 1000);
  } finally {
    isPageLoading.value = false;
  }
});

const importNoteDialogVisible = ref(false);
const isCollectionsLoading = ref(false);
const isImportingNote = ref(false);
const noteCollections = ref<any[]>([]);
const selectedCollectionId = ref<number | null>(null);

const openImportNoteDialog = async () => {
  if (!meetingStore.currentMeeting) {
    return ElMessage.warning('会议数据未就绪');
  }
  importNoteDialogVisible.value = true;
  selectedCollectionId.value = null;

  if (noteCollections.value.length === 0) {
    isCollectionsLoading.value = true;
    try {
      const res: any = await getNoteTree();
      if (res.code === 200) {
        noteCollections.value = res.data || [];
      }
    } catch (e) {
      console.error('获取分类失败', e);
      ElMessage.warning('未能获取分类列表，仅能保存到默认分类');
    } finally {
      isCollectionsLoading.value = false;
    }
  }
};

const handleConfirmImportNote = async () => {
  const meeting = meetingStore.currentMeeting;
  if (!meeting) return;

  isImportingNote.value = true;

  let htmlContent = `<h2><span style="color: #337ecc;">【AI 摘要】</span></h2><p style="color: #1f2329;">${meeting.fullSummary ? meeting.fullSummary.replace(/\n/g, '<br>') : '暂无摘要'}</p>`;

  htmlContent += `<h2><span style="color: #337ecc;">【章节纪要】</span></h2>`;
  if (meetingStore.agendas && meetingStore.agendas.length > 0) {
    meetingStore.agendas.forEach(a => {
      htmlContent += `<h4 style="margin-bottom: 5px;">[${formatTime(Number(a.timestamp) || 0)}] ${a.title}</h4>`;
      htmlContent += `<p style="margin-top: 0; color: #555;">${a.summary ? a.summary.replace(/\n/g, '<br>') : ''}</p>`;
    });
  } else {
    htmlContent += `<p>暂无章节纪要</p>`;
  }

  htmlContent += `<h2><span style="color: #337ecc;">【逐字稿详情】</span></h2>`;
  if (meetingStore.contents && meetingStore.contents.length > 0) {
    meetingStore.contents.forEach(c => {
      htmlContent += `<p><span style="color: #909399; font-size: 13px;">[${formatTime(c.startTime)}]</span> <strong style="color: #1f2329;">${c.speaker}：</strong>${c.content}</p>`;
    });
  } else {
    htmlContent += `<p>暂无逐字稿记录</p>`;
  }

  const notePayload: any = {
    title: meeting.title + ' (会议纪要)',
    content: htmlContent,
    collectionId: selectedCollectionId.value,
    isTop: 0,
    sourceMeetingId: Number(meetingId)
  };

  try {
    const res: any = await addNote(notePayload);
    if (res.code === 200) {
      ElNotification.success('导入笔记成功，可前往笔记库查看');
      importNoteDialogVisible.value = false;
    } else {
      ElMessage.error(res.msg || '导入失败');
    }
  } catch (error) {
    ElMessage.error('导入出错，请稍后重试');
  } finally {
    isImportingNote.value = false;
  }
};

const handleMeetingExport = async (format: string) => {
  if (!meetingStore.currentMeeting) {
    return ElMessage.warning('会议数据尚未加载完成');
  }

  const meeting = meetingStore.currentMeeting;
  const fileName = `${meeting.title}_全案纪要`;

  const exportData: ExportData = {
    title: meeting.title || '未命名会议',
    summary: meeting.fullSummary || '',
    agendas: meetingStore.agendas || [],
    contents: meetingStore.contents || []
  };

  try {
    if (format === 'txt' || format === 'md') {
      exportLocalTextFile(exportData, fileName, format);
      ElMessage.success(`${format.toUpperCase()} 导出成功`);

    } else if (format === 'docx') {
      const loading = ElLoading.service({ text: '正在生成 Word 文档，请稍候...' });
      await exportWordFile(exportData, fileName);
      loading.close();
      ElMessage.success('Word 导出成功');

    } else if (format === 'pdf') {
      const loading = ElLoading.service({ text: '正在渲染 PDF，可能会有短暂卡顿...' });
      setTimeout(() => {
        exportPdfFile(exportData, fileName);
        loading.close();
        ElMessage.success('PDF 导出成功');
      }, 100);
    }
  } catch (error) {
    console.error('导出异常:', error);
    ElMessage.error('文档生成失败，请刷新页面重试');
  }
};

const handleJump = (timestamp: number) => audioPlayerRef.value?.seek(timestamp);
const onPlayerTimeUpdate = (time: number) => { currentPlayTime.value = time; };
const handleKeywordClick = (val: string) => console.log('搜索关键词:', val);

const handleConvertToTodo = (content: string) => {
  localTodos.value.push({ text: content, selected: true, quadrant: 4 });
  activeTab.value = 'todo';
  ElNotification.success({ title: '已加入暂存区', message: '请确认后统一导入' });
};

const getFullAudioUrl = (path?: string) => {
  if (!path) return '';
  const baseURL = import.meta.env.VITE_APP_BASE_API || 'http://localhost:8080';
  return path.startsWith('http') ? path : baseURL + path;
};

const removeTodoItem = (index: number) => localTodos.value.splice(index, 1);
const addTodoItem = () => localTodos.value.push({ text: '', selected: true, quadrant: 4 });

const handleImportTodos = async () => {
  const selectedTodos = localTodos.value.filter(item => item.selected && item.text.trim() !== '');
  if (selectedTodos.length === 0) {
    ElMessage.warning('请至少勾选一项有效待办');
    return;
  }
  isImporting.value = true;
  try {
    const todoListPayload = selectedTodos.map(item => ({ text: item.text, quadrant: item.quadrant }));
    await meetingApi.importTodos({ meetingId: Number(meetingId), todoList: todoListPayload });
    ElNotification.success('导入成功，已分发至待办四象限！');
  } catch (error) {
    ElNotification.error('导入失败，请稍后重试');
  } finally {
    isImporting.value = false;
  }
};

const handleGlobalSave = async () => {
  if (!meetingStore.currentMeeting) return;
  isSaving.value = true;
  try {
    const textsToSave = localTodos.value.map(t => t.text).filter(t => t.trim() !== '');
    await meetingApi.saveMeetingData(meetingId, {
      fullSummary: meetingStore.currentMeeting.fullSummary,
      aiTodos: textsToSave,
      contents: meetingStore.contents,
      agendas: meetingStore.agendas
    });
    ElMessage.success('会议全案数据已成功保存至云端');
    hasUnsavedChanges.value = false;
  } catch (error) {
    ElMessage.error('保存失败，请检查网络或重试');
  } finally {
    isSaving.value = false;
  }
};

const isAllSelected = computed({
  get: () => localTodos.value.length > 0 && localTodos.value.every(t => t.selected),
  set: (val) => { localTodos.value.forEach((t: LocalTodo) => t.selected = !!val); }
});

const isIndeterminate = computed(() => {
  const selectedCount = localTodos.value.filter(t => t.selected).length;
  return selectedCount > 0 && selectedCount < localTodos.value.length;
});

const handleSelectAll = (val: string | number | boolean) => {
  localTodos.value.forEach((t: LocalTodo) => t.selected = !!val);
};

const handleSingleRenameSpeaker = () => {
  if (isReadOnly.value) return;
  hasUnsavedChanges.value = true;
  ElMessage.success('已修改该段发言人');
};

const executeGlobalRename = () => {
  const { oldName, newName } = renameForm;
  if (!oldName.trim() || !newName.trim() || oldName === newName) {
    ElMessage.warning('名称填写无效');
    return;
  }

  let count = 0;
  meetingStore.contents.forEach((item: any) => {
    if (item.speaker === oldName) {
      item.speaker = newName;
      count++;
    }
  });

  if (count > 0) {
    hasUnsavedChanges.value = true;
    ElMessage.success(`已将全局 ${count} 处 "${oldName}" 修改为 "${newName}"`);
    globalRenameDialogVisible.value = false;
    renameForm.oldName = '';
    renameForm.newName = '';
  } else {
    ElMessage.warning(`未找到名为 "${oldName}" 的说话人记录`);
  }
};

const handleRequestPartialSummary = async () => {
  isPartialSummaryLoading.value = true;
  try {
    await meetingApi.requestPartialSummary(meetingId);
    ElNotification({
      title: '请求成功',
      message: 'AI 正在插队为您生成当前阶段纪要，语音识别将暂时挂起...',
      type: 'success',
      duration: 5000
    });
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败');
  } finally {
    isPartialSummaryLoading.value = false;
  }
};

const handleRegenerateSummary = async () => {
  if (typeof meetingApi.regenerateSummary !== 'function') {
    ElMessage.warning('API 尚未实现，请先去 src/api/meeting.ts 添加 regenerateSummary 方法');
    return;
  }

  isRegenerating.value = true;
  try {
    await meetingApi.regenerateSummary(meetingId);
    ElNotification({
      title: '任务已下发',
      message: 'AI 正在重新生成最终纪要，页面将通过 WebSocket 实时更新结果，请稍候...',
      type: 'success',
      duration: 5000
    });
  } catch (error: any) {
    ElMessage.error(error.message || '请求重新生成失败');
  } finally {
    isRegenerating.value = false;
  }
};

onBeforeRouteLeave(async () => {
  if (hasUnsavedChanges.value && !isReadOnly.value) {
    try {
      const action = await ElMessageBox.confirm(
          '您有未保存的修改，请选择如何处理？',
          '未保存提示',
          {
            distinguishCancelAndClose: true,
            confirmButtonText: '保存并退出',
            cancelButtonText: '放弃修改并退出',
            type: 'warning',
          }
      );

      if (action === 'confirm') {
        await handleGlobalSave();
        return true;
      }

    } catch (action) {
      if (action === 'cancel') {
        return true;
      }

      return false;
    }
  }

  return true;
});

</script>

<style lang="scss" scoped>
@import '@/assets/styles/feishu-theme.scss';

/* 新增：全局角色重命名按钮的常态高亮及飞书风格动效 */
.global-rename-btn {
  box-shadow: 0 2px 8px rgba(51, 126, 204, 0.4);
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(51, 126, 204, 0.6);
  }
}

.meeting-detail-container {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

  .detail-header {
    height: 60px;
    flex-shrink: 0;
    padding: 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border-bottom: 1px solid #dee0e3;
    z-index: 10;

    .left {
      display: flex;
      align-items: center;
      gap: 12px;
      .title { margin: 0; font-size: 18px; }
    }

    .right {
      display: flex;
      align-items: center;
      gap: 12px;

      :deep(.el-button) {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      :deep(.feishu-plain-btn) {
        background-color: var(--el-color-primary-light-9) !important;
        border-color: var(--el-color-primary-light-7) !important;
        color: var(--el-color-primary) !important;
        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

        &:hover, &:focus {
          background-color: var(--el-color-primary) !important;
          border-color: var(--el-color-primary) !important;
          color: #ffffff !important;
        }

        &.is-disabled {
          background-color: var(--el-color-info-light-9) !important;
          border-color: var(--el-color-info-light-8) !important;
          color: var(--el-color-info-light-5) !important;
        }
      }
    }
  }

  .top-player-section {
    flex-shrink: 0;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    z-index: 5;
    background: #fff;
  }

  .detail-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: row;
    overflow: hidden;

    .transcript-section {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #fff;
      border-right: 1px solid #dee0e3;

      .scroll-wrapper {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 24px 8%;
      }
    }

    .resize-handler {
      width: 6px;
      flex-shrink: 0;
      background: #f5f6f7;
      cursor: col-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      &:hover, &:active {
        background: #e8f3ff;
        .resize-line { background: #337ecc; }
      }

      .resize-line {
        width: 2px;
        height: 30px;
        background: #c9cdd4;
        border-radius: 2px;
        transition: background 0.2s;
      }
    }

    .ai-aside {
      flex: 1;
      min-width: 0;
      height: 100%;
      background: #fff;
      padding: 0 20px;
      overflow-y: auto;

      .section-title { font-size: 15px; font-weight: 600; margin: 24px 0 12px; color: #1f2329; }
      .keywords { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }

      .todo-card {
        padding: 10px 0;

        .todo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 16px 0;
        }

        .todo-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;

          .todo-item-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;

            .todo-checkbox {
              margin-right: 0;
            }

            .todo-input {
              flex: 1;

              :deep(.el-input-group__append) {
                padding: 0 !important;
                display: flex !important;
                align-items: stretch;
                width: auto;

                .quadrant-trigger {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 0 12px;
                  border-right: 1px solid var(--el-border-color);
                  transition: background-color 0.2s;

                  &:hover { background-color: var(--el-fill-color-light); }
                }

                .el-button {
                  margin: 0 !important;
                  border: none !important;
                  border-radius: 0 !important;
                  padding: 0 12px !important;
                  height: auto !important;
                  background-color: transparent !important;
                  transition: color 0.2s;

                  &:hover {
                    color: #f56c6c !important;
                    background-color: var(--el-fill-color-light) !important;
                  }
                }
              }
            }
          }
        }

        .add-todo-btn {
          width: 100%;
          border: 1px dashed #dee0e3;
          margin-top: 8px;
          &:hover { border-color: var(--el-color-primary); }
        }
      }

      .quadrant-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    }
  }
}
</style>