export const ADMIN_PREVIEW_CREDENTIALS = {
  username: "GGMAdminAman",
  password: "GGM2026",
} as const;

export function isValidAdminPreviewCredential(username: string, password: string) {
  return username.trim() === ADMIN_PREVIEW_CREDENTIALS.username && password === ADMIN_PREVIEW_CREDENTIALS.password;
}
