import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_uid', user.id)
    .single();

  return (
    <AppShell
      user={profile ? {
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: profile.role,
      } : {
        full_name: user.email || 'Usuário',
        email: user.email || '',
        avatar_url: null,
        role: 'seller',
      }}
    >
      {children}
    </AppShell>
  );
}
