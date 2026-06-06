'use client';
import { useTranslation } from 'react-i18next';
import { forwardRef } from 'react';

interface WilayaSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const WilayaSelect = forwardRef<HTMLSelectElement, WilayaSelectProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const wilayas = Array.from({ length: 58 }, (_, i) => i + 1).map((code) => ({
      code,
      nameFr: t(`wilayas.${code}`),
      nameAr: t(`wilayas.${code}`),
    }));

    return (
      <div className="form-group">
        {label && (
          <label className="form-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`form-input ${error ? 'error' : ''} ${className}`}
          {...props}
        >
          <option value="">
            {isAr ? '-- اختر الولاية --' : '-- Sélectionner une wilaya --'}
          </option>
          {wilayas.map(({ code, nameFr }) => (
            <option key={code} value={code}>
              {String(code).padStart(2, '0')} — {nameFr}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-danger-500 mt-0.5">{error}</p>
        )}
      </div>
    );
  },
);

WilayaSelect.displayName = 'WilayaSelect';

// ── Wilaya Name Resolver ───────────────────────────────────
export function WilayaName({ code }: { code: number | null | undefined }) {
  const { t } = useTranslation();
  if (!code) return <span className="text-text-muted">—</span>;
  return <span>{String(code).padStart(2, '0')} — {t(`wilayas.${code}`, { defaultValue: `W${code}` })}</span>;
}
