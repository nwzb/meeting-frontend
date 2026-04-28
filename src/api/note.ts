import request from '@/utils/request';
import type { NoteCollection, Note, NoteTreeItem } from '@/types/note';

// ----------------- 分类管理 -----------------
export const addCollection = (data: NoteCollection) => {
    return request.post('/api/note/collection', data);
};

export const updateCollection = (data: NoteCollection) => {
    return request.put('/api/note/collection', data);
};

export const deleteCollection = (id: number) => {
    return request.delete(`/api/note/collection/${id}`);
};

// ----------------- 笔记管理 -----------------
export const getNoteTree = () => {
    return request.get<NoteTreeItem[]>('/api/note/tree');
};

export const getNoteDetail = (id: number) => {
    return request.get<Note>(`/api/note/${id}`);
};

export const addNote = (data: Note) => {
    return request.post('/api/note', data);
};

export const updateNote = (data: Note) => {
    return request.put('/api/note', data);
};

export const deleteNote = (id: number) => {
    return request.delete(`/api/note/${id}`);
};
