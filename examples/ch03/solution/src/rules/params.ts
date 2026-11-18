import type { Entity } from '../domain/types';

// #region param
/**
 * パラメータを読む。存在しないキーは 0 とする。
 * noUncheckedIndexedAccess により e.params[key] は number | undefined になるので、
 * 既定値の規則をこの1か所に集める。
 */
export function param(e: Entity, key: string): number {
  return e.params[key] ?? 0;
}
// #endregion
