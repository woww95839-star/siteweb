'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  FileText, Users, Truck, BarChart3, Tag, Settings,
  ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import { sidebarVariants, sidebarLabelVariants, staggerContainerFast, staggerItem } from '@/variants/animations';
import { useRtl } from '../common/RtlProvider';

const NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'products',  href: '/products',  icon: Package },
  { key: 'stock',     href: '/stock',     icon: Warehouse },
  { key: 'orders',    href: '/orders',    icon: ShoppingCart },
  { key: 'invoices',  href: '/invoices',  icon: FileText },
  { key: 'clients',   href: '/clients',   icon: Users },
  { key: 'suppliers', href: '/suppliers', icon: Truck },
  { key: 'reports',   href: '/reports',   icon: BarChart3 },
  { key: 'promotions',href: '/promotions',icon: Tag },
  { key: 'settings',  href: '/settings',  icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const { isRtl } = useRtl();
  const pathname = usePathname();

  const ChevronIcon = isRtl
    ? (isOpen ? ChevronRight : ChevronLeft)
    : (isOpen ? ChevronLeft : ChevronRight);

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={isOpen ? 'open' : 'closed'}
      initial={false}
      className="fixed top-0 bottom-0 z-30 flex flex-col overflow-hidden"
      style={{
        left: isRtl ? 'auto' : 0,
        right: isRtl ? 0 : 'auto',
        background: 'var(--sidebar-bg)',
        borderRight: isRtl ? 'none' : '1px solid var(--sidebar-border)',
        borderLeft:  isRtl ? '1px solid var(--sidebar-border)' : 'none',
      }}
    >
      {/* ── Logo ─── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b"
           style={{ borderColor: 'var(--sidebar-border)' }}>
        <motion.div
          className="flex-shrink-0 w-9 h-9 rounded-btn bg-teal-600 flex items-center justify-center shadow-sm"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap size={18} className="text-white" />
        </motion.div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={sidebarLabelVariants}
              animate="open"
              exit="closed"
              className="overflow-hidden"
            >
              <p className="text-white font-bold text-base tracking-tight leading-tight">
                SokPlus
              </p>
              <p className="text-[10px] leading-tight" style={{ color: 'var(--sidebar-text-muted)' }}>
                {isRtl ? 'إدارة الجملة' : 'Gestion B2B'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav Items ─── */}
      <motion.nav
        variants={staggerContainerFast}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
      >
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <motion.div key={key} variants={staggerItem}>
              <Link
                href={href}
                className={`sidebar-nav-item group ${isActive ? 'active' : ''}`}
                title={!isOpen ? t(`nav.${key}`) : undefined}
              >
                <span className="flex-shrink-0">
                  <Icon
                    size={18}
                    className={`transition-colors ${
                      isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'
                    }`}
                  />
                </span>
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      variants={sidebarLabelVariants}
                      animate="open"
                      exit="closed"
                      className="overflow-hidden text-sm"
                    >
                      {t(`nav.${key}`)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute end-0 w-0.5 h-6 rounded-full bg-teal-400"
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* ── Toggle Button ─── */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center p-2 rounded-btn
                     transition-colors cursor-pointer"
          style={{ background: 'var(--sidebar-hover)' }}
        >
          <ChevronIcon size={16} className="text-white/70" />
          {isOpen && (
            <span className="ms-2 text-xs text-white/60">
              {isRtl ? 'طوي' : 'Réduire'}
            </span>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
