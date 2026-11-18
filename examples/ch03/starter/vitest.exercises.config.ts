import { defineConfig } from 'vitest/config';

// 演習用テストだけを実行する。
export default defineConfig({
  test: {
    include: ['tests/exercises/**/*.test.ts'],
  },
});
