// Admin gate — satu sumber kebenaran untuk email admin.
// Dipakai di client (menu/sidebar) dan server (getServerSideProps, API route).

export const ADMIN_EMAIL = "ardika.yudha08@gmail.com"

export function isAdminEmail(email?: string | null): boolean {
  return email === ADMIN_EMAIL
}
