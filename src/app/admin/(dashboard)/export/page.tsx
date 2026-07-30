import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import ExportClient from './ExportClient';

export default async function ExportPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) redirect('/admin/login');
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/admin/login');

  const { data: responses } = await supabase
    .from('responses')
    .select('rating, submitted_at');

  const { count: totalResponses } = await supabase
    .from('responses')
    .select('*', { count: 'exact', head: true });

  // Rating distribution
  const ratingCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let totalRatingSum = 0;
  responses?.forEach(r => {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      ratingCounts[String(r.rating)]++;
      totalRatingSum += r.rating;
    }
  });
  const avgRating = (responses?.length || 0) > 0 ? (totalRatingSum / responses!.length) : 0;

  const ratingChartData = Object.keys(ratingCounts).map(k => ({
    name: `★${k}`,
    value: ratingCounts[k]
  }));

  return (
    <div className="animateFadeIn">
      <ExportClient
        totalResponses={totalResponses || 0}
        avgRating={avgRating}
        ratingChartData={ratingChartData}
      />
    </div>
  );
}
