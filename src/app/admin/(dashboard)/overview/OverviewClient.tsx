'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, CartesianGrid,
  Legend, LabelList
} from 'recharts';
import { Users, ClipboardList, CheckCircle, Database, MessageSquareDashed, Star } from 'lucide-react';
import { AnimatedCounter, ChartWhenVisible, CHART_ANIMATION } from '../animation';
import '../../admin.css';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#eab308',
  Approved: '#16a34a',
  Rejected: '#ef4444',
  Suspended: '#6b7280',
  Expired: '#9333ea',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Constitutional Law': '#4338ca',
  'Criminal Law': '#dc2626',
  'Civil Law': '#2563eb',
  'Evidence Law': '#0891b2',
  'Court Procedures': '#d97706',
  'Case Law': '#7c3aed',
  'Judicial Ethics': '#059669',
  'Statutory Interpretation': '#db2777',
  'Legal Reasoning': '#4f46e5',
  'Other judicial topics': '#64748b',
  'General Law': '#6366f1',
  'Uncategorized': '#9ca3af',
};

const CATEGORY_FALLBACK = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#dc2626', '#4f46e5', '#059669', '#db2777', '#64748b'];
const RESPONSE_BLUE = '#2563eb';
const REGISTRATION_BLUE = '#4338ca';

function getCategoryColor(name: string, index: number) {
  return CATEGORY_COLORS[name] || CATEGORY_FALLBACK[index % CATEGORY_FALLBACK.length];
}

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = 'Value',
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  valueLabel?: string;
  labelFormatter?: (label: string, payload?: TooltipPayloadItem[]) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const title = labelFormatter
    ? labelFormatter(String(label ?? ''), payload)
    : String(label ?? item.name ?? '');

  return (
    <div className="chartTooltip">
      <div className="chartTooltipTitle">{title}</div>
      {payload.map((entry, i) => (
        <div key={i} className="chartTooltipRow">
          <span
            className="chartTooltipSwatch"
            style={{ backgroundColor: entry.color || RESPONSE_BLUE }}
          />
          <span>{entry.name || valueLabel}:</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const data = item.payload || {};
  const name = String(data.name ?? 'Category');
  const percent = typeof data.percent === 'number' ? data.percent : null;
  const color = (typeof item.color === 'string' && item.color)
    || getCategoryColor(name, 0);

  return (
    <div className="chartTooltip">
      <div className="chartTooltipTitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="chartTooltipSwatch" style={{ backgroundColor: color }} />
        {name}
      </div>
      <div className="chartTooltipRow">
        <span>Number of Questions</span>
        <strong>{item.value}</strong>
      </div>
      {percent !== null && (
        <div className="chartTooltipRow">
          <span>Percentage of Total Questions</span>
          <strong>{percent}%</strong>
        </div>
      )}
    </div>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="chartHeader">
      <h2 className="chartTitle">{title}</h2>
      <p className="chartSubtitle">{subtitle}</p>
    </div>
  );
}

export default function OverviewClient({ kpis, charts }: { kpis: any; charts: any }) {
  const categoryData = charts.questionCategoryData || [];
  const categoryTotal = categoryData.reduce(
    (sum: number, item: { value: number }) => sum + (item.value || 0),
    0
  );

  const kpiData = [
    {
      label: 'Total Users',
      value: kpis.totalUsers,
      description: 'Total registered users in the system.',
      icon: Users,
      color: '#4338ca',
      bg: '#eef2ff',
    },
    {
      label: 'Pending Requests',
      value: kpis.pendingUsers,
      description: 'Users waiting for admin approval.',
      icon: ClipboardList,
      color: '#d97706',
      bg: '#fffbeb',
    },
    {
      label: 'Approved Users',
      value: kpis.approvedUsers,
      description: 'Users who can access the review system.',
      icon: CheckCircle,
      color: '#16a34a',
      bg: '#dcfce7',
    },
    {
      label: 'Total Questions',
      value: kpis.totalQuestions,
      description: 'Questions currently available in the question bank.',
      icon: Database,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      label: 'Total Responses',
      value: kpis.totalResponsesCount,
      description: 'Total review responses submitted.',
      icon: MessageSquareDashed,
      color: RESPONSE_BLUE,
      bg: '#eff6ff',
    },
    {
      label: 'Average Rating',
      value: kpis.avgRating,
      description: 'Average rating across all submitted reviews.',
      icon: Star,
      color: '#d97706',
      bg: '#fffbeb',
      suffix: '/5',
    },
  ];

  return (
    <>
      {/* KPIs Grid */}
      <div className="grid overviewKpiGrid" style={{ marginBottom: '24px' }}>
        {kpiData.map((s) => {
          const Icon = s.icon;
          return (
            <div
              className="card kpiCard"
              key={s.label}
            >
              <div className="kpiCardInner">
                <div className="kpiIconWrap" style={{ backgroundColor: s.bg, color: s.color }}>
                  <Icon size={24} />
                </div>
                <div className="kpiTextWrap">
                  <div className="kpiLabel">{s.label}</div>
                  <div className="kpiValue">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </div>
                  <p className="kpiDescription">{s.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid overviewChartsGrid">

        {/* Users by Status (Bar) */}
        <div className="card chartCard">
          <ChartHeader
            title="Users by Account Status"
            subtitle="Shows the number of users in each account status."
          />
          <div className="chartBody overviewChartBody">
            <ChartWhenVisible>
              {(ready) =>
                ready ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.usersByStatusData} barSize={42} margin={{ top: 24, right: 12, left: 8, bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        dy={8}
                        label={{ value: 'Account Status', position: 'insideBottom', offset: -18, fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        allowDecimals={false}
                        label={{ value: 'Number of Users', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f3f4f6' }}
                        content={
                          <ChartTooltip
                            valueLabel="Users"
                            labelFormatter={(label) => `${label} Users`}
                          />
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        formatter={() => 'Number of Users'}
                        iconType="square"
                      />
                      <Bar
                        dataKey="value"
                        name="Users"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive
                        animationDuration={CHART_ANIMATION.duration}
                        animationBegin={CHART_ANIMATION.begin}
                      >
                        {charts.usersByStatusData.map((entry: { name: string }, i: number) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                        ))}
                        <LabelList dataKey="value" position="top" fill="#111827" fontSize={12} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null
              }
            </ChartWhenVisible>
          </div>
          <div className="chartLegendManual">
            {charts.usersByStatusData.map((entry: { name: string; value: number }) => (
              <span key={entry.name} className="chartLegendItem">
                <span className="chartLegendDot" style={{ backgroundColor: STATUS_COLORS[entry.name] || '#6b7280' }} />
                {entry.name}
              </span>
            ))}
          </div>
        </div>

        {/* Daily Registrations (Line) */}
        <div className="card chartCard">
          <ChartHeader
            title="Daily User Registrations"
            subtitle="Shows how many users registered each day."
          />
          <div className="chartBody overviewChartBody">
            <ChartWhenVisible>
              {(ready) =>
                ready ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.dailyRegData} margin={{ top: 24, right: 16, left: 8, bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        dy={8}
                        label={{ value: 'Date', position: 'insideBottom', offset: -18, fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        allowDecimals={false}
                        label={{ value: 'Number of Registrations', angle: -90, position: 'insideLeft', offset: 4, fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip
                            valueLabel="Registrations"
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                        }
                      />
                      <Legend verticalAlign="top" height={28} iconType="plainline" />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Registrations"
                        stroke={REGISTRATION_BLUE}
                        strokeWidth={3}
                        dot={{ r: 5, fill: REGISTRATION_BLUE, strokeWidth: 0 }}
                        activeDot={{ r: 7 }}
                        isAnimationActive
                        animationDuration={CHART_ANIMATION.duration}
                        animationBegin={CHART_ANIMATION.begin}
                      >
                        <LabelList dataKey="value" position="top" fill="#111827" fontSize={11} fontWeight={600} offset={10} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                ) : null
              }
            </ChartWhenVisible>
          </div>
        </div>

        {/* Question Categories (Donut) */}
        <div className="card chartCard">
          <ChartHeader
            title="Question Categories"
            subtitle="Distribution of questions by legal category"
          />
          {categoryData.length === 0 ? (
            <div className="chartEmptyState">No questions found in the question bank.</div>
          ) : (
            <div className="donutChartLayout">
              <div className="donutChartVisual">
                <ChartWhenVisible>
                  {(ready) =>
                    ready ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={68}
                            outerRadius={100}
                            paddingAngle={categoryData.length > 1 ? 2 : 0}
                            dataKey="value"
                            nameKey="name"
                            stroke="#fff"
                            strokeWidth={2}
                            isAnimationActive
                            animationDuration={CHART_ANIMATION.duration}
                            animationBegin={CHART_ANIMATION.begin}
                          >
                            {categoryData.map((entry: { name: string }, i: number) => (
                              <Cell
                                key={entry.name}
                                fill={getCategoryColor(entry.name, i)}
                                className="donutSlice"
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CategoryTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : null
                  }
                </ChartWhenVisible>
                <div className="donutCenterLabel">
                  <div className="donutCenterValue">
                    <AnimatedCounter value={categoryTotal} />
                  </div>
                  <div className="donutCenterCaption">Total Questions</div>
                </div>
              </div>

              <div className="donutLegendPanel">
                <div className="donutLegendHeading">Legal Categories</div>
                <ul className="donutLegendList">
                  {categoryData.map((entry: { name: string; value: number; percent: number }, i: number) => (
                    <li key={entry.name} className="donutLegendRow">
                      <span
                        className="donutLegendSwatch"
                        style={{ backgroundColor: getCategoryColor(entry.name, i) }}
                      />
                      <span className="donutLegendName" title={entry.name}>{entry.name}</span>
                      <span className="donutLegendCount">{entry.value}</span>
                      <span className="donutLegendPercent">{entry.percent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
