'use client';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

type OrderStatus =
  | 'draft' | 'pending' | 'confirmed' | 'processing'
  | 'shipped' | 'delivered' | 'cancelled' | 'returned';

type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type StockStatus   = 'in_stock' | 'low_stock' | 'out_of_stock';
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | StockStatus | InvoiceStatus | string;
  type?: 'order' | 'payment' | 'stock' | 'invoice' | 'generic';
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const ORDER_STYLES: Record<OrderStatus, string> = {
  draft:      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pending:    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  shipped:    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  delivered:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  returned:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-700',
  paid:    'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
};

const STOCK_STYLES: Record<StockStatus, string> = {
  in_stock:     'bg-emerald-100 text-emerald-800',
  low_stock:    'bg-amber-100 text-amber-800',
  out_of_stock: 'bg-red-100 text-red-800',
};

const INVOICE_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-slate-100 text-slate-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
};

const DOT_COLORS: Record<string, string> = {
  draft: 'bg-slate-400', pending: 'bg-amber-500', confirmed: 'bg-blue-500',
  processing: 'bg-violet-500', shipped: 'bg-cyan-500', delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500', returned: 'bg-orange-500', paid: 'bg-emerald-500',
  partial: 'bg-blue-500', overdue: 'bg-red-600', sent: 'bg-blue-400',
  in_stock: 'bg-emerald-500', low_stock: 'bg-amber-500', out_of_stock: 'bg-red-500',
};

export function StatusBadge({ status, type = 'order', pulse, size = 'md' }: StatusBadgeProps) {
  const { t } = useTranslation();

  const getStyle = (): string => {
    if (type === 'order')   return ORDER_STYLES[status as OrderStatus] ?? 'bg-gray-100 text-gray-600';
    if (type === 'payment') return PAYMENT_STYLES[status as PaymentStatus] ?? 'bg-gray-100 text-gray-600';
    if (type === 'stock')   return STOCK_STYLES[status as StockStatus] ?? 'bg-gray-100 text-gray-600';
    if (type === 'invoice') return INVOICE_STYLES[status as InvoiceStatus] ?? 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  const getLabel = (): string => {
    if (type === 'order')   return t(`orders.${status}`, { defaultValue: status });
    if (type === 'payment') return t(`orders.${status}`, { defaultValue: status });
    if (type === 'stock')   return t(`products.${status}`, { defaultValue: status });
    if (type === 'invoice') return t(`invoices.${status}`, { defaultValue: status });
    return status;
  };

  const dotColor = DOT_COLORS[status] ?? 'bg-gray-400';
  const sizeClass = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 gap-1'
    : 'text-xs px-2.5 py-1 gap-1.5';

  const isCritical = status === 'out_of_stock' || status === 'overdue' || status === 'cancelled';

  return (
    <span className={`inline-flex items-center rounded-badge font-medium ${sizeClass} ${getStyle()}`}>
      <motion.span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}
        animate={pulse || isCritical
          ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }
          : {}}
        transition={pulse || isCritical
          ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
          : {}}
      />
      {getLabel()}
    </span>
  );
}

// ── Unread Count Badge ─────────────────────────────────────
export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  if (count === 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -end-1 min-w-[18px] h-[18px] flex items-center
                 justify-center rounded-full bg-danger-500 text-white text-[10px]
                 font-bold leading-none px-1 shadow-sm"
    >
      {count > max ? `${max}+` : count}
    </motion.span>
  );
}
