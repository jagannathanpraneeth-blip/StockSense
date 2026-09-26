import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { createWarehouse, updateWarehouse } from '../../api/client';
import { useToast } from '../common/Toast';
import { Warehouse } from '../../types';

interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse?: Warehouse | null;
  onSuccess: (warehouse: Warehouse) => void;
}

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const isEditing = Boolean(warehouse);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name);
      setCode(warehouse.code);
      setAddress(warehouse.address || '');
      setIsActive(warehouse.isActive);
    } else {
      setName('');
      setCode('');
      setAddress('');
      setIsActive(true);
    }
    setFieldErrors({});
    setGeneralError(null);
  }, [warehouse, isOpen]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Warehouse name is required';
    if (!code.trim()) errors.code = 'Warehouse code is required';
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
        address: address.trim() || null,
        isActive,
      };

      let result: Warehouse;
      if (isEditing && warehouse) {
        result = await updateWarehouse(warehouse.id, payload);
        showSuccess(`Warehouse "${result.name}" updated successfully`);
      } else {
        result = await createWarehouse(payload);
        showSuccess(`Warehouse "${result.name}" created successfully`);
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
      const msg = err.message || (isEditing ? 'Failed to update warehouse' : 'Failed to create warehouse');
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
      title={isEditing ? `Edit Warehouse: ${warehouse?.name}` : 'Create Warehouse'}
      subtitle={isEditing ? 'Modify warehouse details' : 'Register a new warehouse facility'}
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
            Warehouse Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Central Warehouse, Production Hub"
            className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 ${
              fieldErrors.name ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
            }`}
            required
            autoFocus
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Warehouse Code <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="e.g. WH-MAIN, WH-PROD"
            className={`w-full px-3.5 py-2 text-sm font-mono uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 ${
              fieldErrors.code ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
            }`}
            required
          />
          {fieldErrors.code && (
            <p className="mt-1 text-xs text-rose-600 font-sans">{fieldErrors.code}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Address / Location Note <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Industrial Ave, Building 4"
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="warehouseActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
          />
          <label htmlFor="warehouseActive" className="text-xs font-medium text-slate-700 cursor-pointer">
            Warehouse is active and enabled for stock routing
          </label>
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
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Warehouse'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
