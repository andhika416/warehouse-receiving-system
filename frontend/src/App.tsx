import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar, type NavTab } from './components/Sidebar.js';
import { ToastContainer, type ToastMessage } from './components/Toast.js';
import { LoginPage } from './pages/LoginPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { ReceivingsPage } from './pages/ReceivingsPage.js';
import { ReceivingDetailPage } from './pages/ReceivingDetailPage.js';

const MainLayout: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('receivings');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
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

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'receivings' && (
              <>
                {selectedDocId ? (
                  <ReceivingDetailPage
                    documentId={selectedDocId}
                    onBack={() => setSelectedDocId(null)}
                    onNotify={(type, msg) => addToast(type, msg)}
                  />
                ) : (
                  <ReceivingsPage
                    onSelectDocument={(id) => setSelectedDocId(id)}
                    isCreateModalOpen={isCreateModalOpen}
                    setIsCreateModalOpen={setIsCreateModalOpen}
                    onNotify={(type, msg) => addToast(type, msg)}
                  />
                )}
              </>
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
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
