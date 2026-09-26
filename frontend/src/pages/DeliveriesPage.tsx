import React from 'react';
import { ArrowUpFromLine, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const DeliveriesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Delivery Orders (WH/OUT)</h2>
              <p className="text-xs text-slate-500">
                Pick, pack, and ship inventory items to fulfill customer sales orders
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
              Database models support customer references, pick/pack line allocations, and strict validation checks to prevent negative on-hand balances.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Planned Delivery Workflow in Stage 2:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1">
              <li>Create delivery order for customer (e.g. Sales Order for 10 Chairs).</li>
              <li>Check real-time stock availability across warehouses.</li>
              <li>Pick & pack items from designated storage bins.</li>
              <li>
                Validate delivery &rarr; system verifies sufficient stock, decrements location balances, and logs ledger delta.
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Direct stock deduction will only occur upon full atomic document validation in Stage 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
