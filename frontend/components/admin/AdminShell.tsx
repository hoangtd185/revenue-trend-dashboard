'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  if (isLogin) return <>{children}</>;

  async function logout() {
    await adminApi.logout().catch(() => undefined);
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="admin">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <Link href="/admin" className="admin-brand">
            Revenue Admin
          </Link>
          <nav className="admin-nav">
            <Link href="/admin" className={pathname === '/admin' ? 'is-active' : ''}>
              Weeks
            </Link>
            <Link href="/" target="_blank">
              View dashboard ↗
            </Link>
          </nav>
          <div className="admin-user">
            <button type="button" className="a-btn a-btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
