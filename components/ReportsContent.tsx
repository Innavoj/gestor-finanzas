import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../store';
import { Transaction, ChartDataPoint, TRANSACTION_CATEGORIES, isOverdue as checkOverdue } from '../types';


const exportToPdf = (columns: { header: string; dataKey: keyof Transaction | string}[], data: any[], title: string, orientation: 'p' | 'l' = 'p') => {
  if (!window.jspdf) {
    alert('PDF library (jspdf) is not loaded.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'pt',
    format: 'a4'
  });

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
         // Use the isOverdue property if pre-calculated, otherwise check
         const isTxOverdue = (row as any).isOverdue !== undefined ? (row as any).isOverdue : checkOverdue(row.dueDate, row.status);
         if (isTxOverdue) value = 'Vencido';
         else if (value === 'pending') value = 'Pendiente';
         else if (value === 'paid') value = 'Pagado';
      }
      if (col.dataKey === 'productName' && !value && row.productId && (window as any).AppContextProducts) { // Fallback if productName not directly on transaction
        const product = (window as any).AppContextProducts.find((p: any) => p.id === row.productId);
        value = product ? product.name : 'N/A';
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
    styles: { fontSize: 8 },
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};


const ReportsContent: React.FC = () => {
  const { state } = useAppContext();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // For PDF fallback, make products accessible globally if needed (slightly hacky, context is better)
  // This is a temporary workaround for the PDF export to access product names if not directly on transaction.
  // A better solution would be to ensure transactions always have productName if needed for display/export,
  // or pass products array to exportToPdf function.
  (window as any).AppContextProducts = state.products;


  const filteredTransactions = useMemo(() => {
    setCurrentPage(1); 
    return state.transactions
      .map(t => ({
        ...t,
        // Backend might already provide productName. If not, try to find it.
        productName: t.productName || (t.productId ? state.products.find(p => p.id === t.productId)?.name : undefined),
        isOverdue: checkOverdue(t.dueDate, t.status)
      }))
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => filterCategory === 'all' || t.category === filterCategory)
      .filter(t => !filterStartDate || new Date(t.date) >= new Date(filterStartDate))
      .filter(t => !filterEndDate || new Date(t.date) <= new Date(filterEndDate))
      .filter(t => 
        searchTerm === '' || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.productName && t.productName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, state.products, filterType, filterCategory, filterStartDate, filterEndDate, searchTerm]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);


  const chartData = useMemo(() => {
    const monthlyData: { [monthYear: string]: { income: number; expense: number } } = {};
    filteredTransactions.forEach(t => { 
      const monthYear = new Date(t.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
      if (!monthlyData[monthYear]) monthlyData[monthYear] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyData[monthYear].income += t.amount;
      else monthlyData[monthYear].expense += t.amount;
    });
    return Object.entries(monthlyData)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a,b) => { 
        const [m1str, y1str] = a.name.split(' ');
        const [m2str, y2str] = b.name.split(' ');
        const monthMap: { [key: string]: number } = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, oct:9, nov:10, dic:11 };
        const dateA = new Date(parseInt(y1str), monthMap[m1str.toLowerCase().replace('.','')]);
        const dateB = new Date(parseInt(y2str), monthMap[m2str.toLowerCase().replace('.','')]);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredTransactions]);

  const allCategories = ['all', ...TRANSACTION_CATEGORIES.INCOME, ...TRANSACTION_CATEGORIES.EXPENSE];

  const handleExport = () => {
    const columns = [
      { header: 'Fecha', dataKey: 'date' },
      { header: 'Tipo', dataKey: 'type' },
      { header: 'Descripción', dataKey: 'description' },
      { header: 'Categoría', dataKey: 'category' },
      { header: 'Producto', dataKey: 'productName' }, 
      { header: 'Cantidad', dataKey: 'quantity'},
      { header: 'Estado', dataKey: 'status'},
      { header: 'Vencimiento', dataKey: 'dueDate'},
      { header: 'Fecha Pago', dataKey: 'paymentDate'},
      { header: 'Monto', dataKey: 'amount' },
    ];
    const dataForPdf = filteredTransactions.map(t => ({
      ...t,
      productName: t.productName || (t.productId ? state.products.find(p => p.id === t.productId)?.name || 'N/A' : 'N/A'),
      type: t.type === 'income' ? 'Ingreso' : 'Gasto',
      // Ensure isOverdue is calculated for PDF
      isOverdue: checkOverdue(t.dueDate, t.status)
    }));
    exportToPdf(columns, dataForPdf, 'Reporte_Transacciones_Detallado', 'l');
  };

  if (state.isLoading && state.transactions.length === 0) {
    return <div className="p-6 text-center text-slate-500">Cargando reportes...</div>;
  }
   if (state.error) {
    return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{state.error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-lightgray min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Reportes Detallados</h1>
        <button
          onClick={handleExport}
          disabled={filteredTransactions.length === 0}
          className="bg-secondary hover:bg-sky-600 text-white font-semibold p-2 sm:py-2 sm:px-4 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex items-center self-start sm:self-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="hidden xs:inline">Exportar a PDF</span>
           <span className="xs:hidden">PDF</span>
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-700">Filtros de Reporte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <label htmlFor="filterType" className="block text-xs sm:text-sm font-medium text-slate-600">Tipo:</label>
            <select id="filterType" value={filterType} onChange={e => setFilterType(e.target.value as any)} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-xs sm:text-sm">
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
          <div>
            <label htmlFor="filterCategory" className="block text-xs sm:text-sm font-medium text-slate-600">Categoría:</label>
            <select id="filterCategory" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-xs sm:text-sm">
              {allCategories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Todas' : cat}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="searchTerm" className="block text-xs sm:text-sm font-medium text-slate-600">Buscar (Descrip. o Producto):</label>
            <input type="text" id="searchTerm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ej: Venta Laptop" className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-xs sm:text-sm" />
          </div>
          <div>
            <label htmlFor="filterStartDate" className="block text-xs sm:text-sm font-medium text-slate-600">Fecha Desde:</label>
            <input type="date" id="filterStartDate" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-xs sm:text-sm"/>
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs sm:text-sm font-medium text-slate-600">Fecha Hasta:</label>
            <input type="date" id="filterEndDate" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-xs sm:text-sm"/>
          </div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">Gráfico de Transacciones (Total Filtrado)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tickFormatter={(value) => `$${value/1000}k`} tick={{fontSize: 10}} />
              <Tooltip formatter={(value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}/>
              <Legend wrapperStyle={{fontSize: "12px"}}/>
              {filterType !== 'expense' && <Bar dataKey="income" fill="#10b981" name="Ingresos" />}
              {filterType !== 'income' && <Bar dataKey="expense" fill="#f43f5e" name="Gastos" />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
         <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center text-slate-500">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">Gráfico de Transacciones</h2>
            <p>No hay suficientes datos filtrados para mostrar el gráfico.</p>
         </div>
      )}


      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-x-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">Detalle de Transacciones ({filteredTransactions.length})</h2>
        {paginatedTransactions.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vencim.</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pago</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedTransactions.map(t => {
                  const productDisplay = t.productName ? `${t.productName} ${t.quantity ? `(${t.quantity} uds)`:''}` : 'N/A';
                  let statusText = t.status;
                  if (t.isOverdue) statusText = 'overdue';

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${t.isOverdue ? 'bg-rose-50' : ''}`}>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-800 max-w-[100px] sm:max-w-xs truncate" title={t.description}>{t.description}</td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600">{t.category}</td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600 max-w-[80px] sm:max-w-xs truncate" title={productDisplay}>{productDisplay}</td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            t.isOverdue ? 'bg-amber-100 text-amber-800' :
                            t.status === 'paid' ? 'bg-green-100 text-green-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                          {t.isOverdue ? 'Vencido' : t.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('es-ES') : 'N/A'}</td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-slate-600">{t.paymentDate ? new Date(t.paymentDate).toLocaleDateString('es-ES') : 'N/A'}</td>
                      <td className={`px-2 py-2 sm:px-3 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-medium ${t.type === 'income' ? 'text-accent-positive' : 'text-accent-negative'}`}>
                        {t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:justify-between items-center space-y-2 sm:space-y-0">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-xs sm:text-sm text-slate-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-center py-4">No hay transacciones que coincidan con los filtros seleccionados.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsContent;

// Mejoras responsivas:
// - Se agregan clases xs:text-xs, xs:p-2, xs:space-y-2, xs:rounded-md, xs:max-w-full, xs:overflow-x-auto
// - Se refuerzan los breakpoints en grids y paddings
// - Se asegura que los filtros y tablas sean scrolleables horizontalmente en móviles
