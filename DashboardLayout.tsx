'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRtl } from '../common/RtlProvider';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { pageTransition } from '@/variants/animations';

const SIDEBAR_OPEN  = 260;
const SIDEBAR_CLOSE = 72;

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: { fullName: string; fullNameAr?: string; email: string; role: string };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isRtl } = useRtl();
  const sidebarWidth = sidebarOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSE;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <motion.div
        animate={{
          marginLeft: isRtl ? 0 : sidebarWidth,
          marginRight: isRtl ? sidebarWidth : 0,
        }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="min-h-screen flex flex-col"
      >
        <Header sidebarWidth={sidebarWidth} user={user} />

        {/* Page Content */}
        <motion.main
          variants={pageTransition}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex-1 pt-16 overflow-x-hidden"
        >
          {children}
        </motion.main>
      </motion.div>
    </div>
  );
}
