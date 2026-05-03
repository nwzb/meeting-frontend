// 对应后端的 NoteCollectionDTO
export interface NoteCollection {
    id?: number;
    name: string;
    sortOrder: number;
}

// 对应后端的 NoteVO / NoteDTO
export interface Note {
    id?: number;
    collectionId?: number | null;
    title: string;
    content: string;
    isTop: number; // 0-否, 1-是
    sortOrder?: number;
    sourceMeetingId?: number | null;
    createTime?: string;
    updateTime?: string;
}

// 对应后端的 NoteTreeVO
export interface NoteTreeItem {
    collectionId: number;
    collectionName: string;
    sortOrder: number;
    notes: Note[];
}
