'use client';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, ShoppingCart,
  PackageX, DollarSign, Target,
} from 'lucide-react';
import { statsCardVariants } from '@/variants/animations';
import { DZDFormat } from '../ui/DZDFormat';

interface StatCard {
  key: string;
  titleKey: string;
  value: number;
  isDZD?: boolean;
  change: number; // % change
  compareKey: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const STATS: StatCard[] = [
  {
    key: 'revenue',
    titleKey: 'dashboard.todayRevenue',
    value: 284500,
    isDZD: true,
    change: +12.4,
    compareKey: 'dashboard.vsYesterday',
    icon: <DollarSign size={20} />,
    color: 'text-brand-600',
    bgColor: 'bg-brand-50 dark:bg-brand-950/30',
  },
  {
    key: 'profit',
    titleKey: 'dashboard.monthlyProfit',
    value: 1248000,
    isDZD: true,
    change: +8.1,
    compareKey: 'dashboard.vsLastMonth',
    icon: <Target size={20} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
  },
  {
    key: 'orders',
    titleKey: 'dashboard.pendingOrders',
    value: 14,
    isDZD: false,
    change: -3,
    compareKey: 'dashboard.vsYesterday',
    icon: <ShoppingCart size={20} />,
    color: 'text-warning-600',
    bgColor: 'bg-warning-50 dark:bg-warning-950/30',
  },
  {
    key: 'lowstock',
    titleKey: 'dashboard.lowStockProducts',
    value: 7,
    isDZD: false,
    change: +2,
    compareKey: 'dashboard.vsYesterday',
    icon: <PackageX size={20} />,
    color: 'text-danger-500',
    bgColor: 'bg-danger-50 dark:bg-danger-950/30',
  },
];

export function StatsCards() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.key}
          custom={i}
          variants={statsCardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -2, transition: { duration: 0.18 } }}
          className="card p-5 cursor-default"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                {t(stat.titleKey)}
              </p>
              <div className="flex items-baseline gap-1">
                {stat.isDZD ? (
                  <DZDFormat amount={stat.value} size="xl" />
                ) : (
                  <span className="text-2xl font-bold text-text-primary tabular-nums">
                    {stat.value}
                  </span>
                )}
              </div>
            </div>
            <motion.div
              className={`w-11 h-11 rounded-card flex items-center justify-center flex-shrink-0 ${stat.bgColor}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <span className={stat.color}>{stat.icon}</span>
            </motion.div>
          </div>

          {/* Change indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-0.5 text-xs font-semibold ${
                stat.change >= 0 ? 'text-teal-600' : 'text-danger-500'
              }`}
            >
              {stat.change >= 0
                ? <TrendingUp size={12} />
                : <TrendingDown size={12} />
              }
              {Math.abs(stat.change)}%
            </span>
            <span className="text-xs text-text-muted">{t(stat.compareKey)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
