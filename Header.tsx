'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search, Bell, Sun, Moon, User, LogOut, Settings,
  ChevronDown, AlertCircle, ShoppingCart, Package,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '../common/RtlProvider';
import { CountBadge } from '../ui/StatusBadge';
import { dropdownVariants, scaleIn } from '@/variants/animations';

interface HeaderProps {
  sidebarWidth: number;
  user?: { fullName: string; fullNameAr?: string; email: string; role: string };
}

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'stock',   titleFr: 'Huile 5L — Stock bas',       titleAr: 'زيت 5 لتر — مخزون منخفض',   isRead: false, time: '2min' },
  { id: '2', type: 'order',   titleFr: 'Nouvelle commande CMD-0042',  titleAr: 'طلبية جديدة CMD-0042',       isRead: false, time: '15min' },
  { id: '3', type: 'payment', titleFr: 'Paiement reçu — 45 000 DZD', titleAr: 'استلام دفع 45,000 دج',      isRead: true,  time: '1h' },
];

export function Header({ sidebarWidth, user }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isAr = i18n.language === 'ar';

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const searchRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const displayName = isAr ? (user?.fullNameAr || user?.fullName) : user?.fullName;

  const notifIcon = (type: string) => {
    if (type === 'stock')   return <AlertCircle size={14} className="text-warning-500" />;
    if (type === 'order')   return <ShoppingCart size={14} className="text-brand-500" />;
    if (type === 'payment') return <Package size={14} className="text-teal-600" />;
    return <Bell size={14} className="text-text-muted" />;
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className="fixed top-0 end-0 z-20 flex items-center gap-3 px-4 h-16
                 bg-surface-0 border-b border-border"
      style={{ left: isAr ? 0 : sidebarWidth, right: isAr ? sidebarWidth : 0 }}
    >
      {/* ── Search ─── */}
      <motion.div
        animate={{ width: searchOpen ? 280 : 200 }}
        className="relative"
      >
        <Search
          size={14}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => !searchQuery && setSearchOpen(false)}
          placeholder={isAr ? 'بحث...' : 'Rechercher...'}
          className="w-full ps-8 pe-3 py-2 text-sm rounded-input bg-surface-50
                     border border-border focus:outline-none focus:border-brand-400
                     focus:ring-2 focus:ring-brand-500/10 transition-all"
        />
      </motion.div>

      <div className="flex-1" />

      {/* ── Dark Mode Toggle ─── */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-8 h-8 flex items-center justify-center rounded-btn
                   hover:bg-surface-100 transition-colors text-text-secondary"
      >
        <AnimatePresence mode="wait">
          {theme === 'dark' ? (
            <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Sun size={16} />
            </motion.span>
          ) : (
            <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Moon size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Language Switcher ─── */}
      <LanguageSwitcher compact />

      {/* ── Notifications ─── */}
      <div className="relative" data-dropdown>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
          className="relative w-8 h-8 flex items-center justify-center rounded-btn
                     hover:bg-surface-100 transition-colors text-text-secondary"
        >
          <Bell size={17} />
          <CountBadge count={unreadCount} />
        </motion.button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-10 end-0 w-80 bg-surface-0 rounded-card
                         border border-border shadow-modal z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm">{t('notifications.title')}</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-500 hover:underline cursor-pointer">
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-text-muted text-sm py-8">
                    {t('notifications.noNotifications')}
                  </p>
                ) : (
                  notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      whileHover={{ backgroundColor: 'var(--surface-50)' }}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 ${
                        !n.isRead ? 'bg-brand-50/60 dark:bg-brand-950/20' : ''
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0">{notifIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {isAr ? n.titleAr : n.titleFr}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">{n.time}</p>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── User Menu ─── */}
      <div className="relative" data-dropdown>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-btn
                     hover:bg-surface-100 transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {displayName?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <span className="text-sm font-medium text-text-primary hidden sm:block max-w-[120px] truncate">
            {displayName ?? 'Admin'}
          </span>
          <ChevronDown size={12} className="text-text-muted" />
        </motion.button>

        <AnimatePresence>
          {userOpen && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-10 end-0 w-52 bg-surface-0 rounded-card
                         border border-border shadow-modal z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="font-semibold text-sm text-text-primary truncate">{displayName}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link href="/settings/profile"
                  className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-surface-50 transition-colors"
                >
                  <User size={14} className="text-text-muted" />
                  {isAr ? 'الملف الشخصي' : 'Mon profil'}
                </Link>
                <Link href="/settings"
                  className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-surface-50 transition-colors"
                >
                  <Settings size={14} className="text-text-muted" />
                  {t('nav.settings')}
                </Link>
                <div className="border-t border-border my-1" />
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger-500 hover:bg-danger-50 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  {t('nav.logout')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
