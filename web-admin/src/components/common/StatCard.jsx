import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-600',
      text: 'text-blue-600',
      border: 'hover:border-blue-300'
    },
    emerald: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'hover:border-emerald-300'
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500',
      text: 'text-amber-600',
      border: 'hover:border-amber-300'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-600',
      text: 'text-purple-600',
      border: 'hover:border-purple-300'
    },
    rose: {
      bg: 'bg-rose-50',
      iconBg: 'bg-rose-600',
      text: 'text-rose-600',
      border: 'hover:border-rose-300'
    }
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm transition-all duration-200 ${selectedColor.border}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${selectedColor.iconBg} text-white shadow-sm`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            {subtitle}
          </p>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs font-medium text-slate-600">
          {trend}
        </div>
      )}
    </div>
  );
};

export default StatCard;
