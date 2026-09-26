import React from 'react';
import { Edit2, Building2, MapPin } from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Warehouse } from '../../types';

interface WarehouseListProps {
  warehouses: Warehouse[];
  onEditWarehouse: (warehouse: Warehouse) => void;
  onCreateWarehouse: () => void;
}

export const WarehouseList: React.FC<WarehouseListProps> = ({
  warehouses,
  onEditWarehouse,
  onCreateWarehouse,
}) => {
  if (warehouses.length === 0) {
    return (
      <EmptyState
        title="No warehouses configured"
        description="Register a primary warehouse to start defining inventory storage locations."
        actionText="Add Warehouse"
        icon={Building2}
        onAction={onCreateWarehouse}
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Warehouse Name</th>
              <th className="px-4 py-3">Address / Details</th>
              <th className="px-4 py-3">Locations</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {warehouses.map((wh) => (
              <tr key={wh.id} className="hover:bg-purple-50/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                    {wh.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{wh.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {wh.address || <span className="text-slate-400 italic">No address provided</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                    <MapPin className="w-3 h-3 text-purple-600" />
                    {wh._count?.locations ?? 0} locations
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={wh.isActive ? 'success' : 'neutral'} size="sm">
                    {wh.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEditWarehouse(wh)}
                    className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-100/60 rounded-lg transition-colors"
                    title="Edit warehouse"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
