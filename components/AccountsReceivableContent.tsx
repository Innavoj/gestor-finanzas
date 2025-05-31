
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Transaction, isOverdue as checkOverdue } from '../types';
// generateId removed, not used here

const exportToPdfUtil = (columns: { header: string; dataKey: keyof Transaction | string}[], data: any[], title: string) => {
  if (!window.jspdf) {
    alert('PDF library (jspdf) is not loaded.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text(title, 40, 50);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 40, 65);
  
  const tableData = data.map(row => {
    return columns.map(col => {
      let value = row[col.dataKey as keyof Transaction];
      if (col.dataKey === 'date' || col.dataKey === 'dueDate' || col.dataKey === 'paymentDate') {
        value = value ? new Date(value).toLocaleDateString('es-ES') : 'N/A';
      }
      if (col.dataKey === 'amount') {
         value = (typeof value === 'number') ? value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' }) : value;
      }
      if (col.dataKey === 'status') {
         // The `isOverdue` property is pre-calculated in the `receivables` memo
         if ((row as any).isOverdue) value = 'Vencido';
         else if (row.status === 'pending') value = 'Pendiente';
         else if (row.status === 'paid') value = 'Pagado';
      }
      return value !== undefined && value !== null ? String(value) : '';
    });
  });

  (doc as any).autoTable({
    startY: 80,
    head: [columns.map(col => col.header)],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [44, 62, 80] }, 
    styles: { fontSize: 9 },
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};


const StatCard: React.FC<{ title: string; value: string | number; color?: string; }> = ({ title, value, color = 'text-slate-800' }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
    <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
    <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' }) : value}</p>
  </div>
);

const AccountsReceivableContent: React.FC = () => {
  const { state, markTransactionAsPaid } = useAppContext();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'overdue'>('all');
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState<Transaction | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const receivables = useMemo(() => {
    return state.transactions
      .filter(t => t.type === 'income' && t.status !== 'paid') 
      .map(t => ({ 
        ...t, 
        isOverdue: checkOverdue(t.dueDate, t.status) // Recalculate overdue status based on current date
      }))
      .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
  }, [state.transactions]);

  const filteredReceivables = useMemo(() => {
    return receivables.filter(t => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'overdue') return t.isOverdue;
      // For 'pending', it means status is 'pending' AND it's not 'isOverdue'
      if (filterStatus === 'pending') return t.status === 'pending' && !t.isOverdue; 
      return true; // Should not happen with current filterStatus types
    });
  }, [receivables, filterStatus]);

  const totalReceivable = useMemo(() => filteredReceivables.reduce((sum, t) => sum + t.amount, 0), [filteredReceivables]);
  const totalOverdue = useMemo(() => filteredReceivables.filter(t => t.isOverdue).reduce((sum, t) => sum + t.amount, 0), [filteredReceivables]);

  const handleConfirmMarkAsPaid = async () => {
    if (showMarkAsPaidModal) {
      setIsSubmitting(true);
      const success = await markTransactionAsPaid(showMarkAsPaidModal.id, paymentDate);
      if (success) {
        setShowMarkAsPaidModal(null);
        setPaymentDate(new Date().toISOString().split('T')[0]); 
      }
      // Error alert is handled in markTransactionAsPaid context function
      setIsSubmitting(false);
    }
  };
  
  const handleExport = () => {
    const columns = [
      { header: 'Descripción', dataKey: 'description' },
      { header: 'Fecha Emisión', dataKey: 'date' },
      { header: 'Fecha Vencimiento', dataKey: 'dueDate' },
      { header: 'Estado', dataKey: 'status' }, 
      { header: 'Monto', dataKey: 'amount' },
    ];
     const dataForPdf = filteredReceivables.map(t => ({
      ...t,
      isOverdue: checkOverdue(t.dueDate, t.status) // Ensure PDF gets the latest overdue status
    }));
    exportToPdfUtil(columns, dataForPdf, 'Reporte_Cuentas_Por_Cobrar');
  };

  if (state.isLoading && state.transactions.length === 0) {
    return <div className="p-6 text-center text-slate-500">Cargando cuentas por cobrar...</div>;
  }
   if (state.error) {
    return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{state.error}</div>;
  }


  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-lightgray min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Cuentas por Cobrar</h1>
         <button
          onClick={handleExport}
          disabled={filteredReceivables.length === 0 || isSubmitting}
          className="bg-secondary hover:bg-sky-600 text-white font-semibold p-2 sm:py-2 sm:px-4 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex items-center self-start sm:self-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="hidden xs:inline">Exportar a PDF</span>
          <span className="xs:hidden">PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <StatCard title="Total por Cobrar (Filtrado)" value={totalReceivable} color="text-accent-positive" />
        <StatCard title="Total Vencido (Filtrado)" value={totalOverdue} color="text-accent-warning" />
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label htmlFor="filterStatusAr" className="block text-sm font-medium text-slate-600">Filtrar por Estado:</label>
          <select 
            id="filterStatusAr" 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)}
            disabled={isSubmitting}
            className="p-2 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm w-full sm:w-auto disabled:bg-slate-100"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes (No Vencidas)</option>
            <option value="overdue">Vencidas</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-x-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">Lista de Cuentas por Cobrar ({filteredReceivables.length})</h2>
        {filteredReceivables.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">F. Emisión</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">F. Vencim.</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredReceivables.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${t.isOverdue ? 'bg-amber-50' : ''}`}>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-800 max-w-[100px] sm:max-w-xs truncate" title={t.description}>{t.description}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('es-ES') : 'N/A'}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      t.isOverdue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {t.isOverdue ? 'Vencido' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-medium text-accent-positive">
                    {t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-center">
                    {(t.status === 'pending' || t.isOverdue) && ( 
                       <button 
                        onClick={() => { setShowMarkAsPaidModal(t); setPaymentDate(new Date().toISOString().split('T')[0]); }}
                        disabled={isSubmitting}
                        className="text-primary hover:text-primary-dark font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Marcar como pagada la transacción ${t.description}`}
                      >
                        Pagada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500 text-center py-4">No hay cuentas por cobrar que coincidan con los filtros.</p>
        )}
      </div>

      {showMarkAsPaidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-xs sm:max-w-md">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-slate-700">Marcar Transacción como Pagada</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-1"><strong>Descripción:</strong> {showMarkAsPaidModal.description}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-3"><strong>Monto:</strong> {showMarkAsPaidModal.amount.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</p>
            <div>
              <label htmlFor="paymentDate" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Fecha de Pago:</label>
              <input 
                type="date" 
                id="paymentDate" 
                value={paymentDate} 
                onChange={e => setPaymentDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-xs sm:text-sm disabled:bg-slate-100"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-2 sm:space-x-3">
              <button 
                onClick={() => setShowMarkAsPaidModal(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmMarkAsPaid}
                disabled={isSubmitting}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-accent-positive hover:bg-emerald-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReceivableContent;
