import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.js';
import { api } from '../api/client.js';
import type { NavTab } from '../components/Sidebar.js';

export interface AppNotification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'READY_TO_COMPLETE' | 'RECEIVE_PENDING' | 'PARTIAL_RECEIVING' | 'DRAFT_PENDING' | 'ZERO_STOCK';
  title: string;
  message: string;
  actionLabel: string;
  targetDocId?: string;
  targetTab: NavTab;
  badgeLabel: string;
  timestamp: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  navigateToNotification: (notification: AppNotification) => void;
  setNavigationHandler: (handler: (tab: NavTab, docId?: string) => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [navHandler, setNavHandler] = useState<((tab: NavTab, docId?: string) => void) | null>(null);

  const fetchAndCalculateNotifications = useCallback(async () => {
    if (!isAuthenticated || !role) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch active receivings
      const receivingsRes = await api.get('/receivings', { params: { limit: 50 } });
      const documents: any[] = receivingsRes.data.success ? receivingsRes.data.data : [];

      // 2. Fetch inventory for zero stock detection
      const inventoryRes = await api.get('/inventory', { params: { limit: 50 } });
      const inventoryItems: any[] = inventoryRes.data.success ? inventoryRes.data.data : [];

      const calculated: AppNotification[] = [];

      if (role === 'SUPERVISOR') {
        // Condition A: Documents where ALL items are completed (100%) but document is still DRAFT or IN_PROGRESS
        // This is a CRITICAL action for Supervisor: Selesaikan & Kunci Dokumen!
        documents.forEach((doc) => {
          if (
            doc.status !== 'COMPLETED' &&
            doc.total_items > 0 &&
            doc.completed_items === doc.total_items
          ) {
            calculated.push({
              id: `ready-complete-${doc.id}`,
              type: 'urgent',
              category: 'READY_TO_COMPLETE',
              title: 'Dokumen Siap Ditutup & Diselesaikan',
              message: `Dokumen ${doc.doc_number} telah selesai diverifikasi 100% oleh Operator. Perlu tindakan Supervisor untuk Menyelesaikan & Mengunci Dokumen.`,
              actionLabel: 'Selesaikan Dokumen',
              targetDocId: doc.id,
              targetTab: 'receivings',
              badgeLabel: 'Siap Tutup (100%)',
              timestamp: doc.created_at,
            });
          }
        });

        // Condition B: Newly published DRAFT documents that have not been started yet
        documents.forEach((doc) => {
          if (doc.status === 'DRAFT' && doc.completed_items === 0) {
            calculated.push({
              id: `draft-pending-${doc.id}`,
              type: 'info',
              category: 'DRAFT_PENDING',
              title: 'Dokumen Draf Menunggu Proses',
              message: `Dokumen ${doc.doc_number} telah diterbitkan dan menunggu verifikasi fisik oleh tim Operator di area inbound.`,
              actionLabel: 'Pantau Dokumen',
              targetDocId: doc.id,
              targetTab: 'receivings',
              badgeLabel: 'Draf Baru',
              timestamp: doc.created_at,
            });
          }
        });

        // Condition C: Zero stock alert for products (max 3 items to prevent clutter)
        const zeroStockItems = inventoryItems.filter((item) => (item.quantity ?? 0) === 0).slice(0, 3);
        zeroStockItems.forEach((item) => {
          calculated.push({
            id: `zero-stock-${item.id}`,
            type: 'warning',
            category: 'ZERO_STOCK',
            title: `Peringatan Stok Kosong: ${item.sku}`,
            message: `Produk "${item.product_name}" memiliki saldo 0 ${item.unit}. Perlu dibuatkan pesanan atau penerimaan stok baru.`,
            actionLabel: 'Cek Inventaris',
            targetTab: 'inventory',
            badgeLabel: 'Stok Habis (0)',
            timestamp: item.updated_at || new Date().toISOString(),
          });
        });
      } else if (role === 'OPERATOR') {
        // Condition D: Inbound documents waiting for physical verification by Operator
        documents.forEach((doc) => {
          if (doc.status !== 'COMPLETED') {
            const remainingItemsCount = doc.total_items - doc.completed_items;

            if (remainingItemsCount > 0) {
              if (doc.completed_items === 0) {
                // Not started yet
                calculated.push({
                  id: `operator-pending-${doc.id}`,
                  type: 'urgent',
                  category: 'RECEIVE_PENDING',
                  title: 'Tugas Masuk: Verifikasi Fisik Barang',
                  message: `Dokumen ${doc.doc_number} memiliki ${doc.total_items} item barang di loading dock yang harus dihitung dan dicatat masuk.`,
                  actionLabel: 'Mulai Catat Fisik',
                  targetDocId: doc.id,
                  targetTab: 'receivings',
                  badgeLabel: 'Belum Dimulai',
                  timestamp: doc.created_at,
                });
              } else {
                // Partial receiving in progress
                calculated.push({
                  id: `operator-partial-${doc.id}`,
                  type: 'warning',
                  category: 'PARTIAL_RECEIVING',
                  title: 'Penerimaan Parsial Sedang Berjalan',
                  message: `Dokumen ${doc.doc_number} baru selesai ${doc.completed_items}/${doc.total_items} item. Masih ada ${remainingItemsCount} item barang yang perlu diverifikasi.`,
                  actionLabel: 'Lanjutkan Verifikasi',
                  targetDocId: doc.id,
                  targetTab: 'receivings',
                  badgeLabel: 'Parsial',
                  timestamp: doc.created_at,
                });
              }
            }
          }
        });
      }

      setNotifications(calculated);
    } catch {
      // ignore background poll errors
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, role]);

  // Initial fetch and periodic polling (every 12 seconds)
  useEffect(() => {
    fetchAndCalculateNotifications();

    const interval = setInterval(() => {
      fetchAndCalculateNotifications();
    }, 12000);

    return () => clearInterval(interval);
  }, [fetchAndCalculateNotifications]);

  const setNavigationHandler = useCallback((handler: (tab: NavTab, docId?: string) => void) => {
    setNavHandler(() => handler);
  }, []);

  const navigateToNotification = useCallback(
    (notification: AppNotification) => {
      if (navHandler) {
        navHandler(notification.targetTab, notification.targetDocId);
      }
    },
    [navHandler]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        loading,
        refreshNotifications: fetchAndCalculateNotifications,
        navigateToNotification,
        setNavigationHandler,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
