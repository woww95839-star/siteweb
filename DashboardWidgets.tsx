'use client';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Plus, ShoppingCart, FileText, AlertTriangle, Package } from 'lucide-react';
import Link from 'next/link';
import { fadeInUp, staggerContainer, staggerItem, rowHover, scaleInBounce } from '@/variants/animations';
import { DZDFormat, formatDZD } from '../ui/DZDFormat';
import { StatusBadge } from '../ui/StatusBadge';

// ── Top Products Chart ─────────────────────────────────────
const TOP_PRODUCTS = [
  { nameFr: 'Huile 5L',      nameAr: 'زيت 5 لتر',      revenue: 284000, profit: 65000 },
  { nameFr: 'Sucre 50kg',    nameAr: 'سكر 50 كغ',       revenue: 248000, profit: 48000 },
  { nameFr: 'Farine 50kg',   nameAr: 'دقيق 50 كغ',      revenue: 196000, profit: 38000 },
  { nameFr: 'Tomate 200g',   nameAr: 'طماطم 200غ',      revenue: 142000, profit: 32000 },
  { nameFr: 'Eau Ifri 1.5L', nameAr: 'ماء إيفري 1.5 لتر', revenue: 124000, profit: 28000 },
];

export function TopProductsChart() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const data = TOP_PRODUCTS.map((p) => ({
    name: isAr ? p.nameAr : p.nameFr,
    revenue: p.revenue,
    profit: p.profit,
  }));

  return (
    <motion.div variants={fadeInUp} className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">{t('dashboard.topProducts')}</h3>
        <Link href="/reports" className="text-xs text-brand-500 hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            formatter={(v: number, name: string) => [
              `${formatDZD(v)} ${isAr ? 'دج' : 'DZD'}`,
              name,
            ]}
            contentStyle={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="revenue"
            name={isAr ? 'رقم الأعمال' : "CA"}
            fill="#1e3a5f"
            radius={[0, 4, 4, 0]}
            maxBarSize={12}
          />
          <Bar
            dataKey="profit"
            name={isAr ? 'الربح' : 'Bénéfice'}
            fill="#0d9488"
            radius={[0, 4, 4, 0]}
            maxBarSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ── Stock Alerts ───────────────────────────────────────────
const STOCK_ALERTS = [
  { id: '1', sku: 'HUI-001', nameFr: 'Huile Fleurial 5L',    nameAr: 'زيت فلوريال 5 لتر',    qty: 2,  threshold: 10, status: 'out_of_stock' },
  { id: '2', sku: 'FAR-002', nameFr: 'Farine Mercure 50kg',  nameAr: 'دقيق ميركور 50 كغ',    qty: 4,  threshold: 10, status: 'low_stock' },
  { id: '3', sku: 'DET-001', nameFr: 'Lessive OMO 5kg',      nameAr: 'مسحوق أومو 5 كغ',     qty: 3,  threshold: 6,  status: 'low_stock' },
  { id: '4', sku: 'EAU-003', nameFr: 'Eau Ifri 0.5L',        nameAr: 'ماء إيفري 0.5 لتر',   qty: 0,  threshold: 24, status: 'out_of_stock' },
];

export function StockAlerts() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <motion.div variants={fadeInUp} className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning-500" />
          {t('dashboard.stockAlerts')}
        </h3>
        <Link href="/stock" className="text-xs text-brand-500 hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="divide-y divide-border"
      >
        {STOCK_ALERTS.map((item) => (
          <motion.div
            key={item.id}
            variants={staggerItem}
            {...rowHover as any}
            whileHover="hover"
            animate="rest"
            className="flex items-center gap-3 px-5 py-3"
          >
            <div className="w-8 h-8 rounded-btn bg-surface-100 flex items-center justify-center flex-shrink-0">
              <Package size={14} className="text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {isAr ? item.nameAr : item.nameFr}
              </p>
              <p className="text-xs text-text-muted">
                {item.sku} · {isAr ? 'المتاح' : 'Dispo'}: {item.qty} / {item.threshold}
              </p>
            </div>
            <StatusBadge
              status={item.status}
              type="stock"
              pulse={item.status === 'out_of_stock'}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ── Recent Orders ──────────────────────────────────────────
const RECENT_ORDERS = [
  { id: '1', number: 'CMD-2024-0042', client: 'Benkhaled Import', clientAr: 'بن خالد',  total: 284500, status: 'pending',   date: '2024-04-10' },
  { id: '2', number: 'CMD-2024-0041', client: 'El Amine Alger',   clientAr: 'الأمين',   total: 158000, status: 'confirmed', date: '2024-04-09' },
  { id: '3', number: 'CMD-2024-0040', client: 'SARL Boudiaf',     clientAr: 'سارل بوضياف', total: 412000, status: 'shipped',   date: '2024-04-09' },
  { id: '4', number: 'CMD-2024-0039', client: 'EURL Taleb',       clientAr: 'ايرل طالب', total: 67000,  status: 'delivered', date: '2024-04-08' },
  { id: '5', number: 'CMD-2024-0038', client: 'SNC Messaoud',     clientAr: 'مسعود',    total: 320000, status: 'cancelled', date: '2024-04-08' },
];

export function RecentOrders() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <motion.div variants={fadeInUp} className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">{t('dashboard.recentOrders')}</h3>
        <Link href="/orders" className="text-xs text-brand-500 hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('orders.orderNumber')}</th>
              <th>{t('orders.client')}</th>
              <th>{t('common.total')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.date')}</th>
            </tr>
          </thead>
          <motion.tbody
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {RECENT_ORDERS.map((order) => (
              <motion.tr
                key={order.id}
                variants={staggerItem}
                whileHover={{ backgroundColor: 'var(--surface-50)' }}
                className="cursor-pointer"
              >
                <td>
                  <Link href={`/orders/${order.id}`} className="font-mono text-brand-600 hover:underline text-xs">
                    {order.number}
                  </Link>
                </td>
                <td className="font-medium text-sm">
                  {isAr ? order.clientAr : order.client}
                </td>
                <td>
                  <DZDFormat amount={order.total} size="sm" />
                </td>
                <td>
                  <StatusBadge status={order.status} type="order" />
                </td>
                <td className="text-text-muted text-xs">
                  {new Date(order.date).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-DZ')}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ── Quick Actions ──────────────────────────────────────────
const ACTIONS = [
  { labelFr: 'Nouvelle commande', labelAr: 'طلبية جديدة',   href: '/orders/new',   icon: ShoppingCart, color: 'bg-brand-600 hover:bg-brand-700' },
  { labelFr: 'Ajouter produit',   labelAr: 'إضافة منتج',    href: '/products/new', icon: Plus,         color: 'bg-teal-600 hover:bg-teal-700' },
  { labelFr: 'Générer facture',   labelAr: 'إنشاء فاتورة',  href: '/invoices/new', icon: FileText,     color: 'bg-warning-500 hover:bg-warning-600' },
];

export function QuickActions() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-3"
    >
      {ACTIONS.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={i}
            variants={scaleInBounce}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href={action.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-btn text-white text-sm font-medium
                          shadow-btn transition-colors ${action.color}`}
            >
              <Icon size={15} />
              {isAr ? action.labelAr : action.labelFr}
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
