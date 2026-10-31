import { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';

function DiscountFormModal({ discount, onClose }) {
  const isEdit = !!discount;
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: '',
    minPurchaseAmount: '0',
    minQuantity: '0',
    startDate: '',
    endDate: '',
    maxUsageCount: '0',
    applicableProducts: [],
    scope: 'product',
    status: 'active',
  });
  const [productsList, setProductsList] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await apiClient.get('/products', { params: { limit: 100 } });
        setProductsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to load products for discount modal', err);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (discount) {
      const selectedProductIds = discount.applicableProducts
        ? discount.applicableProducts.map((p) => (typeof p === 'object' ? p._id : p))
        : [];

      setForm({
        name: discount.name || '',
        description: discount.description || '',
        type: discount.type || 'percentage',
        value: discount.value?.toString() || '',
        minPurchaseAmount: discount.minPurchaseAmount?.toString() || '0',
        minQuantity: discount.minQuantity?.toString() || '0',
        startDate: discount.startDate ? discount.startDate.slice(0, 10) : '',
        endDate: discount.endDate ? discount.endDate.slice(0, 10) : '',
        maxUsageCount: discount.maxUsageCount?.toString() || '0',
        applicableProducts: selectedProductIds,
        scope: discount.scope || 'product',
        status: discount.status || 'active',
      });
    }
  }, [discount]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Discount name is required';
    if (form.value === '' || isNaN(form.value)) {
      errs.value = 'Valid value is required';
    } else {
      const v = Number(form.value);
      if (v < 0) {
        errs.value = 'Value cannot be negative';
      } else if (form.type === 'percentage' && v > 100) {
        errs.value = 'Percentage discount cannot exceed 100%';
      }
    }
    if (form.minPurchaseAmount && Number(form.minPurchaseAmount) < 0) {
      errs.minPurchaseAmount = 'Cannot be negative';
    }
    if (form.minQuantity && Number(form.minQuantity) < 0) {
      errs.minQuantity = 'Cannot be negative';
    }
    if (form.maxUsageCount && Number(form.maxUsageCount) < 0) {
      errs.maxUsageCount = 'Cannot be negative';
    }
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      errs.endDate = 'End date cannot be before start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value),
        minPurchaseAmount: Number(form.minPurchaseAmount) || 0,
        minQuantity: Number(form.minQuantity) || 0,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        maxUsageCount: Number(form.maxUsageCount) || 0,
        applicableProducts: form.applicableProducts.length > 0 ? form.applicableProducts : [],
        scope: form.scope,
        status: form.status,
      };
      if (isEdit) {
        await apiClient.patch(`/discounts/${discount._id}`, payload);
      } else {
        await apiClient.post('/discounts', payload);
      }
      onClose(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save discount rule');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleProductToggle = (productId) => {
    setForm((prev) => {
      const exists = prev.applicableProducts.includes(productId);
      const updated = exists
        ? prev.applicableProducts.filter((id) => id !== productId)
        : [...prev.applicableProducts, productId];
      return { ...prev, applicableProducts: updated };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit Discount Rule' : 'Add Discount Rule'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-neutral-400 hover:text-neutral-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="discount-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Discount Name / Code <span className="text-red-500">*</span>
            </label>
            <input
              id="discount-name"
              type="text"
              placeholder="e.g. SUMMER20, WELCOME500, VIP TIER"
              value={form.name}
              onChange={handleChange('name')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.name ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="discount-desc" className="block text-sm font-medium text-neutral-700 mb-1">
              Description / Terms
            </label>
            <textarea
              id="discount-desc"
              rows={2}
              value={form.description}
              onChange={handleChange('description')}
              placeholder="e.g. 20% discount on first month subscription"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="discount-type" className="block text-sm font-medium text-neutral-700 mb-1">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                id="discount-type"
                value={form.type}
                onChange={handleChange('type')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label htmlFor="discount-val" className="block text-sm font-medium text-neutral-700 mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                id="discount-val"
                type="number"
                step="0.01"
                min="0"
                max={form.type === 'percentage' ? '100' : undefined}
                placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 500'}
                value={form.value}
                onChange={handleChange('value')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.value ? 'border-red-400' : 'border-neutral-300'
                }`}
              />
              {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="discount-scope" className="block text-sm font-medium text-neutral-700 mb-1">
                Application Scope
              </label>
              <select
                id="discount-scope"
                value={form.scope}
                onChange={handleChange('scope')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="product">Selected Products</option>
                <option value="subscription">Whole Subscription</option>
              </select>
            </div>
            <div>
              <label htmlFor="discount-max-usage" className="block text-sm font-medium text-neutral-700 mb-1">
                Max Usage Limit (0 = unlimited)
              </label>
              <input
                id="discount-max-usage"
                type="number"
                min="0"
                value={form.maxUsageCount}
                onChange={handleChange('maxUsageCount')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="discount-min-purchase" className="block text-sm font-medium text-neutral-700 mb-1">
                Min Purchase Amount (₹)
              </label>
              <input
                id="discount-min-purchase"
                type="number"
                step="0.01"
                min="0"
                value={form.minPurchaseAmount}
                onChange={handleChange('minPurchaseAmount')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="discount-min-qty" className="block text-sm font-medium text-neutral-700 mb-1">
                Min Quantity
              </label>
              <input
                id="discount-min-qty"
                type="number"
                min="0"
                value={form.minQuantity}
                onChange={handleChange('minQuantity')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="discount-start" className="block text-sm font-medium text-neutral-700 mb-1">
                Start Date
              </label>
              <input
                id="discount-start"
                type="date"
                value={form.startDate}
                onChange={handleChange('startDate')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="discount-end" className="block text-sm font-medium text-neutral-700 mb-1">
                End Date
              </label>
              <input
                id="discount-end"
                type="date"
                value={form.endDate}
                onChange={handleChange('endDate')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.endDate ? 'border-red-400' : 'border-neutral-300'
                }`}
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Applicable Products */}
          {form.scope === 'product' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Applicable Products
              </label>
              <div className="border border-neutral-300 rounded-lg p-2 max-h-28 overflow-y-auto space-y-1">
                {productsList.length === 0 ? (
                  <p className="text-xs text-neutral-400">No products found</p>
                ) : (
                  productsList.map((pr) => (
                    <label
                      key={pr._id}
                      className="flex items-center gap-2 text-xs text-neutral-700 hover:bg-neutral-50 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.applicableProducts.includes(pr._id)}
                        onChange={() => handleProductToggle(pr._id)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>{pr.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Leave unselected to make eligible for all products.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="discount-status" className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              id="discount-status"
              value={form.status}
              onChange={handleChange('status')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => onClose(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update Discount' : 'Create Discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DiscountFormModal;
