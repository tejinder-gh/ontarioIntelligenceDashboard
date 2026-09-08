import React from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
  label?: string;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, filename, label, className = '' }) => {
  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(fieldName => {
          const val = row[fieldName];
          const clean = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
          return `"${clean}"`;
        }).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (!data || data.length === 0) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={exportCSV}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors shadow-sm"
        title="Export CSV data"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
        CSV
      </button>
      <button
        type="button"
        onClick={exportJSON}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors shadow-sm"
        title="Export JSON data"
      >
        <FileJson className="w-3.5 h-3.5 text-indigo-400" />
        JSON
      </button>
    </div>
  );
};
