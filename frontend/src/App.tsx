import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { NotificationProvider, useNotifications } from './context/NotificationContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar, type NavTab } from './components/Sidebar.js';
import { ToastContainer, type ToastMessage } from './components/Toast.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { ReceivingsPage } from './pages/ReceivingsPage.js';

const MainLayout: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const { setNavigationHandler, refreshNotifications } = useNotifications();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('warehouse_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('warehouse_sidebar_collapsed', JSON.stringify(next));
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  };

  // Connect notification click handler with internal navigation
  useEffect(() => {
    setNavigationHandler((tab: NavTab, docId?: string) => {
      setActiveTab(tab);
      if (docId) {
        setSelectedDocId(docId);
      } else {
        setSelectedDocId(null);
      }
    });
  }, [setNavigationHandler]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    // Re-evaluate notification actions on state changes
    refreshNotifications();
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onNotify={(type, msg) => addToast(type, msg)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedDocId(null);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenCreateModal={
            role === 'SUPERVISOR'
              ? () => {
                  setActiveTab('receivings');
                  setSelectedDocId(null);
                  setIsCreateModalOpen(true);
                }
              : undefined
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto p-6 lg:p-8 bg-slate-50 text-slate-900 font-sans">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardPage
                onNavigate={(tab, docId) => {
                  setActiveTab(tab);
                  if (docId) {
                    setSelectedDocId(docId);
                  } else {
                    setSelectedDocId(null);
                  }
                }}
                onOpenCreateModal={
                  role === 'SUPERVISOR'
                    ? () => {
                        setActiveTab('receivings');
                        setSelectedDocId(null);
                        setIsCreateModalOpen(true);
                      }
                    : undefined
                }
                onNotify={(type, msg) => addToast(type, msg)}
              />
            )}

            {activeTab === 'receivings' && (
              <ReceivingsPage
                selectedDocId={selectedDocId}
                onClearSelectedDocId={() => {
                  setSelectedDocId(null);
                  refreshNotifications();
                }}
                isCreateModalOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
                onNotify={(type, msg) => addToast(type, msg)}
              />
            )}

            {activeTab === 'products' && (
              <ProductsPage onNotify={(type, msg) => addToast(type, msg)} />
            )}

            {activeTab === 'inventory' && (
              <InventoryPage onNotify={(type, msg) => addToast(type, msg)} />
            )}

            {activeTab === 'transactions' && role === 'SUPERVISOR' && (
              <TransactionsPage onNotify={(type, msg) => addToast(type, msg)} />
            )}
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainLayout />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
