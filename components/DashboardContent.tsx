import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../store';
import { Product, Transaction, ChartDataPoint } from '../types';

const StatCard: React.FC<{ title: string; value: string | number; color?: string; icon?: React.ReactNode }> = ({ title, value, color = 'text-slate-800', icon }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
        <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' }) : value}</p>
      </div>
      {icon && <div className="text-2xl sm:text-3xl text-slate-400">{icon}</div>}
    </div>
  </div>
);

const ProductListItem: React.FC<{ product: Product; metricValue: string | number; metricLabel: string }> = ({ product, metricValue, metricLabel }) => (
  <li className="flex items-center justify-between py-2 px-2 sm:py-3 sm:px-4 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
    <div className="flex items-center min-w-0"> {/* Added min-w-0 for flex child truncation */}
      <img src={product.imageUrl || `https://picsum.photos/seed/${product.id}/40/40`} alt={product.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-3 object-cover flex-shrink-0"/>
      <div className="min-w-0"> {/* Added min-w-0 for flex child truncation */}
        <p className="font-semibold text-slate-700 text-sm sm:text-base truncate" title={product.name}>{product.name}</p>
        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
      </div>
    </div>
    <div className="text-right flex-shrink-0 ml-2">
        <p className="font-medium text-primary-dark text-sm sm:text-base">{metricValue}</p>
        <p className="text-xs text-slate-500">{metricLabel}</p>
    </div>
  </li>
);

const DashboardContent: React.FC = () => {
  const { state } = useAppContext();
  const { products, transactions, isLoading, error } = state;

  if (isLoading && (products.length === 0 || transactions.length === 0)) {
    return <div className="p-6 text-center text-slate-500">Cargando dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{error}</div>;
  }
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  console.log(totalIncome)
   console.log(totalExpenses)
    console.log(netProfit)
  const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
  transactions.filter(t => t.type === 'income' && t.productId && t.quantity).forEach(t => {
    if (!productSales[t.productId!]) productSales[t.productId!] = { quantity: 0, revenue: 0 };
    productSales[t.productId!].quantity += t.quantity!;
    productSales[t.productId!].revenue += t.amount;
  });
  
  const productPurchases: { [key: string]: { quantity: number; cost: number } } = {};
   transactions.filter(t => t.type === 'expense' && t.productId && t.quantity && t.category === 'Compra de Inventario').forEach(t => {
    if (!productPurchases[t.productId!]) productPurchases[t.productId!] = { quantity: 0, cost: 0 };
    productPurchases[t.productId!].quantity += t.quantity!;
    productPurchases[t.productId!].cost += t.amount;
  });

  const sortedProductsByRevenue = products
    .map(p => ({ ...p, revenue: productSales[p.id]?.revenue || 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  const sortedProductsByUnitsSold = products
    .map(p => ({ ...p, unitsSold: productSales[p.id]?.quantity || 0 }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 3);
  
  const sortedProductsByUnitsPurchased = products
    .map(p => ({...p, unitsPurchased: productPurchases[p.id]?.quantity || 0}))
    .filter(p => p.unitsPurchased > 0)
    .sort((a,b) => b.unitsPurchased - a.unitsPurchased)
    .slice(0,3);

  const slowMovingProducts = products
    .map(p => ({ ...p, unitsSold: productSales[p.id]?.quantity || 0 }))
    .filter(p => p.stock > 0) // Only consider products currently in stock for slow-moving
    .sort((a, b) => a.unitsSold - b.unitsSold)
    .slice(0, 3);

  const monthlyData: ChartDataPoint[] = [];
  const salesByMonth: { [month: string]: { income: number; expense: number } } = {};

  transactions.forEach(t => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!salesByMonth[month]) salesByMonth[month] = { income: 0, expense: 0 };
    if (t.type === 'income') salesByMonth[month].income += t.amount;
    else salesByMonth[month].expense += t.amount;
  });

  const monthMap: { [key: string]: number } = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
    'jan': 0, 'apr': 3, 'aug': 7, 'dec': 11 // English fallbacks (feb, mar, may, jun, jul, sep, oct, nov are same or covered)
  };
  
  const sortedMonths = Object.keys(salesByMonth).sort((a, b) => {
    const partsA = a.split(' '); // E.g., ["Ene", "2023"] or ["Jan", "2023"]
    const partsB = b.split(' ');

    if (partsA.length !== 2 || partsB.length !== 2) {
        // Fallback for unexpected format
        return a.localeCompare(b); 
    }

    const monthStrA = partsA[0].toLowerCase().replace('.', ''); // remove dot e.g. from "Ene."
    const yearStrA = partsA[1];
    const monthStrB = partsB[0].toLowerCase().replace('.', '');
    const yearStrB = partsB[1];
    
    const yearA = parseInt(yearStrA, 10);
    const yearB = parseInt(yearStrB, 10);

    const monthIndexA = monthMap[monthStrA];
    const monthIndexB = monthMap[monthStrB];

    if (monthIndexA === undefined || monthIndexB === undefined || isNaN(yearA) || isNaN(yearB)) {
        console.warn(`Failed to parse month/year for sorting: '${a}' or '${b}'`);
        return a.localeCompare(b); // Fallback to simple string comparison
    }

    const dateA = new Date(yearA, monthIndexA);
    const dateB = new Date(yearB, monthIndexB);
    
    return dateA.getTime() - dateB.getTime();
  });

  sortedMonths.forEach(month => {
    monthlyData.push({
      name: month,
      income: salesByMonth[month].income,
      expense: salesByMonth[month].expense,
    });
  });


  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-lightgray min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard Financiero</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard title="Ingresos Totales" value={totalIncome} color="text-accent-positive" icon={<span>💰</span>} />
        <StatCard title="Gastos Totales" value={totalExpenses} color="text-accent-negative" icon={<span>💸</span>} />
        <StatCard title="Beneficio Neto" value={netProfit} color={netProfit >= 0 ? "text-accent-positive" : "text-accent-negative"} icon={<span>📊</span>} />
      </div>

      {monthlyData.length > 0 ? (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">Resumen Mensual (Ingresos vs Gastos)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tickFormatter={(value) => `$${value/1000}k`} tick={{fontSize: 10}}/>
              <Tooltip formatter={(value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}/>
              <Legend wrapperStyle={{fontSize: "12px"}}/>
              <Bar dataKey="income" fill="#10b981" name="Ingresos" />
              <Bar dataKey="expense" fill="#f43f5e" name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
         <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center text-slate-500">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">Resumen Mensual</h2>
            <p>No hay suficientes datos de transacciones para mostrar el gráfico mensual.</p>
         </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">🏆 Top Ventas (Por Ingresos)</h2>
          <ul className="space-y-2">
            {sortedProductsByRevenue.length > 0 ? sortedProductsByRevenue.map(p => <ProductListItem key={p.id} product={p} metricValue={p.revenue.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} metricLabel="Ingresos"/>) : <p className="text-sm text-slate-500">No hay datos de ventas.</p>}
          </ul>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">🛒 Top Ventas (Por Unidades)</h2>
          <ul className="space-y-2">
             {sortedProductsByUnitsSold.length > 0 ? sortedProductsByUnitsSold.map(p => <ProductListItem key={p.id} product={p} metricValue={`${p.unitsSold} uds.`} metricLabel="Unidades Vendidas"/>) : <p className="text-sm text-slate-500">No hay datos de ventas.</p>}
          </ul>
        </div>
         <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">🛍️ Top Comprados (Inventario)</h2>
          <ul className="space-y-2">
            {sortedProductsByUnitsPurchased.length > 0 ? sortedProductsByUnitsPurchased.map(p => <ProductListItem key={p.id} product={p} metricValue={`${p.unitsPurchased} uds.`} metricLabel="Unidades Compradas"/>) : <p className="text-sm text-slate-500">No hay datos de compras de inventario.</p>}
          </ul>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">📉 Productos de Lento Movimiento</h2>
        <ul className="space-y-2">
          {slowMovingProducts.length > 0 ? slowMovingProducts.map(p => <ProductListItem key={p.id} product={p} metricValue={`${p.unitsSold} uds.`} metricLabel="Unidades Vendidas"/>) : <p className="text-sm text-slate-500">No hay suficientes productos para analizar o todos los productos en stock se han vendido.</p>}
        </ul>
      </div>
    </div>
  );
};

export default DashboardContent;

// Mejoras responsivas en paddings, grids, tablas y botones
// Se agregan clases como xs:text-xs, xs:p-2, overflow-x-auto, y max-w-xs en tablas y formularios
