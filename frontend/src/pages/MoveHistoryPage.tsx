import React from 'react';
import { History, CheckCircle2 } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const MoveHistoryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Stock Move History & Audit Ledger</h2>
              <p className="text-xs text-slate-500">
                Immutable, chronological audit trail of all warehouse stock movements and inventory adjustments
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
              <code>StockLedger</code> table exists in SQLite database with fields for <code>deltaQty</code>, <code>balanceAfter</code>, <code>referenceType</code>, <code>referenceDoc</code>, actor ID, and timestamps.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Planned Move History Features in Stage 2:
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1">
              <li>Searchable, filterable audit log of every stock mutation.</li>
              <li>Filter by date range, product SKU, source/dest location, and operator.</li>
              <li>Track inventory balances after every transaction with guaranteed precision.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
