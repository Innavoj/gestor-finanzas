
import React, { useMemo } from 'react';
import { useAppContext } from '../store';
import { Product } from '../types';


const exportInventoryToPdf = (columns: { header: string; dataKey: keyof Product | string}[], data: any[], title: string) => {
  if (!window.jspdf) {
    alert('PDF library (jspdf) is not loaded.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' }); 

  doc.setFontSize(16);
  doc.text(title, 40, 50);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 40, 65);
  
  const tableData = data.map((row: any) => {
    return columns.map(col => {
      let value = row[col.dataKey as keyof Product];
      if (col.dataKey === 'purchasePrice' || col.dataKey === 'sellingPrice' || col.dataKey === 'inventoryValuePurchase' || col.dataKey === 'inventoryValueSale') {
         value = (typeof value === 'number') ? value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' }) : value;
      }
      if (col.dataKey === 'stock') {
        value = `${value} uds.`;
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
    columnStyles: {
        name: { cellWidth: 120 },
        sku: { cellWidth: 60 },
    }
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};


const StatCard: React.FC<{ title: string; value: string | number; color?: string; icon?: React.ReactNode }> = ({ title, value, color = 'text-slate-800', icon }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
        <p className={`text-xl sm:text-3xl font-bold ${color}`}>{typeof value === 'number' && (title.toLowerCase().includes('valor') || title.toLowerCase().includes('precio')) ? value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' }) : value}</p>
      </div>
      {icon && <div className="text-2xl sm:text-3xl text-slate-400">{icon}</div>}
    </div>
  </div>
);

const InventoryListContent: React.FC = () => {
  const { state } = useAppContext();
  const { products, isLoading, error } = state;

  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
    const totalInventoryValuePurchase = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);
    const totalInventoryValueSale = products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0);
    return { totalProducts, totalStockUnits, totalInventoryValuePurchase, totalInventoryValueSale };
  }, [products]);

  const handleExport = () => {
    const columns = [
      { header: 'Nombre Producto', dataKey: 'name' },
      { header: 'SKU', dataKey: 'sku' },
      { header: 'Precio Compra', dataKey: 'purchasePrice' },
      { header: 'Precio Venta', dataKey: 'sellingPrice' },
      { header: 'Stock', dataKey: 'stock' },
      { header: 'Valor Stock (Compra)', dataKey: 'inventoryValuePurchase' },
      { header: 'Valor Stock (Venta)', dataKey: 'inventoryValueSale' },
    ];
    const dataForPdf = products.map(p => ({
      ...p,
      inventoryValuePurchase: p.stock * p.purchasePrice,
      inventoryValueSale: p.stock * p.sellingPrice,
    }));
    exportInventoryToPdf(columns, dataForPdf, 'Listado_Inventario_Productos');
  };

  if (isLoading && products.length === 0) {
    return <div className="p-6 text-center text-slate-500">Cargando inventario...</div>;
  }
   if (error) {
    return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-lightgray min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Listado de Inventario</h1>
        <button
          onClick={handleExport}
          disabled={products.length === 0}
          className="bg-secondary hover:bg-sky-600 text-white font-semibold p-2 sm:py-2 sm:px-4 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="hidden xs:inline">Exportar a PDF</span>
          <span className="xs:hidden">PDF</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
   
        <StatCard title="Productos Distintos" value={inventoryStats.totalProducts} icon={<span>📦</span>} />
        <StatCard title="Total Unidades en Stock" value={`${inventoryStats.totalStockUnits} uds.`} icon={<span>🗃️</span>} />
        <StatCard title="Valor Inventario (Compra)" value={inventoryStats.totalInventoryValuePurchase} color="text-accent-warning" icon={<span>📊</span>} />
        <StatCard title="Valor Inventario (Venta)" value={inventoryStats.totalInventoryValueSale} color="text-accent-positive" icon={<span>📊</span>}/>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-x-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">Detalle de Productos ({products.length})</h2>
        {products.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Imagen</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre Producto</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">P. Compra</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">P. Venta</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Stock (C)</th>
                <th className="px-1.5 py-1.5 sm:px-3 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Stock (V)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap">
                    <img src={p.imageUrl || `https://picsum.photos/seed/${p.id}/40/40`} alt={p.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover"/>
                  </td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-800 max-w-[100px] sm:max-w-xs truncate" title={p.name}>{p.name}</td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-slate-600">{p.sku}</td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-right text-slate-600">{p.purchasePrice.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-right text-slate-600">{p.sellingPrice.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-right text-slate-600 font-medium">{p.stock} uds.</td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-right text-accent-warning">{(p.stock * p.purchasePrice).toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</td>
                  <td className="px-1.5 py-1 sm:px-3 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-right text-accent-positive">{(p.stock * p.sellingPrice).toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500 text-center py-10 text-lg">No hay productos en el inventario.</p>
        )}
      </div>
    </div>
  );
};

export default InventoryListContent;
