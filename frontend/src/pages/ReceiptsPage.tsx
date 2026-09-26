import React from 'react';
import { ArrowDownToLine, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const ReceiptsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Incoming Stock Receipts (WH/IN)</h2>
              <p className="text-xs text-slate-500">
                Receive goods from vendors, verify quantities, and validate automatic stock increases
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
              The database schema models for <code>Operation</code> (RECEIPT), <code>OperationLine</code>, and <code>StockLedger</code> have been fully designed and migrated in the database.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Planned Workflow in Stage 2:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1">
              <li>Create a new receipt document with vendor/supplier reference.</li>
              <li>Add product lines with expected demand quantities (e.g. 50 units "Steel Rods").</li>
              <li>Perform physical count at receipt bay and input received quantities.</li>
              <li>
                Click <strong>Validate</strong> &rarr; stock balances increase atomically and ledger entries are logged.
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              In accordance with Stage 1 requirements, fake operation submissions and placeholder statistics are disabled until atomic transactional workflows are wired in Stage 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
