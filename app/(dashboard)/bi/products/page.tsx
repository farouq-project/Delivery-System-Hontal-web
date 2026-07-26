'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { RankingTable }  from '@/components/bi/RankingTable';
import { SectionHeader } from '@/components/bi/SectionHeader';
import { EmptyState }    from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum } from '@/components/bi/format';
import { ShoppingBag, AlertCircle } from 'lucide-react';

export default function BiProductsPage() {
  const { label, unitLabel } = useMerchantLabels();
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'products'],
    queryFn: biApi.products,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading product insights…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load product data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  if (!d.has_data) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Product sales analytics</p>
        </div>
        <div className="bg-white border border-amber-300 rounded-lg p-4 flex gap-3 max-w-lg shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 text-sm">Data Limited</p>
            <p className="text-xs text-amber-600 mt-0.5">
              No product data has been recorded yet. Ensure orders include a product name to enable product analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const topSelling: Array<Record<string, unknown>> = d.top_selling ?? [];
  const topRevenue: Array<Record<string, unknown>> = d.top_revenue ?? [];

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-0.5">Product performance ranked by order volume and revenue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <SectionHeader title="Top Selling" description="By number of orders" />
          <RankingTable
            rows={topSelling}
            keyField="product_name"
            columns={[
              { key: 'product_name', label: 'Product' },
              { key: 'total_orders', label: label('orders'), align: 'right',
                render: (v) => fmtNum(Number(v)) },
              { key: 'delivered', label: `${unitLabel} Delivered`, align: 'right',
                render: (v) => fmtNum(Number(v)) },
              { key: 'revenue', label: label('revenue'), align: 'right',
                render: (v) => fmtIdr(Number(v)) },
            ]}
          />
        </section>

        <section>
          <SectionHeader title="Highest Revenue" description="By delivered order value" />
          <RankingTable
            rows={topRevenue}
            keyField="product_name"
            columns={[
              { key: 'product_name', label: 'Product' },
              { key: 'revenue', label: 'Revenue', align: 'right',
                render: (v) => fmtIdr(Number(v)) },
              { key: 'total_orders', label: 'Orders', align: 'right',
                render: (v) => fmtNum(Number(v)) },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
