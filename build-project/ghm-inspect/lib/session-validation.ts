/** Returns true when cached account data must be discarded before routing. */
export function shouldInvalidateCachedSession(
  cachedUserId: string | number | null | undefined,
  serverUser: { id: number | null } | null,
) {
  return !serverUser || serverUser.id === null || String(serverUser.id) !== String(cachedUserId);
}
