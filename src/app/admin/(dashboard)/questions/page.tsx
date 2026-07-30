import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import QuestionsClient from './QuestionsClient';

export default async function QuestionsPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) redirect('/admin/login');
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/admin/login');

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .order('id', { ascending: true });

  const categoriesMap: Record<string, number> = {};
  questions?.forEach(q => {
    categoriesMap[q.category] = (categoriesMap[q.category] || 0) + 1;
  });

  const chartData = Object.keys(categoriesMap).map(key => ({
    name: key,
    value: categoriesMap[key]
  }));

  // Get total completed responses (published count)
  const { count: responseCount, error: rError } = await supabase
    .from('responses')
    .select('id', { count: 'exact', head: true });
  const published = responseCount || 0;

  return (
    <div className="animateFadeIn">
      <QuestionsClient 
        questions={questions || []} 
        metrics={{
          total: questions?.length || 0,
          published,
          chartData
        }}
      />
    </div>
  );
}
