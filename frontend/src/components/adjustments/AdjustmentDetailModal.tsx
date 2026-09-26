import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  SlidersHorizontal,
  Ban,
  Package,
  ArrowRight,
} from 'lucide-react';
import { Operation } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface AdjustmentDetailModalProps {
  adjustmentId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const AdjustmentDetailModal: React.FC<AdjustmentDetailModalProps> = ({
  adjustmentId,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [adjustment, setAdjustment] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const loadAdjustment = async () => {
    if (!adjustmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdjustment(adjustmentId);
      setAdjustment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load adjustment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adjustmentId) {
      loadAdjustment();
    } else {
      setAdjustment(null);
      setError(null);
    }
  }, [adjustmentId]);

  if (!adjustmentId) return null;

  const handleValidate = async () => {
    if (!adjustment) return;
    setActionLoading(true);
    try {
      await api.validateAdjustment(adjustment.id, adjustment.version);
      showSuccess('Inventory adjustment validated and ledger updated!');
      await loadAdjustment();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to validate adjustment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!adjustment || !confirm('Are you sure you want to cancel this adjustment?')) return;
    setActionLoading(true);
    try {
      await api.cancelAdjustment(adjustment.id);
      showSuccess('Adjustment canceled');
      await loadAdjustment();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to cancel adjustment');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge variant="success" size="md">Applied (Done)</Badge>;
      case 'CANCELED':
        return <Badge variant="neutral" size="md">Canceled</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="purple" size="md">Draft Count</Badge>;
    }
  };

  const line = adjustment?.lines?.[0];
  const snapshotBal = line?.balanceSnapshot ?? 0;
  const countedQty = line?.doneQty ?? 0;
  const delta = countedQty - snapshotBal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {adjustment?.reference || 'Inventory Adjustment'}
                </h3>
                {adjustment && getStatusBadge(adjustment.status)}
              </div>
              <p className="text-xs text-slate-500">Physical inventory count reconciliation (WH/ADJ)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Clock className="w-6 h-6 animate-spin text-purple-600 mb-2" />
              <span>Loading adjustment details...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          ) : adjustment ? (
            <>
              {/* Product & Location Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Adjusted Product
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Package className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{line?.product?.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-1">
                    SKU: {line?.product?.sku}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Location Counted
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>
                      {adjustment.destLocation?.warehouse?.name} - {adjustment.destLocation?.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-1">
                    Code: {adjustment.destLocation?.code}
                  </span>
                </div>
              </div>

              {/* Count Reconciliation Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Count Reconciliation Breakdown
                </h4>

                <div className="grid grid-cols-3 gap-3 items-center text-center">
                  {/* Snapshot Quantity */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Snapshot Balance
                    </span>
                    <span className="text-base font-bold font-mono text-slate-700">
                      {Number(snapshotBal).toFixed(4)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {line?.product?.uom || 'units'}
                    </span>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center text-slate-400">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  {/* Counted Quantity */}
                  <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-xs">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-1">
                      Physical Count
                    </span>
                    <span className="text-base font-bold font-mono text-purple-700">
                      {Number(countedQty).toFixed(4)}
                    </span>
                    <span className="text-[10px] text-purple-600 block mt-0.5">
                      {line?.product?.uom || 'units'}
                    </span>
                  </div>
                </div>

                {/* Delta result banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                    delta > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : delta < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>Reconciliation Delta:</span>
                  <span className="font-mono font-bold text-sm">
                    {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)} {line?.product?.uom}
                    {delta === 0 ? ' (Exact Match / Zero Variance)' : delta > 0 ? ' (Stock Added)' : ' (Stock Deducted)'}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {adjustment.status === 'DONE' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Adjustment Validated & Applied</h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      The inventory balance at this location has been corrected to match the physical count of{' '}
                      {Number(countedQty).toFixed(4)} {line?.product?.uom}. Recorded on{' '}
                      {adjustment.validatedAt ? new Date(adjustment.validatedAt).toLocaleString() : 'validation'}.
                    </p>
                  </div>
                </div>
              )}

              {adjustment.status === 'CANCELED' && (
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
                  <Ban className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>This adjustment was canceled. No inventory balances were modified.</span>
                </div>
              )}

              {/* Audit Trail & Reason */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Reason / Notes:</span>{' '}
                  <span className="text-slate-600">{adjustment.notes || 'No reason provided'}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                  <span>Counted By: {adjustment.createdBy?.name || 'Operator'}</span>
                  <span>Created: {new Date(adjustment.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            {adjustment?.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
              >
                Cancel Count
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Close
            </button>

            {adjustment?.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={actionLoading || !isManagerOrAdmin}
                title={
                  !isManagerOrAdmin
                    ? 'Only Inventory Managers and Admins can validate adjustments'
                    : 'Validate and update stock balance'
                }
                className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                  isManagerOrAdmin
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validate & Apply Adjustment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
