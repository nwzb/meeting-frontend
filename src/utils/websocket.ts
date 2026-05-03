// src/utils/websocket.ts
import type { AiCallbackMessage } from '../types/ai';

type MessageHandler = (data: any) => void;

class SocketService {
    private ws: WebSocket | null = null;
    private userId: string | number = '';
    private handlers: Map<string, MessageHandler[]> = new Map();

    // 重连配置
    private reconnectTimer: any = null;
    private reconnectCount: number = 0;
    private maxReconnectCount: number = 5;

    // 心跳配置
    private heartTimer: any = null; // 发送心跳的定时器
    private serverTimer: any = null; // 等待响应的定时器

    /**
     * 初始化连接
     * @param userId 用户ID (从 Pinia Store 中获取)
     */
    public connect(userId: number | string) {
        if (!userId) return;

        // 如果已经连上了，且还是同一个用户，就不要再重连了
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.userId === userId) {
            return;
        }

        this.userId = userId;

        // 如果已有连接（但状态不是 OPEN），则先彻底清理旧连接
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.close();
        }

        // 这里的端口和路径需与后端 MeetingWebSocketServer 对应
        const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
        const url = `${baseUrl}/websocket/meeting/${this.userId}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('【WebSocket】连接成功, 用户ID:', this.userId);
            this.reconnectCount = 0;
            this.resetHeartbeat(); // 开始心跳周期
        };

        this.ws.onmessage = (event) => {
            const data = event.data;

            // 1. 响应心跳回包
            if (data === 'pong') {
                this.resetHeartbeat();
                return;
            }

            // 2. 解析业务消息
            try {
                const message = JSON.parse(data) as AiCallbackMessage | any;
                // 后端推过来的结构中含有 type (如 ASR_UPDATE, FINAL_SUMMARY, TODO_REMIND)
                const type = message.type || 'default';
                this.emit(type, message);
            } catch (error) {
                console.warn('【WebSocket】收到非 JSON 格式消息:', data);
            }
        };

        this.ws.onclose = (e) => {
            console.warn('【WebSocket】连接已断开:', e.reason);
            this.stopHeartbeat();
            this.reconnect();
        };

        this.ws.onerror = (err) => {
            console.error('【WebSocket】连接发生错误:', err);
        };
    }

    /**
     * 注册事件监听 (在 .vue 组件的 onMounted 中使用)
     */
    public on(type: string, handler: MessageHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type)?.push(handler);
    }

    /**
     * 移除监听 (在 .vue 组件的 onUnmounted 中使用，防止内存泄漏)
     */
    public off(type: string, handler: MessageHandler) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) handlers.splice(index, 1);
        }
    }

    private emit(type: string, data: any) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    /**
     * 断线重连
     */
    private reconnect() {
        if (this.reconnectCount >= this.maxReconnectCount) {
            console.error('【WebSocket】超过最大重连次数，请检查网络或重新登录');
            return;
        }

        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectCount++;
            console.log(`【WebSocket】正在尝试第 ${this.reconnectCount} 次重连...`);
            this.connect(this.userId);
        }, 5000); // 5秒后重连
    }

    /**
     * 心跳保活逻辑
     */
    private resetHeartbeat() {
        this.stopHeartbeat();

        // 1. 开启定时器，20秒发一次 ping
        this.heartTimer = setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send('ping');

                // 2. 发出 ping 后，10秒内必须收到 pong，否则判定为断网
                this.serverTimer = setTimeout(() => {
                    console.warn('【WebSocket】心跳响应超时，主动关闭重连');
                    this.ws?.close();
                }, 10000);
            }
        }, 20000);
    }

    private stopHeartbeat() {
        if (this.heartTimer) clearTimeout(this.heartTimer);
        if (this.serverTimer) clearTimeout(this.serverTimer);
    }

    /**
     * 手动关闭连接 (退出登录时使用)
     */
    public close() {
        this.userId = '';
        this.reconnectCount = this.maxReconnectCount; // 阻止自动重连
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.onclose = null; // 清除事件，防止触发 reconnect
            this.ws.close();
            this.ws = null;
        }
    }
}

const socketService = new SocketService();
export default socketService;