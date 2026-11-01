import { redirect } from 'next/navigation';

export default async function Home({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign } = await searchParams;
  if (campaign) redirect(`/join/${encodeURIComponent(campaign)}`);
  redirect('/dashboard');
}
