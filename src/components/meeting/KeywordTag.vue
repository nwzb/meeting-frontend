<template>
  <el-tag
      class="keyword-tag"
      :effect="active ? 'dark' : 'plain'"
      round
      @click="$emit('click', text)"
  >
    # {{ text }}
  </el-tag>
</template>

<script setup lang="ts">
defineProps<{ text: string; active?: boolean }>();
defineEmits(['click']);
</script>

<style scoped>
.keyword-tag { cursor: pointer; transition: all 0.3s; }
.keyword-tag:hover { transform: scale(1.05); }
</style>