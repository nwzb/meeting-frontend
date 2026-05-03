// src/types/ai.d.ts

/**
 * AI 实时逐字稿切片回调 (对应后端 AiSliceCallbackDTO)
 */
export interface AiSliceCallbackDTO {
    meetingId: string | number;
    type: 'ASR_UPDATE';
    start: number; // 毫秒 (注意：后端传过来的是毫秒，前端展示时可除以1000)
    end: number;   // 毫秒
    speaker: string;
    text: string;
}

// 章节结构子接口
export interface AiChapterDTO {
    topic: string;
    content: string;
    timestamp: number;
}

/**
 * AI 阶段性/最终总结回调 (对应后端 AiSummaryCallbackDTO)
 */
export interface AiSummaryCallbackDTO {
    meetingId: string | number;
    type: 'PARTIAL_SUMMARY' | 'FINAL_SUMMARY';
    title?: string;               // LLM 提取的建议标题
    summary: string;              // 核心内容摘要
    keywords: string[];           // 字符串数组
    chapters: AiChapterDTO[];     // 【关键修改】：从 agenda 改为 chapters

    // 【关键修改】：与 Java 端的 List<String> 完全对齐
    actionItems?: string[];
    action_items?: string[]; // 加上兼容字段，防止 JSON 转换时变成下划线
}

/**
 * 联合类型：方便 WebSocket 统一接收
 */
export type AiCallbackMessage = AiSliceCallbackDTO | AiSummaryCallbackDTO;