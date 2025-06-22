import React, { useState } from 'react';
import { AppProvider, useAppContext } from './store';
import DashboardContent from './components/DashboardContent';
import DataEntryContent from './components/DataEntryContent';
import ReportsContent from './components/ReportsContent';
import AccountsReceivableContent from './components/AccountsReceivableContent'; // New
import AccountsPayableContent from './components/AccountsPayableContent'; // New
import InventoryListContent from './components/InventoryListContent'; // New
import { ViewName } from './types';

interface NavLinkProps {
  to: ViewName; 
  label: string;
  icon: React.ReactNode;
}

const AppCore: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavLink: React.FC<NavLinkProps> = ({ to, label, icon }) => {
    const isActive = state.activeView === to;
    return (
      <button 
        onClick={() => dispatch({ type: 'SET_VIEW', payload: to })}
        className={`flex items-center space-x-3 px-2 sm:px-4 py-3 rounded-lg transition-all duration-200 ease-in-out w-full text-left
                    ${isActive 
                      ? 'bg-primary text-white shadow-lg transform md:scale-105' 
                      : 'text-slate-300 hover:bg-primary-light hover:text-white hover:md:scale-105 focus:outline-none focus:ring-2 focus:ring-secondary'
                    }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {icon}
        <span className="font-medium text-sm sm:text-base">{label}</span>
      </button>
    );
  };
  
  const renderView = () => {
    switch (state.activeView) {
      case 'dashboard': return <DashboardContent />;
      case 'dataEntry': return <DataEntryContent />;
      case 'reports': return <ReportsContent />;
      case 'accountsReceivable': return <AccountsReceivableContent />;
      case 'accountsPayable': return <AccountsPayableContent />;
      case 'inventoryList': return <InventoryListContent />; // New
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:h-screen bg-lightgray font-sans antialiased">
      {/* Botón menú hamburguesa para móviles */}
      <button
        className="md:hidden fixed top-3 left-3 z-40 bg-primary-dark text-white p-2 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú de navegación"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      {/* Sidebar */}
      <nav
        className={`fixed md:static top-0 left-0 h-full w-4/5 max-w-xs md:w-72 bg-primary-dark text-white p-3 sm:p-5 space-y-3 sm:space-y-6 shadow-2xl flex flex-col flex-shrink-0 md:h-full custom-scrollbar z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:block'} overflow-y-auto max-h-screen`}
        style={{ minHeight: '100vh' }}
        aria-label="Menú principal"
      >
        {/* Botón cerrar menú en móviles */}
        <div className="flex md:hidden justify-end mb-2">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white bg-secondary rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label="Cerrar menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-center mb-4 sm:mb-8 pt-2">
          <div className="inline-flex items-center justify-center p-2 sm:p-3 bg-secondary rounded-full mb-2 sm:mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6 sm:w-8 sm:h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">FINANZ<span className="text-secondary">AS</span></h1>
          <p className="text-xs text-sky-300/80 font-medium">Gestor Pro</p>
        </div>
        <div className="flex-grow space-y-1.5 sm:space-y-2.5">
          <NavLink to="dashboard" label="Dashboard" icon={<IconDashboard />} />
          <NavLink to="dataEntry" label="Ingresar Datos" icon={<IconDataEntry />} />
          <NavLink to="reports" label="Reportes" icon={<IconReports />} />
          <hr className="border-slate-600 my-2 sm:my-3"/>
          <NavLink to="accountsReceivable" label="Cuentas por Cobrar" icon={<IconAccountsReceivable />} />
          <NavLink to="accountsPayable" label="Cuentas por Pagar" icon={<IconAccountsPayable />} />
          <hr className="border-slate-600 my-2 sm:my-3"/>
          <NavLink to="inventoryList" label="Listado de Inventario" icon={<IconInventory />} />
        </div>
        <div className="mt-auto text-center text-xs text-slate-400/70 pb-1 sm:pb-2">
            © {new Date().getFullYear()} Gestor Financiero
        </div>
      </nav>
      {/* Overlay para cerrar menú en móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden touch-none"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú lateral"
        />
      )}
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full min-h-screen md:ml-0 pt-14 md:pt-0">
        {/* Espacio superior para el botón menú en móviles */}
        <div className="block md:hidden h-12" />
        {renderView()}
      </main>
    </div>
  );
};

// Icons - adjusted size for nav links
const IconDashboard: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6zM3.75 12h16.5m-16.5-3.75h16.5M3.75 15.75h16.5" /></svg>;
const IconDataEntry: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125M5.25 12H10" /></svg>;
const IconReports: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM21 21l-5.197-5.197M13.5 7.5H21m-6.75 3H21m-6.75 3H21" /></svg>;
const IconAccountsReceivable: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5V6.75A.75.75 0 0019.5 6h-.75m0 0V5.625c0-.621.504-1.125 1.125-1.125h.375M21 12.75H3M21 12.75c0 .414-.336.75-.75.75H3.75a.75.75 0 01-.75-.75m18 0v1.875c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125V12.75m3 .375H3.375M15 12.75L15 15h.008v.008H15V15zm-3.375 0L11.625 15h.008v.008H11.625V15zm-3.375 0L8.25 15h.008v.008H8.25V15zM3 16.5h18" /></svg>;
const IconAccountsPayable: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 .75h13.5m-13.5 0H20.25m-16.5 0H20.25m2.25-4.125c0-1.02.744-1.875 1.688-1.875h13.124c.943 0 1.688.855 1.688 1.875V18a2.25 2.25 0 01-2.25 2.25H3.938A2.25 2.25 0 011.688 18V6.375c0-.621.504-1.125 1.125-1.125h18.374c.621 0 1.125.504 1.125 1.125M14.25 12a2.25 2.25 0 00-2.25-2.25H5.25a2.25 2.25 0 000 4.5h6.75a2.25 2.25 0 002.25-2.25z" /></svg>;
const IconInventory: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15V6.75m-6.75 4.5H3m18 0h-2.25M5.25 7.5h13.5c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H5.25C4.629 3.75 4.125 4.254 4.125 4.875v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;


const App: React.FC = () => {
  return (
    <AppProvider>
      <AppCore />
    </AppProvider>
  );
};

export default App;
