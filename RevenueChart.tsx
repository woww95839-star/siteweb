'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fadeInUp } from '@/variants/animations';
import { formatDZD } from '../ui/DZDFormat';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const DATA: Record<Period, any[]> = {
  daily: [
    { label: '08h', revenue: 18000, profit: 4200 },
    { label: '10h', revenue: 42000, profit: 9800 },
    { label: '12h', revenue: 67000, profit: 15400 },
    { label: '14h', revenue: 54000, profit: 12000 },
    { label: '16h', revenue: 78000, profit: 18200 },
    { label: '18h', revenue: 91000, profit: 21000 },
    { label: '20h', revenue: 62000, profit: 14400 },
  ],
  weekly: [
    { label: 'Dim', revenue: 210000, profit: 48000 },
    { label: 'Lun', revenue: 284000, profit: 65000 },
    { label: 'Mar', revenue: 320000, profit: 74000 },
    { label: 'Mer', revenue: 298000, profit: 68000 },
    { label: 'Jeu', revenue: 350000, profit: 80000 },
    { label: 'Ven', revenue: 412000, profit: 94000 },
    { label: 'Sam', revenue: 180000, profit: 41000 },
  ],
  monthly: [
    { label: 'Jan', revenue: 2800000, profit: 640000 },
    { label: 'Fév', revenue: 3100000, profit: 710000 },
    { label: 'Mar', revenue: 2950000, profit: 680000 },
    { label: 'Avr', revenue: 3400000, profit: 780000 },
    { label: 'Mai', revenue: 3800000, profit: 870000 },
    { label: 'Jun', revenue: 3200000, profit: 735000 },
    { label: 'Jul', revenue: 2700000, profit: 620000 },
    { label: 'Aoû', revenue: 2500000, profit: 575000 },
    { label: 'Sep', revenue: 3600000, profit: 825000 },
    { label: 'Oct', revenue: 4100000, profit: 940000 },
    { label: 'Nov', revenue: 4400000, profit: 1010000 },
    { label: 'Déc', revenue: 4800000, profit: 1100000 },
  ],
  yearly: [
    { label: '2020', revenue: 28000000, profit: 6400000 },
    { label: '2021', revenue: 34000000, profit: 7800000 },
    { label: '2022', revenue: 41000000, profit: 9400000 },
    { label: '2023', revenue: 48000000, profit: 11000000 },
    { label: '2024', revenue: 56000000, profit: 12900000 },
  ],
};

const PERIODS: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

function CustomTooltip({ active, payload, label }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip text-text-primary">
      <p className="font-semibold text-text-secondary mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold">
            {formatDZD(entry.value)} {isAr ? 'دج' : 'DZD'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart() {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<Period>('monthly');
  const isAr = i18n.language === 'ar';

  const data = DATA[period];

  const labels = {
    revenue: isAr ? 'رقم الأعمال' : "Chiffre d'affaires",
    profit:  isAr ? 'الربح' : 'Bénéfice',
  };

  return (
    <motion.div variants={fadeInUp} className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-text-primary">
            {t('dashboard.revenueChart')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {isAr ? 'الإيرادات والأرباح' : 'Revenus & Bénéfices'}
          </p>
        </div>

        {/* Period switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-surface-100 border border-border">
          {PERIODS.map((p) => (
            <motion.button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                period === p ? 'text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {period === p && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-full bg-brand-600"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t(`dashboard.${p}`)}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1e3a5f" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            reversed={isAr}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            orientation={isAr ? 'right' : 'left'}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name={labels.revenue}
            stroke="#1e3a5f"
            strokeWidth={2.5}
            fill="url(#colorRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: '#1e3a5f' }}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name={labels.profit}
            stroke="#0d9488"
            strokeWidth={2.5}
            fill="url(#colorProfit)"
            dot={false}
            activeDot={{ r: 4, fill: '#0d9488' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
