import React from 'react';
import { SlidersHorizontal, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const AdjustmentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inventory Adjustments (WH/ADJ)</h2>
              <p className="text-xs text-slate-500">
                Reconcile physical inventory counts with recorded system balances and log variance deltas
              </p>
            </div>
          </div>
          <Badge variant="warning" size="md">
            Pending Stage 2 Implementation
          </Badge>
        </div>

        <div className="py-6 space-y-4">
          <div className="p-4 bg-purple-50/60 border border-purple-200/60 rounded-xl text-xs text-purple-900 space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              Stage 1 Foundation Prepared:
            </p>
            <p className="text-purple-800 leading-relaxed">
              Data structure supports opening-stock entries, physical count inputs, damaged stock write-offs, and signed delta calculations (+/&minus;).
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Adjustment Process in Stage 2:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1">
              <li>Select Product and Location.</li>
              <li>View system recorded on-hand quantity.</li>
              <li>Enter actual counted quantity (e.g. 3 kg damaged steel &rarr; delta -3 kg).</li>
              <li>
                Validate &rarr; auto-updates location balance and writes an audit record to the Stock Ledger.
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Direct un-audited balance overwriting is strictly blocked. In Stage 2, all stock changes will pass through ledger delta transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
