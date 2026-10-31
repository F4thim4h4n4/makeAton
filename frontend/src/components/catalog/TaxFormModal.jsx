import { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';

function TaxFormModal({ tax, onClose }) {
  const isEdit = !!tax;
  const [form, setForm] = useState({
    name: '',
    type: 'percentage',
    rate: '',
    applicableProducts: [],
    effectiveFrom: '',
    effectiveTo: '',
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
        console.error('Failed to load products for tax modal', err);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (tax) {
      const selectedProductIds = tax.applicableProducts
        ? tax.applicableProducts.map((p) => (typeof p === 'object' ? p._id : p))
        : [];

      setForm({
        name: tax.name || '',
        type: tax.type || 'percentage',
        rate: tax.rate?.toString() || '',
        applicableProducts: selectedProductIds,
        effectiveFrom: tax.effectiveFrom ? tax.effectiveFrom.slice(0, 10) : '',
        effectiveTo: tax.effectiveTo ? tax.effectiveTo.slice(0, 10) : '',
        status: tax.status || 'active',
      });
    }
  }, [tax]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Tax name is required';
    if (form.rate === '' || isNaN(form.rate)) {
      errs.rate = 'Valid rate is required';
    } else {
      const r = Number(form.rate);
      if (r < 0) {
        errs.rate = 'Rate cannot be negative';
      } else if (form.type === 'percentage' && r > 100) {
        errs.rate = 'Percentage rate cannot exceed 100%';
      }
    }
    if (
      form.effectiveFrom &&
      form.effectiveTo &&
      new Date(form.effectiveTo) < new Date(form.effectiveFrom)
    ) {
      errs.effectiveTo = 'Effective To date cannot be before Effective From date';
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
        type: form.type,
        rate: Number(form.rate),
        applicableProducts: form.applicableProducts.length > 0 ? form.applicableProducts : [],
        effectiveFrom: form.effectiveFrom || undefined,
        effectiveTo: form.effectiveTo || undefined,
        status: form.status,
      };
      if (isEdit) {
        await apiClient.patch(`/taxes/${tax._id}`, payload);
      } else {
        await apiClient.post('/taxes', payload);
      }
      onClose(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save tax rule');
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
            {isEdit ? 'Edit Tax Rule' : 'Add Tax Rule'}
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
            <label htmlFor="tax-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Tax Name <span className="text-red-500">*</span>
            </label>
            <input
              id="tax-name"
              type="text"
              placeholder="e.g. GST 18%, VAT 5%, State Surcharge"
              value={form.name}
              onChange={handleChange('name')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.name ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tax-type" className="block text-sm font-medium text-neutral-700 mb-1">
                Tax Type <span className="text-red-500">*</span>
              </label>
              <select
                id="tax-type"
                value={form.type}
                onChange={handleChange('type')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label htmlFor="tax-rate" className="block text-sm font-medium text-neutral-700 mb-1">
                Rate / Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                max={form.type === 'percentage' ? '100' : undefined}
                placeholder={form.type === 'percentage' ? 'e.g. 18' : 'e.g. 100'}
                value={form.rate}
                onChange={handleChange('rate')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.rate ? 'border-red-400' : 'border-neutral-300'
                }`}
              />
              {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
            </div>
          </div>

          {/* Applicable Products */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Applicable Products
            </label>
            <div className="border border-neutral-300 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
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
              Leave unselected to apply this tax rule universally to all products.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tax-from" className="block text-sm font-medium text-neutral-700 mb-1">
                Effective From
              </label>
              <input
                id="tax-from"
                type="date"
                value={form.effectiveFrom}
                onChange={handleChange('effectiveFrom')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="tax-to" className="block text-sm font-medium text-neutral-700 mb-1">
                Effective To
              </label>
              <input
                id="tax-to"
                type="date"
                value={form.effectiveTo}
                onChange={handleChange('effectiveTo')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.effectiveTo ? 'border-red-400' : 'border-neutral-300'
                }`}
              />
              {errors.effectiveTo && (
                <p className="text-red-500 text-xs mt-1">{errors.effectiveTo}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tax-status" className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              id="tax-status"
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
              {saving ? 'Saving...' : isEdit ? 'Update Tax Rule' : 'Create Tax Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaxFormModal;
