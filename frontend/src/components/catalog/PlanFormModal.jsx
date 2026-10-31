import { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';

function PlanFormModal({ plan, onClose }) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    name: '',
    description: '',
    productIds: [],
    billingInterval: 'monthly',
    price: '',
    minQuantity: '1',
    availableFrom: '',
    availableUntil: '',
    allowEarlyClose: false,
    allowPause: false,
    allowRenewal: true,
    autoCloseOnExpiry: false,
    status: 'active',
  });
  const [productsList, setProductsList] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    // Load products to associate
    const loadProducts = async () => {
      try {
        const res = await apiClient.get('/products', { params: { limit: 100 } });
        setProductsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to load products for plan modal', err);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (plan) {
      const selectedProductIds = plan.productIds
        ? plan.productIds.map((p) => (typeof p === 'object' ? p._id : p))
        : [];

      setForm({
        name: plan.name || '',
        description: plan.description || '',
        productIds: selectedProductIds,
        billingInterval: plan.billingInterval || 'monthly',
        price: plan.price?.toString() || '',
        minQuantity: plan.minQuantity?.toString() || '1',
        availableFrom: plan.availableFrom ? plan.availableFrom.slice(0, 10) : '',
        availableUntil: plan.availableUntil ? plan.availableUntil.slice(0, 10) : '',
        allowEarlyClose: plan.allowEarlyClose || false,
        allowPause: plan.allowPause || false,
        allowRenewal: plan.allowRenewal ?? true,
        autoCloseOnExpiry: plan.autoCloseOnExpiry || false,
        status: plan.status || 'active',
      });
    }
  }, [plan]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Plan name is required';
    if (form.price === '' || isNaN(form.price)) {
      errs.price = 'Valid price is required';
    } else if (Number(form.price) < 0) {
      errs.price = 'Price cannot be negative';
    }
    if (form.minQuantity && (isNaN(form.minQuantity) || Number(form.minQuantity) < 1)) {
      errs.minQuantity = 'Min quantity must be at least 1';
    }
    if (
      form.availableFrom &&
      form.availableUntil &&
      new Date(form.availableUntil) < new Date(form.availableFrom)
    ) {
      errs.availableUntil = 'End date cannot be before start date';
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
        productIds: form.productIds.length > 0 ? form.productIds : [],
        billingInterval: form.billingInterval,
        price: Number(form.price),
        minQuantity: Number(form.minQuantity) || 1,
        availableFrom: form.availableFrom || undefined,
        availableUntil: form.availableUntil || undefined,
        allowEarlyClose: form.allowEarlyClose,
        allowPause: form.allowPause,
        allowRenewal: form.allowRenewal,
        autoCloseOnExpiry: form.autoCloseOnExpiry,
        status: form.status,
      };
      if (isEdit) {
        await apiClient.patch(`/plans/${plan._id}`, payload);
      } else {
        await apiClient.post('/plans', payload);
      }
      onClose(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleProductToggle = (productId) => {
    setForm((prev) => {
      const exists = prev.productIds.includes(productId);
      const updated = exists
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds: updated };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit Plan' : 'Add Plan'}
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
            <label htmlFor="plan-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              id="plan-name"
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.name ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="plan-desc" className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              id="plan-desc"
              rows={2}
              value={form.description}
              onChange={handleChange('description')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Associated Products */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Associated Products
            </label>
            <div className="border border-neutral-300 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
              {productsList.length === 0 ? (
                <p className="text-xs text-neutral-400">No products available</p>
              ) : (
                productsList.map((pr) => (
                  <label
                    key={pr._id}
                    className="flex items-center gap-2 text-xs text-neutral-700 hover:bg-neutral-50 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(pr._id)}
                      onChange={() => handleProductToggle(pr._id)}
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{pr.name}</span>
                    <span className="text-neutral-400 ml-auto font-mono">₹{pr.salesPrice}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Optional: Select which product(s) this plan applies to.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-interval" className="block text-sm font-medium text-neutral-700 mb-1">
                Billing Interval <span className="text-red-500">*</span>
              </label>
              <select
                id="plan-interval"
                value={form.billingInterval}
                onChange={handleChange('billingInterval')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label htmlFor="plan-price" className="block text-sm font-medium text-neutral-700 mb-1">
                Billing Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                id="plan-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange('price')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.price ? 'border-red-400' : 'border-neutral-300'
                }`}
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="plan-min-qty" className="block text-sm font-medium text-neutral-700 mb-1">
              Minimum Quantity
            </label>
            <input
              id="plan-min-qty"
              type="number"
              min="1"
              value={form.minQuantity}
              onChange={handleChange('minQuantity')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.minQuantity ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {errors.minQuantity && <p className="text-red-500 text-xs mt-1">{errors.minQuantity}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-from" className="block text-sm font-medium text-neutral-700 mb-1">
                Available From
              </label>
              <input
                id="plan-from"
                type="date"
                value={form.availableFrom}
                onChange={handleChange('availableFrom')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="plan-until" className="block text-sm font-medium text-neutral-700 mb-1">
                Available Until
              </label>
              <input
                id="plan-until"
                type="date"
                value={form.availableUntil}
                onChange={handleChange('availableUntil')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.availableUntil ? 'border-red-400' : 'border-neutral-300'
                }`}
              />
              {errors.availableUntil && (
                <p className="text-red-500 text-xs mt-1">{errors.availableUntil}</p>
              )}
            </div>
          </div>

          {/* Toggle flags */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <p className="text-sm font-medium text-neutral-700 mb-1">Plan Permissions & Lifecycle</p>
            {[
              ['allowPause', 'Allow customer to pause subscription'],
              ['allowRenewal', 'Allow subscription renewal'],
              ['allowEarlyClose', 'Allow early termination / closure'],
              ['autoCloseOnExpiry', 'Auto-close when plan expires'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={handleChange(key)}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label htmlFor="plan-status" className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              id="plan-status"
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
              {saving ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlanFormModal;