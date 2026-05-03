import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
// @ts-ignore (忽略 html2pdf.js 缺乏官方 TS 声明文件的警告)
import html2pdf from 'html2pdf.js';
import { formatTime } from './timeFormat'; // 引入已有的时间格式化工具

// ==================== 会议专属导出逻辑 ====================
/**
 * 统一定义导出所需的数据结构
 */
export interface ExportData {
    title: string;
    summary: string;
    agendas: { timestamp: string | number; title: string; summary: string }[];
    contents: { startTime: number; speaker: string; content: string }[];
}

/**
 * 1. 导出纯文本格式 (txt / md)
 */
export const exportLocalTextFile = (data: ExportData, fileName: string, format: 'txt' | 'md') => {
    let content = `会议主题：${data.title}\n导出时间：${new Date().toLocaleString()}\n`;
    content += `------------------------------------------\n\n`;

    content += `【AI 摘要】\n${data.summary || '暂无摘要'}\n\n`;

    content += `【章节纪要】\n`;
    if (data.agendas && data.agendas.length > 0) {
        data.agendas.forEach(a => {
            content += `> [${formatTime(Number(a.timestamp) || 0)}] ${a.title}\n  ${a.summary}\n\n`;
        });
    } else {
        content += `暂无章节纪要\n\n`;
    }

    content += `【逐字稿详情】\n`;
    if (data.contents && data.contents.length > 0) {
        data.contents.forEach(c => {
            content += `[${formatTime(c.startTime)}] ${c.speaker}: ${c.content}\n`;
        });
    } else {
        content += `暂无逐字稿记录\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${fileName}.${format}`);
};

/**
 * 2. 导出 Word 文档 (.docx)
 */
export const exportWordFile = async (data: ExportData, fileName: string) => {
    // 构建文档子元素集合
    const children: any[] = [
        new Paragraph({ text: data.title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `导出时间：${new Date().toLocaleString()}`, spacing: { after: 400 } }),

        new Paragraph({ text: "【AI 摘要】", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: data.summary || "暂无摘要" }),

        new Paragraph({ text: "【章节纪要】", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
    ];

    if (data.agendas && data.agendas.length > 0) {
        data.agendas.forEach(a => {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `[${formatTime(Number(a.timestamp) || 0)}] ${a.title}`, bold: true })
                ]
            }));
            children.push(new Paragraph({ text: a.summary || '', spacing: { after: 200 } }));
        });
    } else {
        children.push(new Paragraph({ text: "暂无章节纪要" }));
    }

    children.push(new Paragraph({ text: "【逐字稿详情】", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
    if (data.contents && data.contents.length > 0) {
        data.contents.forEach(c => {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `[${formatTime(c.startTime)}] `, color: "909399" }),
                    new TextRun({ text: `${c.speaker}: `, bold: true, color: "1f2329" }),
                    new TextRun({ text: c.content })
                ],
                spacing: { after: 120 }
            }));
        });
    } else {
        children.push(new Paragraph({ text: "暂无逐字稿记录" }));
    }

    const doc = new Document({
        sections: [{ properties: {}, children: children }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

/**
 * 3. 导出 PDF 文件 (.pdf)
 */
export const exportPdfFile = (data: ExportData, fileName: string) => {
    // 拼接一段带有基本 CSS 样式的 HTML 模板，用于给 html2pdf 渲染
    const htmlContent = `
    <div style="padding: 20px; font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif; color: #333;">
      <h1 style="text-align: center; color: #1f2329; margin-bottom: 10px;">${data.title}</h1>
      <p style="color: #8f959e; font-size: 12px; text-align: center; margin-top: 0;">导出时间：${new Date().toLocaleString()}</p>
      <hr style="border: none; border-top: 1px solid #dee0e3; margin: 20px 0;" />

      <h2 style="color: #337ecc; border-bottom: 2px solid #337ecc; padding-bottom: 5px; margin-top: 30px;">【AI 摘要】</h2>
      <p style="line-height: 1.6; white-space: pre-wrap;">${data.summary || '暂无摘要'}</p>

      <h2 style="color: #337ecc; border-bottom: 2px solid #337ecc; padding-bottom: 5px; margin-top: 30px;">【章节纪要】</h2>
      ${data.agendas && data.agendas.length > 0 ? data.agendas.map(a => `
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 5px 0; color: #1f2329;">[${formatTime(Number(a.timestamp) || 0)}] ${a.title}</h4>
          <p style="margin: 0; color: #555; line-height: 1.5; white-space: pre-wrap;">${a.summary}</p>
        </div>
      `).join('') : '<p>暂无章节纪要</p>'}

      <h2 style="color: #337ecc; border-bottom: 2px solid #337ecc; padding-bottom: 5px; margin-top: 30px;">【逐字稿详情】</h2>
      ${data.contents && data.contents.length > 0 ? data.contents.map(c => `
        <p style="margin-bottom: 10px; line-height: 1.5;">
          <span style="color: #909399; font-size: 13px;">[${formatTime(c.startTime)}]</span>
          <strong style="color: #1f2329;">${c.speaker}:</strong>
          <span style="color: #333;">${c.content}</span>
        </p>
      `).join('') : '<p>暂无逐字稿记录</p>'}
    </div>
  `;

    const opt: any = {
        margin:       10, // 边距 mm
        filename:     `${fileName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, // scale = 2 提升截图清晰度
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // 防止分页时元素被拦腰截断
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(htmlContent).save();
};



// ==================== 笔记专属导出逻辑 ====================

export interface NoteExportData {
    title: string;
    contentHtml: string;
    contentText: string;
}
/**
 * 笔记导出：纯文本/MD
 */
export const exportNoteTextFile = (data: NoteExportData, fileName: string, format: 'txt' | 'md') => {
    const content = `# ${data.title}\n\n${data.contentText}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${fileName}.${format}`);
};

/**
 * 笔记导出：Word (.docx)
 */
export const exportNoteWordFile = async (data: NoteExportData, fileName: string) => {
    const children: any[] = [
        new Paragraph({ text: data.title, heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
    ];

    // 简单处理：将富文本纯文本化按行分割写入 Word
    data.contentText.split('\n').forEach(line => {
        if (line.trim()) {
            children.push(new Paragraph({ text: line, spacing: { after: 120 } }));
        }
    });

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

/**
 * 笔记导出：PDF (.pdf)
 */
export const exportNotePdfFile = (data: NoteExportData, fileName: string) => {
    const htmlContent = `
    <div style="padding: 20px; font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', sans-serif; color: #333;">
      <h1 style="text-align: center; color: #1f2329;">${data.title}</h1>
      <hr style="border: none; border-top: 1px solid #dee0e3; margin: 20px 0;" />
      <div style="line-height: 1.6;">${data.contentHtml}</div>
    </div>
  `;

    const opt: any = {
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // 富文本内容中，避免段落被切断
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(htmlContent).save();
};