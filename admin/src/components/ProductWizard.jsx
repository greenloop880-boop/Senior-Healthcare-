import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { brandService } from '../services/brandService';
import DragDropImageUpload from './DragDropImageUpload';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';

const WIZARD_STEPS = [
  'Basic Info', 'Categories & Brand', 'Images', 'Variants', 'Pricing', 
  'Inventory', 'Shipping', 'SEO', 'Review & Publish'
];

export default function ProductWizard({ onCancel, onSuccess, editingProduct }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.getCategories() });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => brandService.getBrands() });
  const { data: concerns } = useQuery({ queryKey: ['concerns'], queryFn: () => productService.getConcerns() });

  // Upload State
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([null, null, null, null]);
  const [bannerFiles, setBannerFiles] = useState([null, null, null, null]);

  // Form State
  const [formData, setFormData] = useState({
    name: '', short_description: '', description: '', internal_code: '',
    category_id: '', brand_id: '', selectedConcerns: [],
    // Images
    image_url: '', images: [], detail_banners: ['', '', '', ''],
    // Variant Engine (Attributes)
    attributes: [{ name: '', values: '' }], 
    skus: [{ sku_code: '', variant_name: '', mrp: 0, selling_price: 0, purchase_cost: 0, gst_percent: 18, reorder_level: 10, maximum_stock: 100, safety_stock: 5, barcode: '', weight: '', length: '', width: '', height: '' }],
    openingStock: 0,
    // Metadata
    metadata: { net_quantity: '', country_of_origin: '', generic_name: '', marketed_by: '', included_components: '', customer_care_details: '', manufacturer_details: '', faqs: [] },
    // SEO
    meta_title: '', meta_description: '', url_slug: '', canonical_url: '', og_image: '',
    is_active: true
  });

  useEffect(() => {
    if (editingProduct) {
      const p = typeof editingProduct === 'object' ? editingProduct : null;
      // In a real app we'd fetch the product by ID here if only ID was passed, 
      // but assuming the full object is passed for now or we just map what we have.
      // We will leave this stubbed as requested to avoid breaking unless we have the full product object.
    }
  }, [editingProduct]);

  // Auto-Save Draft
  useEffect(() => {
    // Only auto-save if not editing an existing published product
    if (!editingProduct) {
      localStorage.setItem('productWizardDraft', JSON.stringify(formData));
    }
  }, [formData]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const generateVariants = () => {
    // Attribute combination engine
    const attr1 = formData.attributes[0]?.values.split(',').map(s => s.trim()).filter(Boolean) || [];
    const attr2 = formData.attributes[1]?.values.split(',').map(s => s.trim()).filter(Boolean) || [];
    
    let combinations = [];
    if (attr1.length && attr2.length) {
      attr1.forEach(a1 => {
        attr2.forEach(a2 => combinations.push(`${a1} / ${a2}`));
      });
    } else if (attr1.length) {
      combinations = attr1;
    } else if (attr2.length) {
      combinations = attr2;
    }

    if (combinations.length > 0) {
      const selectedBrand = brands?.find(b => b.id === formData.brand_id);
      const prefix = selectedBrand ? selectedBrand.brand_code : 'SA';
      
      const newSkus = combinations.map((combo, idx) => ({
        ...formData.skus[0],
        variant_name: combo,
        sku_code: `${prefix}-VAR-${String(idx+1).padStart(3, '0')}` // Simple generation for now
      }));
      setFormData({ ...formData, skus: newSkus });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Upload Images to R2
      let imageUrl = formData.image_url;
      if (imageFile) {
        imageUrl = await uploadToR2(imageFile, 'products');
      }

      const galleryUrls = [];
      for (const file of galleryFiles) {
        if (file) {
          const url = await uploadToR2(file, 'products');
          galleryUrls.push(url);
        }
      }

      const bannerUrls = [];
      for (const file of bannerFiles) {
        if (file) {
          const url = await uploadToR2(file, 'products');
          bannerUrls.push(url);
        } else {
          bannerUrls.push(''); // Maintain array length of 4
        }
      }

      // 2. Prepare Payload
      const finalMetadata = { ...formData.metadata, detail_banners: bannerUrls };
      const payload = {
        name: formData.name,
        slug: formData.url_slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        internal_code: formData.internal_code,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        short_description: formData.short_description,
        description: formData.description,
        is_active: formData.is_active,
        image_url: imageUrl,
        images: galleryUrls.length > 0 ? galleryUrls : formData.images,
        metadata: finalMetadata,
        skus: formData.skus,
        selectedConcerns: formData.selectedConcerns,
        openingStock: Number(formData.openingStock),
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        canonical_url: formData.canonical_url
      };

      // 3. Save via Service
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id || editingProduct, payload);
      } else {
        await productService.createProduct(payload);
      }
      
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>{editingProduct ? 'Edit Product' : 'Create New Product'}</h3>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Stepper Header */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '32px', paddingBottom: '8px' }}>
        {WIZARD_STEPS.map((step, idx) => (
          <div key={idx} style={{ 
            padding: '8px 16px', 
            backgroundColor: currentStep === idx ? '#3b82f6' : (currentStep > idx ? '#dbeafe' : '#f1f5f9'),
            color: currentStep === idx ? 'white' : (currentStep > idx ? '#1e3a8a' : '#64748b'),
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }} onClick={() => setCurrentStep(idx)}>
            {idx + 1}. {step}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ minHeight: '400px' }}>
        {currentStep === 0 && (
          <div>
            <h4>Basic Information</h4>
            <div className="form-group"><label>Product Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="form-group"><label>Internal Code (e.g. PRD0001)</label><input value={formData.internal_code} onChange={e => setFormData({...formData, internal_code: e.target.value})} /></div>
            <div className="form-group"><label>Short Description</label><input value={formData.short_description} onChange={e => setFormData({...formData, short_description: e.target.value})} /></div>
            <div className="form-group"><label>Full Description</label><textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h4>Categories & Brand</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                  <option value="">Select Category</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Brand</label>
                <select value={formData.brand_id} onChange={e => setFormData({...formData, brand_id: e.target.value})}>
                  <option value="">Select Brand</option>
                  {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Target Concerns</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {concerns?.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <input type="checkbox" checked={formData.selectedConcerns.includes(c.id)} onChange={e => {
                      if(e.target.checked) setFormData({...formData, selectedConcerns: [...formData.selectedConcerns, c.id]});
                      else setFormData({...formData, selectedConcerns: formData.selectedConcerns.filter(id => id !== c.id)});
                    }} /> {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h4>Product Images & Media</h4>
            <p style={{ color: 'gray', fontSize: '14px', marginBottom: '16px' }}>Upload the main product image and gallery. (We preserve your existing upload logic here)</p>
            <DragDropImageUpload onFileSelect={setImageFile} label="Primary Cover Image" />
            <h5 style={{ marginTop: '24px' }}>Gallery Images</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[0, 1, 2, 3].map(idx => (
                <div key={idx} className="form-group" style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                  <DragDropImageUpload onFileSelect={(file) => {
                    const newFiles = [...galleryFiles]; newFiles[idx] = file; setGalleryFiles(newFiles);
                  }} label={`Gallery Image ${idx + 1}`} />
                </div>
              ))}
            </div>

            <h5 style={{ marginTop: '24px', color: '#475569' }}>Detail Banners (Four Banners)</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {[0, 1, 2, 3].map(idx => (
                <div key={idx} className="form-group" style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                  <DragDropImageUpload onFileSelect={(file) => {
                    const newFiles = [...bannerFiles]; newFiles[idx] = file; setBannerFiles(newFiles);
                  }} label={`Feature Banner ${idx + 1}`} recommendedSize="1000x1000 px" />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Variant Engine</h4>
              <button type="button" className="btn-secondary" onClick={generateVariants}>Generate Combinations</button>
            </div>
            <p style={{ color: 'gray', fontSize: '14px' }}>Define attributes (like Color, Size) to automatically generate SKUs.</p>
            
            {formData.attributes.map((attr, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Attribute Name</label>
                  <input placeholder="e.g. Size" value={attr.name} onChange={e => {
                    const newAttrs = [...formData.attributes]; newAttrs[idx].name = e.target.value; setFormData({...formData, attributes: newAttrs});
                  }} />
                </div>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Values (comma separated)</label>
                  <input placeholder="e.g. Small, Medium, Large" value={attr.values} onChange={e => {
                    const newAttrs = [...formData.attributes]; newAttrs[idx].values = e.target.value; setFormData({...formData, attributes: newAttrs});
                  }} />
                </div>
                {idx === 0 && (
                  <button type="button" className="btn-secondary" onClick={() => setFormData({...formData, attributes: [...formData.attributes, {name: '', values: ''}]})}>+ Add Option</button>
                )}
              </div>
            ))}

            <h5 style={{ marginTop: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Generated SKUs</h5>
            {formData.skus.map((sku, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px' }}>
                <div><strong>SKU:</strong> <input value={sku.sku_code} onChange={e => {
                  const newSkus = [...formData.skus]; newSkus[idx].sku_code = e.target.value; setFormData({...formData, skus: newSkus});
                }} style={{ width: '100%', padding: '4px' }} /></div>
                <div><strong>Variant:</strong> <input value={sku.variant_name} onChange={e => {
                  const newSkus = [...formData.skus]; newSkus[idx].variant_name = e.target.value; setFormData({...formData, skus: newSkus});
                }} style={{ width: '100%', padding: '4px' }} /></div>
                <div><strong>Barcode:</strong> <input value={sku.barcode} onChange={e => {
                  const newSkus = [...formData.skus]; newSkus[idx].barcode = e.target.value; setFormData({...formData, skus: newSkus});
                }} style={{ width: '100%', padding: '4px' }} placeholder="UPC/EAN" /></div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h4>Pricing & Margins</h4>
            <p style={{ color: 'gray', fontSize: '14px', marginBottom: '24px' }}>Set pricing for your variants. Margin and profit will calculate automatically.</p>
            {formData.skus.map((sku, idx) => {
              const profit = sku.selling_price - sku.purchase_cost;
              const margin = sku.selling_price > 0 ? ((profit / sku.selling_price) * 100).toFixed(1) : 0;
              
              return (
                <div key={idx} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
                  <h5 style={{ marginTop: 0 }}>{sku.variant_name || 'Default Variant'} <span style={{ color: 'gray', fontWeight: 'normal' }}>({sku.sku_code})</span></h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group"><label>MRP (₹)</label><input type="number" value={sku.mrp} onChange={e => {
                      const newSkus = [...formData.skus]; newSkus[idx].mrp = Number(e.target.value); setFormData({...formData, skus: newSkus});
                    }} /></div>
                    <div className="form-group"><label>Selling Price (₹)</label><input type="number" value={sku.selling_price} onChange={e => {
                      const newSkus = [...formData.skus]; newSkus[idx].selling_price = Number(e.target.value); setFormData({...formData, skus: newSkus});
                    }} /></div>
                    <div className="form-group"><label>Purchase Cost (₹)</label><input type="number" value={sku.purchase_cost} onChange={e => {
                      const newSkus = [...formData.skus]; newSkus[idx].purchase_cost = Number(e.target.value); setFormData({...formData, skus: newSkus});
                    }} /></div>
                    <div className="form-group"><label>GST %</label><input type="number" value={sku.gst_percent} onChange={e => {
                      const newSkus = [...formData.skus]; newSkus[idx].gst_percent = Number(e.target.value); setFormData({...formData, skus: newSkus});
                    }} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', padding: '12px', background: '#e0f2fe', borderRadius: '4px', color: '#0369a1', fontWeight: '500' }}>
                    <span>Estimated Profit: ₹{profit}</span>
                    <span>Margin: {margin}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <h4>Inventory Settings</h4>
            {formData.skus.map((sku, idx) => (
              <div key={idx} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
                <h5 style={{ marginTop: 0 }}>{sku.variant_name || 'Default Variant'} <span style={{ color: 'gray', fontWeight: 'normal' }}>({sku.sku_code})</span></h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group"><label>Safety Stock</label><input type="number" value={sku.safety_stock} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].safety_stock = Number(e.target.value); setFormData({...formData, skus: newSkus});
                  }} /></div>
                  <div className="form-group"><label>Reorder Level</label><input type="number" value={sku.reorder_level} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].reorder_level = Number(e.target.value); setFormData({...formData, skus: newSkus});
                  }} /></div>
                  <div className="form-group"><label>Maximum Stock</label><input type="number" value={sku.maximum_stock} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].maximum_stock = Number(e.target.value); setFormData({...formData, skus: newSkus});
                  }} /></div>
                </div>
              </div>
            ))}
            <div className="form-group" style={{ marginTop: '24px', padding: '16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px' }}>
              <label style={{ color: '#b45309' }}>Opening Stock (All Variants)</label>
              <input type="number" value={formData.openingStock} onChange={e => setFormData({...formData, openingStock: Number(e.target.value)})} />
              <small style={{ color: '#92400e' }}>This generates an initial inventory transaction.</small>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div>
            <h4>Shipping & Dimensions</h4>
            {formData.skus.map((sku, idx) => (
              <div key={idx} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
                <h5 style={{ marginTop: 0 }}>{sku.variant_name || 'Default Variant'} <span style={{ color: 'gray', fontWeight: 'normal' }}>({sku.sku_code})</span></h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group"><label>Weight (kg)</label><input type="number" step="0.01" value={sku.weight} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].weight = e.target.value; setFormData({...formData, skus: newSkus});
                  }} /></div>
                  <div className="form-group"><label>Length (cm)</label><input type="number" step="0.1" value={sku.length} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].length = e.target.value; setFormData({...formData, skus: newSkus});
                  }} /></div>
                  <div className="form-group"><label>Width (cm)</label><input type="number" step="0.1" value={sku.width} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].width = e.target.value; setFormData({...formData, skus: newSkus});
                  }} /></div>
                  <div className="form-group"><label>Height (cm)</label><input type="number" step="0.1" value={sku.height} onChange={e => {
                    const newSkus = [...formData.skus]; newSkus[idx].height = e.target.value; setFormData({...formData, skus: newSkus});
                  }} /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 7 && (
          <div>
            <h4>Search Engine Optimization (SEO)</h4>
            <div className="form-group"><label>URL Slug</label><input value={formData.url_slug} onChange={e => setFormData({...formData, url_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} placeholder="e.g. my-product-name" /></div>
            <div className="form-group"><label>Meta Title</label><input value={formData.meta_title} onChange={e => setFormData({...formData, meta_title: e.target.value})} maxLength={60} /></div>
            <div className="form-group"><label>Meta Description</label><textarea rows="3" value={formData.meta_description} onChange={e => setFormData({...formData, meta_description: e.target.value})} maxLength={160} /></div>
            <div className="form-group"><label>Canonical URL</label><input value={formData.canonical_url} onChange={e => setFormData({...formData, canonical_url: e.target.value})} /></div>
          </div>
        )}

        {currentStep === 8 && (
          <div>
            <h4>Review & Publish</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h5>Product Summary</h5>
                <ul style={{ lineHeight: '1.8' }}>
                  <li><strong>Name:</strong> {formData.name || 'Not set'}</li>
                  <li><strong>Code:</strong> {formData.internal_code || 'Not set'}</li>
                  <li><strong>Variants:</strong> {formData.skus.length}</li>
                  <li><strong>SEO:</strong> {formData.url_slug ? 'Configured' : 'Missing'}</li>
                </ul>
              </div>
              <div>
                <h5>Status</h5>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="status" checked={formData.is_active} onChange={() => setFormData({...formData, is_active: true})} /> Active (Publish now)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="status" checked={!formData.is_active} onChange={() => setFormData({...formData, is_active: false})} /> Draft (Save for later)
                  </label>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              <button className="btn-primary" style={{ padding: '12px 32px', fontSize: '16px' }} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Finalize & Save Product'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
        <button type="button" className="btn-secondary" onClick={handlePrev} disabled={currentStep === 0}>Previous Step</button>
        {currentStep < WIZARD_STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={handleNext}>Next Step</button>
        ) : (
          <div></div> // Spacer
        )}
      </div>
    </div>
  );
}
