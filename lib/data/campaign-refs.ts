import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Question } from '@/lib/types';

/** Brands and question templates for the campaign form. */
export async function loadFormRefs(role: string, meId: string) {
  const supabase = await createClient();
  const [{ data: brandRows }, { data: tpl }] = await Promise.all([
    role === 'ADMIN'
      ? supabase.from('brand_profiles').select('user_id, company_name, profile:profiles!inner(status)').order('company_name')
      : supabase.from('brand_profiles').select('user_id, company_name').eq('user_id', meId),
    supabase.from('question_templates').select('id, name, questions').order('name'),
  ]);
  const brands = (brandRows ?? [])
    .filter((b: any) => !b.profile || b.profile.status === 'ACTIVE')
    .map((b: any) => ({ id: b.user_id as string, name: b.company_name as string }));
  return { brands, templates: (tpl ?? []) as { id: string; name: string; questions: Question[] }[] };
}
