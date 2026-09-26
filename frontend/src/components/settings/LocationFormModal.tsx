import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { createLocation, updateLocation } from '../../api/client';
import { useToast } from '../common/Toast';
import { Location, Warehouse } from '../../types';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: Location | null;
  warehouses: Warehouse[];
  onSuccess: (location: Location) => void;
}

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  location,
  warehouses,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const isEditing = Boolean(location);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [isScrap, setIsScrap] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setCode(location.code);
      setWarehouseId(location.warehouseId);
      setIsScrap(location.isScrap);
      setIsActive(location.isActive);
    } else {
      setName('');
      setCode('');
      setWarehouseId(warehouses[0]?.id || '');
      setIsScrap(false);
      setIsActive(true);
    }
    setFieldErrors({});
    setGeneralError(null);
  }, [location, isOpen, warehouses]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Location name is required';
    if (!code.trim()) errors.code = 'Location code is required';
    if (!warehouseId) errors.warehouseId = 'Warehouse selection is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setFieldErrors({});
      setGeneralError(null);

      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        warehouseId,
        isScrap,
        isActive,
      };

      let result: Location;
      if (isEditing && location) {
        result = await updateLocation(location.id, payload);
        showSuccess(`Location "${result.name}" updated successfully`);
      } else {
        result = await createLocation(payload);
        showSuccess(`Location "${result.name}" created successfully`);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      if (err.details) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.details)) {
          mapped[key] = (msgs as string[])[0];
        }
        setFieldErrors(mapped);
      }
      const msg = err.message || (isEditing ? 'Failed to update location' : 'Failed to create location');
      setGeneralError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Location: ${location?.name}` : 'Create Location'}
      subtitle={isEditing ? 'Modify storage zone parameters' : 'Add a shelf, rack, bay, or scrap location'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {generalError}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Parent Warehouse <span className="text-rose-500">*</span>
          </label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              if (fieldErrors.warehouseId) setFieldErrors((prev) => ({ ...prev, warehouseId: '' }));
            }}
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 ${
              fieldErrors.warehouseId ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
            }`}
            required
          >
            <option value="" disabled>Select Warehouse</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
          {fieldErrors.warehouseId && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.warehouseId}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Location Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Stock, Rack A, Shipping Dock, Scrap Zone"
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 ${
              fieldErrors.name ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
            }`}
            required
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Location Code <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="e.g. WH-MAIN/STOCK, WH-PROD/RACK-A"
            className={`w-full px-3.5 py-2 text-sm font-mono uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 ${
              fieldErrors.code ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
            }`}
            required
          />
          {fieldErrors.code && (
            <p className="mt-1 text-xs text-rose-600 font-sans">{fieldErrors.code}</p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isScrap"
              checked={isScrap}
              onChange={(e) => setIsScrap(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="isScrap" className="text-xs font-medium text-slate-700 cursor-pointer">
              Is Scrap / Quarantine Location (items moved here count as written off)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="locationActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="locationActive" className="text-xs font-medium text-slate-700 cursor-pointer">
              Location is active and available for movement operations
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
