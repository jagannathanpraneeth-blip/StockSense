import React, { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Plus, RefreshCw, Filter } from 'lucide-react';
import { getWarehouses, getLocations } from '../api/client';
import { Warehouse, Location } from '../types';
import { WarehouseList } from '../components/settings/WarehouseList';
import { WarehouseFormModal } from '../components/settings/WarehouseFormModal';
import { LocationList } from '../components/settings/LocationList';
import { LocationFormModal } from '../components/settings/LocationFormModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../components/common/Toast';

export const SettingsPage: React.FC = () => {
  const { showError } = useToast();

  const [activeTab, setActiveTab] = useState<'warehouses' | 'locations'>('warehouses');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [whsData, locsData] = await Promise.all([
        getWarehouses(),
        getLocations(warehouseFilter || undefined),
      ]);
      setWarehouses(whsData);
      setLocations(locsData);
    } catch (err: any) {
      showError(err.message || 'Failed to load warehouse settings');
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateWarehouse = () => {
    setSelectedWarehouse(null);
    setIsWarehouseModalOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsWarehouseModalOpen(true);
  };

  const handleCreateLocation = () => {
    setSelectedLocation(null);
    setIsLocationModalOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setIsLocationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Warehouse & Storage Settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure multi-warehouse hierarchies, storage bays, input/output docks, and quarantine zones
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'warehouses' ? (
            <button
              onClick={handleCreateWarehouse}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Warehouse</span>
            </button>
          ) : (
            <button
              onClick={handleCreateLocation}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'warehouses'
                ? 'bg-white text-purple-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Warehouses ({warehouses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'locations'
                ? 'bg-white text-purple-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Locations ({locations.length})</span>
          </button>
        </div>

        {/* Location filter dropdown if activeTab === 'locations' */}
        <div className="flex items-center gap-2 px-1">
          {activeTab === 'locations' && (
            <div className="relative flex-1 sm:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 cursor-pointer"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchData}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <LoadingSpinner label="Loading warehouse structure..." fullHeight />
      ) : activeTab === 'warehouses' ? (
        <WarehouseList
          warehouses={warehouses}
          onEditWarehouse={handleEditWarehouse}
          onCreateWarehouse={handleCreateWarehouse}
        />
      ) : (
        <LocationList
          locations={locations}
          onEditLocation={handleEditLocation}
          onCreateLocation={handleCreateLocation}
        />
      )}

      {/* Warehouse Form Modal */}
      <WarehouseFormModal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        warehouse={selectedWarehouse}
        onSuccess={fetchData}
      />

      {/* Location Form Modal */}
      <LocationFormModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        location={selectedLocation}
        warehouses={warehouses}
        onSuccess={fetchData}
      />
    </div>
  );
};
