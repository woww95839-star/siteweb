'use client';
import { useRtl } from '../common/RtlProvider';

interface DZDFormatProps {
  amount: number | string;
  showCurrency?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colored?: boolean; // green if positive, red if negative
}

export function DZDFormat({
  amount,
  showCurrency = true,
  className = '',
  size = 'md',
  colored = false,
}: DZDFormatProps) {
  const { isRtl } = useRtl();
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  const sizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-semibold',
    xl: 'text-xl font-bold',
  }[size];

  const colorClass = colored
    ? num >= 0 ? 'text-teal-600' : 'text-danger-500'
    : '';

  // Arabic-Indic numerals for RTL
  const formatted = isRtl
    ? num.toLocaleString('ar-DZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : num.toLocaleString('fr-DZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

  const currency = isRtl ? 'دج' : 'DZD';

  return (
    <span className={`font-mono tabular-nums ${sizeClass} ${colorClass} ${className}`}>
      {isRtl ? (
        <>
          {showCurrency && <span className="font-arabic text-xs ms-1">{currency}</span>}
          {formatted}
        </>
      ) : (
        <>
          {formatted}
          {showCurrency && <span className="text-xs ms-1 text-text-muted">{currency}</span>}
        </>
      )}
    </span>
  );
}

// Standalone formatting function (no component)
export function formatDZD(amount: number, locale = 'fr-DZ'): string {
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
