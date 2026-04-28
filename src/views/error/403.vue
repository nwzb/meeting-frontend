<template>
  <div class="error-page">
    <el-result title="403" sub-title="抱歉，您没有权限访问该页面">
      <template #extra>
        <el-button type="primary" @click="$router.back()">返回上一页</el-button>
      </template>
    </el-result>
  </div>
</template>