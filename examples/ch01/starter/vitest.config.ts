import { configDefaults, defineConfig } from 'vitest/config';

// 既定のテスト。starter では演習用テスト（tests/exercises）を除外する。
// 演習用テストは npm run test:exercises で実行する。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'tests/exercises/**'],
  },
});
