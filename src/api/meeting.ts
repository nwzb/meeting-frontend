import request from '@/utils/request';

export const meetingApi = {
    // 对应后端 @GetMapping("/list") -> /api/meeting/list
    getList: (params: any) => request.get('/api/meeting/list', { params }),

    // 对应后端 @GetMapping("/topic-libraries")
    getTopicLibraries() {
        return request({
            url: '/api/meeting/topic-libraries',
            method: 'get'
        });
    },

    // 对应后端 @GetMapping("/{id}/detail") -> /api/meeting/123/detail
    getDetail: (id: number | string) => request.get(`/api/meeting/${id}/detail`),

    // 对应后端 @PostMapping("/upload")
    uploadAudio: (formData: FormData) => request.post('/api/meeting/upload', formData),

    // 对应后端 @PostMapping("/{id}/request-summary")
    triggerSummary: (id: number | string) => request.post(`/api/meeting/${id}/request-summary`),

    // 对应后端 @PutMapping("/{id}/summary")
    updateSummary: (id: string | number, summary: string) =>
        request.put(`/api/meeting/${id}/summary`, { summary }),

    // 对应后端 @PostMapping("/import-todos")
    importTodos: (data: { meetingId: number; todoList: { text: string; quadrant: number }[] }) =>
        request.post('/api/meeting/import-todos', data),

    // 对应后端 @PutMapping("/{id}/save")
    saveMeetingData: (id: string | number, data: {
        fullSummary?: string;
        aiTodos?: string[];
        contents?: any[]; // 兼容逐字稿数组
        agendas?: any[];  // 兼容章节数组
    }) => request.put(`/api/meeting/${id}/save`, data),

    deleteMeeting: (id: string | number) => request.delete(`/api/meeting/${id}`),

    //请求插队
    requestPartialSummary(id: string | number) {
        return request.post(`/api/meeting/${id}/partial-summary`);
    },

    // 对应后端 @PutMapping("/{id}/sensitive-count?count=xxx")
    updateSensitiveCount(id: string | number, count: number) {
        return request.put(`/api/meeting/${id}/sensitive-count`, null, {
            params: { count }
        });
    },

    // 请求重新生成完整摘要
    // 对应后端 @PostMapping("/{id}/regenerate-summary")
    regenerateSummary(id: string | number) {
        return request.post(`/api/meeting/${id}/regenerate-summary`);
    }
};
