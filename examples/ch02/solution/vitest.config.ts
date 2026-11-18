import { defineConfig } from 'vitest/config';

// 既定のテスト。solution では演習用テスト（tests/exercises）も含めて実行する。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
