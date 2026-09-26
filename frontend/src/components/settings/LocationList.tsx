import React from 'react';
import { Edit2, MapPin, Trash2, Building2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Location } from '../../types';

interface LocationListProps {
  locations: Location[];
  onEditLocation: (location: Location) => void;
  onCreateLocation: () => void;
}

export const LocationList: React.FC<LocationListProps> = ({
  locations,
  onEditLocation,
  onCreateLocation,
}) => {
  if (locations.length === 0) {
    return (
      <EmptyState
        title="No storage locations found"
        description="Add bays, racks, input zones, or scrap locations under your warehouses."
        actionText="Add Location"
        icon={MapPin}
        onAction={onCreateLocation}
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="px-4 py-3">Location Code</th>
              <th className="px-4 py-3">Location Name</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-purple-50/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                    {loc.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{loc.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {loc.warehouse?.name || 'Warehouse'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {loc.isScrap ? (
                    <Badge variant="danger" size="sm">
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        Scrap / Quarantine
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="purple" size="sm">
                      Standard Storage
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={loc.isActive ? 'success' : 'neutral'} size="sm">
                    {loc.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEditLocation(loc)}
                    className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-100/60 rounded-lg transition-colors"
                    title="Edit location"
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
