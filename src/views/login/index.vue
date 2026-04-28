<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="@/assets/images/logo.png" alt="Logo" class="logo" />
        <h2>{{ isLogin ? '登录智能会议' : '创建新账号' }}</h2>
        <p>{{ isLogin ? '让每一场会议都有迹可循' : '开启高效办公新体验' }}</p>
      </div>

      <el-form :model="authForm" :rules="rules" ref="loginRef" size="large">
        <el-form-item prop="username">
          <el-input v-model="authForm.username" placeholder="请输入用户名" :prefix-icon="UserIcon" />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
              v-model="authForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="LockIcon"
              show-password
              @keyup.enter="isLogin ? handleSubmit() : null"
          />
        </el-form-item>

        <template v-if="!isLogin">
          <el-form-item prop="confirmPassword">
            <el-input
                v-model="authForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                :prefix-icon="LockIcon"
                show-password
            />
          </el-form-item>

          <el-form-item prop="captcha">
            <div class="captcha-row">
              <el-input
                  v-model="authForm.captcha"
                  placeholder="请输入验证码"
                  :prefix-icon="KeyIcon"
                  @keyup.enter="handleSubmit"
              />
              <canvas
                  ref="captchaCanvas"
                  width="110"
                  height="40"
                  class="captcha-canvas"
                  @click="drawCaptcha"
                  title="点击刷新验证码"
              ></canvas>
            </div>
          </el-form-item>
        </template>

        <el-button
            type="primary"
            class="submit-btn"
            :loading="loading"
            @click="handleSubmit"
        >
          {{ isLogin ? '立即登录' : '立即注册' }}
        </el-button>

        <div class="footer-links">
          <span v-if="isLogin">
            没有账号？<el-link type="primary" @click="toggleMode(false)">立即注册</el-link>
          </span>
          <span v-else>
            已有账号？<el-link type="primary" @click="toggleMode(true)">返回登录</el-link>
          </span>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue';
import { useUserStore } from '@/store/user';
import { registerApi } from '@/api/auth';
// 导入图标，新增 Key 图标用于验证码
import { User as UserIcon, Lock as LockIcon, Key as KeyIcon } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 1. 状态定义
const userStore = useUserStore();
const isLogin = ref(true);
const loading = ref(false);
const loginRef = ref<any>(null);
const captchaCanvas = ref<HTMLCanvasElement | null>(null);
const actualCaptcha = ref(''); // 存储真实的验证码字符串

// 2. 表单数据扩展
const authForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  captcha: ''
});

// 3. 自定义校验逻辑
const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== authForm.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const validateCaptcha = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请输入验证码'));
  } else if (value.toLowerCase() !== actualCaptcha.value.toLowerCase()) {
    callback(new Error('验证码错误'));
  } else {
    callback();
  }
};

// 4. 校验规则
const rules = reactive({
  username: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
  captcha: [{ required: true, validator: validateCaptcha, trigger: 'blur' }]
});

// 5. 纯前端图形验证码绘制逻辑
const drawCaptcha = () => {
  if (!captchaCanvas.value) return;
  const ctx = captchaCanvas.value.getContext('2d');
  if (!ctx) return;

  const width = captchaCanvas.value.width;
  const height = captchaCanvas.value.height;

  // 清空画布
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f5f7fa';
  ctx.fillRect(0, 0, width, height);

  // 随机生成 4 位字符 (去掉容易混淆的 o, O, 0, i, I, 1)
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  actualCaptcha.value = code;

  // 绘制文字
  for (let i = 0; i < code.length; i++) {
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = `rgb(${Math.random()*150}, ${Math.random()*150}, ${Math.random()*150})`;
    ctx.textBaseline = 'middle';

    // 随机倾斜与旋转
    const x = 20 * i + 15;
    const y = height / 2;
    const deg = (Math.random() * 30 - 15) * Math.PI / 180;

    ctx.translate(x, y);
    ctx.rotate(deg);
    ctx.fillText(code.charAt(i), 0, 0);
    ctx.rotate(-deg);
    ctx.translate(-x, -y);
  }

  // 绘制干扰线
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgb(${Math.random()*200}, ${Math.random()*200}, ${Math.random()*200})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  // 绘制噪点
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgb(${Math.random()*200}, ${Math.random()*200}, ${Math.random()*200})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
    ctx.fill();
  }
};

// 6. 切换登录/注册模式
const toggleMode = (loginMode: boolean) => {
  isLogin.value = loginMode;
  // 切换时重置表单状态和校验结果
  if (loginRef.value) {
    loginRef.value.resetFields();
  }
  // 如果切到注册模式，等待 DOM 渲染完再画验证码
  if (!loginMode) {
    nextTick(() => {
      drawCaptcha();
    });
  }
};

/**
 * 提交逻辑
 */
const handleSubmit = async () => {
  if (!loginRef.value) return;

  try {
    // 执行表单校验
    await loginRef.value.validate();

    loading.value = true;
    if (isLogin.value) {
      // 登录逻辑 (传完整表单，后端忽略多余字段，或主动解构)
      await userStore.login({ username: authForm.username, password: authForm.password });
    } else {
      // 注册逻辑：剔除确认密码和验证码，只发 username 和 password 给后端
      const { username, password } = authForm;
      const res = await registerApi({ username, password });
      if (res.code === 200) {
        ElMessage.success('注册成功，请登录');
        toggleMode(true); // 注册成功后切回登录
      }
    }
  } catch (error: any) {
    // 校验失败或请求失败都会进入这里
    // 如果是注册时失败，顺便刷新一下验证码增加安全性
    if (!isLogin.value) {
      drawCaptcha();
      authForm.captcha = ''; // 清空输入的错验证码
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.login-container {
  position: relative;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  overflow: hidden;

  /* === 纯 CSS 动态光晕背景 === */
  &::before,
  &::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    z-index: 0;
    animation: float 12s infinite alternate ease-in-out;
  }

  &::before {
    width: 60vw;
    height: 60vw;
    background: rgba(51, 126, 204, 0.15); /* 飞书蓝 */
    top: -20%;
    left: -10%;
  }

  &::after {
    width: 50vw;
    height: 50vw;
    background: rgba(139, 92, 246, 0.15); /* AI 智能紫 */
    bottom: -10%;
    right: -10%;
    animation-delay: -6s;
  }

  /* 背景浮动动画 */
  @keyframes float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(50px, 50px) scale(1.1); }
  }

  .login-card {
    position: relative;
    z-index: 1; /* 确保卡片在光晕之上 */
    width: 420px;
    padding: 48px;

    /* === 毛玻璃效果核心 === */
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(31, 35, 41, 0.08);

    .login-header {
      text-align: center;
      margin-bottom: 40px;
      .logo {
        width: 64px;
        margin-bottom: 16px;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.05));
      }
      h2 {
        font-size: 28px;
        margin: 0;
        font-weight: 700;
        letter-spacing: 1.5px;

        /* === 核心文字渐变魔法：飞书蓝主导，微量紫点缀 === */
        background: linear-gradient(135deg, #2b68c2 0%, #409eff 70%, #9f7aea 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;

        /* 阴影也同步换成淡蓝色，显得更加干净通透 */
        filter: drop-shadow(0 2px 4px rgba(51, 126, 204, 0.2));
      }
      p {
        font-size: 14px;
        color: #8f959e;
        margin-top: 10px;
      }
    }

    /* 输入框样式微调，适配玻璃态 */
    :deep(.el-input__wrapper) {
      background-color: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 0 1px #dcdfe6 inset;
      transition: all 0.3s;

      &:hover { background-color: #ffffff; }
      &.is-focus {
        background-color: #ffffff;
        box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
      }
    }

    .captcha-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;

      .el-input { flex: 1; }

      .captcha-canvas {
        cursor: pointer;
        border-radius: 4px;
        border: 1px solid rgba(220, 223, 230, 0.8);
        background-color: rgba(255, 255, 255, 0.9);
        flex-shrink: 0;
        transition: all 0.2s;

        &:hover {
          border-color: var(--el-color-primary);
          box-shadow: 0 2px 8px rgba(51, 126, 204, 0.2);
        }
      }
    }

    /* === 按钮美化：增加科技感渐变与动效 === */
    .submit-btn {
      width: 100%;
      margin-top: 12px;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      border: none;
      background: linear-gradient(90deg, #337ecc 0%, #8b5cf6 100%); /* 飞书蓝到AI紫的渐变 */
      box-shadow: 0 4px 12px rgba(51, 126, 204, 0.3);
      transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

      &:hover, &:focus {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(51, 126, 204, 0.5);
        background: linear-gradient(90deg, #409eff 0%, #9f7aea 100%);
      }

      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(51, 126, 204, 0.3);
      }
    }

    .footer-links {
      margin-top: 24px;
      text-align: center;
      font-size: 14px;
      .el-link {
        font-size: 14px;
        vertical-align: baseline;
        font-weight: 500;
      }
    }
  }
}
</style>