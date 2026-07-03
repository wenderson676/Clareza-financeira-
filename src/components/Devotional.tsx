import React from 'react';
import { MonthlyData } from '../types';
import { formatCurrency, BUCKETS } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DevotionalProps {
  data: MonthlyData;
  onSaveNote: (note: string) => void;
}

export function Devotional({ data, onSaveNote }: DevotionalProps) {
  const [note, setNote] = React.useState(data.devotionalNote || '');
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSave = () => {
    onSaveNote(note);
    setIsEditing(false);
  };

  const expenses = data.transactions.filter(t => t.type === 'expense');
  
  const categoryData = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6'];

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 transition-colors">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Mordomia & Reflexão</h2>
        
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-5 mb-6 border border-transparent dark:border-emerald-500/20">
          <p className="text-emerald-800 dark:text-emerald-400 text-sm leading-relaxed mb-4">
            "Aquele que é fiel no pouco, também é fiel no muito."
            <br/>— Como você viu a provisão de Deus neste mês? Onde você sentiu que poderia ter administrado melhor os recursos que Ele confiou a você?
          </p>
          
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                className="w-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-32 transition-colors"
                placeholder="Escreva suas reflexões aqui..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <button
                onClick={handleSave}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Salvar Anotação
              </button>
            </div>
          ) : (
            <div 
              className="bg-white dark:bg-slate-800/50 rounded-lg p-4 min-h-[80px] cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {note ? (
                <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{note}</p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 text-sm italic">Clique para adicionar suas reflexões deste mês...</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 transition-colors">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Top Categorias</h2>
        
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {chartData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum gasto registrado para análise.</p>
        )}
      </div>
    </div>
  );
}
