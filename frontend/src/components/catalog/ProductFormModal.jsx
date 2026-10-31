import { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';

function ProductFormModal({ product, onClose }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: '',
    type: '',
    salesPrice: '',
    costPrice: '',
    notes: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        type: product.type || '',
        salesPrice: product.salesPrice?.toString() || '',
        costPrice: product.costPrice?.toString() || '',
        notes: product.notes || '',
        status: product.status || 'active',
      });
    }
  }, [product]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (form.salesPrice === '' || isNaN(form.salesPrice)) errs.salesPrice = 'Valid sales price is required';
    else if (Number(form.salesPrice) < 0) errs.salesPrice = 'Price cannot be negative';
    if (form.costPrice && isNaN(form.costPrice)) errs.costPrice = 'Invalid cost price';
    else if (form.costPrice && Number(form.costPrice) < 0) errs.costPrice = 'Price cannot be negative';
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
        type: form.type.trim() || undefined,
        salesPrice: Number(form.salesPrice),
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        notes: form.notes || undefined,
        status: form.status,
      };
      if (isEdit) {
        await apiClient.patch(`/products/${product._id}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }
      onClose(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={() => onClose(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {serverError}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-400' : 'border-neutral-300'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Type */}
          <div>
            <label htmlFor="product-type" className="block text-sm font-medium text-neutral-700 mb-1">
              Product Type
            </label>
            <input
              id="product-type"
              type="text"
              value={form.type}
              onChange={handleChange('type')}
              placeholder="e.g. Software, Service, Hardware"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-sales-price" className="block text-sm font-medium text-neutral-700 mb-1">
                Sales Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                id="product-sales-price"
                type="number"
                step="0.01"
                min="0"
                value={form.salesPrice}
                onChange={handleChange('salesPrice')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.salesPrice ? 'border-red-400' : 'border-neutral-300'}`}
              />
              {errors.salesPrice && <p className="text-red-500 text-xs mt-1">{errors.salesPrice}</p>}
            </div>
            <div>
              <label htmlFor="product-cost-price" className="block text-sm font-medium text-neutral-700 mb-1">
                Cost Price (₹)
              </label>
              <input
                id="product-cost-price"
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={handleChange('costPrice')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.costPrice ? 'border-red-400' : 'border-neutral-300'}`}
              />
              {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="product-notes" className="block text-sm font-medium text-neutral-700 mb-1">
              Notes / Description
            </label>
            <textarea
              id="product-notes"
              rows={3}
              value={form.notes}
              onChange={handleChange('notes')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="product-status" className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              id="product-status"
              value={form.status}
              onChange={handleChange('status')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => onClose(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;
