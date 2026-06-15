import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function ProductsManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '', category_title: '', concern_title: '', description: '', price: 0, mrp: 0, discount: '', rating: 4.5, reviews_count: 0, specs: '',
    brand: '', marketed_by: '', net_quantity: '', country_of_origin: '', included_components: '', customer_care_details: '', dimensions: '', generic_name: '', manufacturer_details: '',
    faqs: [], detail_banners: ['', '', '', ''], variants: [], is_recommended: false, gallery_images: ['', '', '', '']
  });
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([null, null, null, null]);
  const [bannerFiles, setBannerFiles] = useState([null, null, null, null]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [prodRes, catRes, conRes] = await Promise.all([
      supabase.from('products').select('*').order('id', { ascending: false }),
      supabase.from('categories').select('title'),
      supabase.from('concerns').select('title')
    ]);
    if (prodRes.data) setProducts(prodRes.data);
    if (catRes.data) setCategories(catRes.data.map(c => c.title));
    if (conRes.data) setConcerns(conRes.data.map(c => c.title));
    setIsLoading(false);
  };

  const handleOpenModal = (prod = null) => {
    setGalleryFiles([null, null, null, null]);
    setBannerFiles([null, null, null, null]);
    if (prod) {
      setEditingProduct(prod);
      let parsedVariants = [];
      let normalSpecs = [];
      
      let isRecommended = false;
      let formDataGallery = ['', '', '', ''];
      
      if (prod.specs) {
        prod.specs.forEach(s => {
          if (s.startsWith('__VARIANTS__:')) {
            try {
              const vConfig = JSON.parse(s.replace('__VARIANTS__:', ''));
              // vConfig might be an array of variants
              if (Array.isArray(vConfig)) {
                parsedVariants = vConfig.map(v => ({ label: v.label, options: v.options.join(', ') }));
              }
            } catch(e) { console.error(e); }
          } else if (s === '__RECOMMENDED__') {
            isRecommended = true;
          } else if (s.startsWith('__GALLERY__:')) {
            try {
              formDataGallery = JSON.parse(s.replace('__GALLERY__:', ''));
            } catch(e) { console.error(e); }
          } else {
            normalSpecs.push(s);
          }
        });
      }

      setFormData({
        title: prod.title,
        category_title: prod.category_title,
        concern_title: prod.concern_title || '',
        description: prod.description,
        price: prod.price,
        mrp: prod.mrp,
        discount: prod.discount,
        rating: prod.rating,
        reviews_count: prod.reviews_count,
        specs: normalSpecs.join('\n'),
        brand: prod.brand || '',
        marketed_by: prod.marketed_by || '',
        net_quantity: prod.net_quantity || '',
        country_of_origin: prod.country_of_origin || '',
        included_components: prod.included_components || '',
        customer_care_details: prod.customer_care_details || '',
        dimensions: prod.dimensions || '',
        generic_name: prod.generic_name || '',
        manufacturer_details: prod.manufacturer_details || '',
        faqs: prod.faqs || [],
        detail_banners: prod.detail_banners || ['', '', '', ''],
        variants: parsedVariants,
        is_recommended: isRecommended,
        gallery_images: formDataGallery
      });
    } else {
      setEditingProduct(null);
      setFormData({
        title: '', category_title: categories[0] || '', concern_title: '', description: '', price: 0, mrp: 0, discount: '', rating: 4.5, reviews_count: 0, specs: '',
        brand: '', marketed_by: '', net_quantity: '', country_of_origin: '', included_components: '', customer_care_details: '', dimensions: '', generic_name: '', manufacturer_details: '',
        faqs: [],
        detail_banners: ['', '', '', ''],
        variants: [],
        is_recommended: false,
        gallery_images: ['', '', '', '']
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (prod) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const { error } = await supabase.from('products').delete().eq('id', prod.id);
      if (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product: " + error.message);
        return;
      }
      if (prod.image_url) {
        await deleteFromR2(prod.image_url);
      }
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const price = Number(formData.price);
    const mrp = Number(formData.mrp);

    if (mrp > 0 && price > mrp) {
      alert("Sale Price cannot be more than the Maximum Retail Price (MRP).");
      return;
    }

    setIsSaving(true);

    let imageUrl = editingProduct ? editingProduct.image_url : '';

    if (imageFile) {
      if (editingProduct && editingProduct.image_url) {
        await deleteFromR2(editingProduct.image_url);
      }
      imageUrl = await uploadToR2(imageFile, 'products');
    }

    // Upload detail banners to R2
    const detailBanners = [...formData.detail_banners];
    for (let i = 0; i < 4; i++) {
      if (bannerFiles[i]) {
        if (editingProduct && editingProduct.detail_banners && editingProduct.detail_banners[i]) {
          await deleteFromR2(editingProduct.detail_banners[i]);
        }
        detailBanners[i] = await uploadToR2(bannerFiles[i], 'products');
      }
    }

    // Upload gallery images to R2
    const galleryImages = [...formData.gallery_images];
    for (let i = 0; i < 4; i++) {
      if (galleryFiles[i]) {
        if (editingProduct && galleryImages[i]) {
          await deleteFromR2(galleryImages[i]);
        }
        galleryImages[i] = await uploadToR2(galleryFiles[i], 'products');
      }
    }

    // Build specs array
    let finalSpecs = formData.specs ? formData.specs.split('\n').map(s => s.trim()).filter(Boolean) : [];
    
    // Process variants into specs payload
    if (formData.variants && formData.variants.length > 0) {
      const validVariants = formData.variants.filter(v => v.label.trim() && v.options.trim());
      if (validVariants.length > 0) {
        const variantPayload = validVariants.map(v => ({
          label: v.label.trim(),
          options: v.options.split(',').map(o => o.trim()).filter(Boolean)
        }));
        finalSpecs.unshift(`__VARIANTS__:${JSON.stringify(variantPayload)}`);
      }
    }

    if (formData.is_recommended) {
      finalSpecs.push('__RECOMMENDED__');
    }

    if (galleryImages.some(img => img && img.trim() !== '')) {
      finalSpecs.push(`__GALLERY__:${JSON.stringify(galleryImages)}`);
    }

    const payload = {
      title: formData.title,
      category_title: formData.category_title,
      concern_title: formData.concern_title,
      description: formData.description,
      price: Number(formData.price),
      mrp: Number(formData.mrp),
      discount: formData.discount,
      rating: Number(formData.rating),
      reviews_count: Number(formData.reviews_count),
      image_url: imageUrl,
      specs: finalSpecs,
      brand: formData.brand,
      marketed_by: formData.marketed_by,
      net_quantity: formData.net_quantity,
      country_of_origin: formData.country_of_origin,
      included_components: formData.included_components,
      customer_care_details: formData.customer_care_details,
      dimensions: formData.dimensions,
      generic_name: formData.generic_name,
      manufacturer_details: formData.manufacturer_details,
      faqs: formData.faqs,
      detail_banners: detailBanners
    };

    let result;
    if (editingProduct) {
      result = await supabase.from('products').update(payload).eq('id', editingProduct.id);
    } else {
      // Auto-generate ID from title if new
      payload.id = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      result = await supabase.from('products').insert([payload]);
    }

    if (result.error) {
      console.error("Error saving product:", result.error);
      alert("Failed to save product: " + result.error.message);
      setIsSaving(false);
    } else {
      setIsModalOpen(false);
      setIsSaving(false);
      fetchData();
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Products Manager</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '200px' }}
          />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Product</button>
        </div>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter(p => !filterCategory || p.category_title === filterCategory)
                .filter(p => !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                <tr key={p.id}>
                  <td><img src={p.image_url} alt={p.title} /></td>
                  <td>{p.title}</td>
                  <td>{p.category_title}</td>
                  <td>₹{p.price}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(p)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ position: 'relative' }}>
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d32f2f' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 style={{ marginBottom: '20px', paddingRight: '30px' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Title</label>
                <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select required value={formData.category_title} onChange={e => setFormData({ ...formData, category_title: e.target.value })}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Shop by Concern (Optional)</label>
                <select value={formData.concern_title || ''} onChange={e => setFormData({ ...formData, concern_title: e.target.value })}>
                  <option value="">None (No Concern)</option>
                  {concerns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingProduct} 
                label="Main Product Image" 
                recommendedSize="800x800 px" 
                editing={editingProduct ? editingProduct.image_url : null} 
              />
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#f0f4f8', borderRadius: '6px' }}>
                <input 
                  type="checkbox" 
                  id="is_recommended" 
                  checked={formData.is_recommended} 
                  onChange={e => setFormData({ ...formData, is_recommended: e.target.checked })} 
                  style={{ width: '18px', height: '18px' }} 
                />
                <label htmlFor="is_recommended" style={{ marginBottom: 0, fontWeight: '500', color: '#1a1a4b', cursor: 'pointer' }}>Show in Search Recommended List</label>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Price</label>
                  <input type="number" required value={formData.price} onChange={e => {
                    const price = e.target.value;
                    const mrp = formData.mrp;
                    let discount = '';
                    if (Number(mrp) > 0 && Number(price) < Number(mrp)) {
                      discount = Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100) + '% off';
                    }
                    setFormData({ ...formData, price, discount });
                  }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>MRP</label>
                  <input type="number" required value={formData.mrp} onChange={e => {
                    const mrp = e.target.value;
                    const price = formData.price;
                    let discount = '';
                    if (Number(mrp) > 0 && Number(price) < Number(mrp)) {
                      discount = Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100) + '% off';
                    }
                    setFormData({ ...formData, mrp, discount });
                  }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Discount Tag</label>
                  <input value={formData.discount} disabled placeholder="Calculated automatically" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea required rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <h4 style={{ margin: '20px 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#053e7a', fontWeight: '500' }}>Product Variants (Optional)</h4>
              <div style={{ marginBottom: '16px' }}>
                {formData.variants && formData.variants.map((v, idx) => (
                  <div key={idx} style={{ border: '1px solid #e0e0e0', padding: '12px', borderRadius: '6px', marginBottom: '12px', position: 'relative', backgroundColor: '#fafafa' }}>
                    <button type="button" style={{ position: 'absolute', top: '10px', right: '10px', color: '#d32f2f', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '500', fontSize: '12px' }} onClick={() => {
                      const newVariants = formData.variants.filter((_, i) => i !== idx);
                      setFormData({ ...formData, variants: newVariants });
                    }}>Remove</button>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#666' }}>Variant Label (e.g., "Select Diaper Size")</label>
                      <input required value={v.label} onChange={e => {
                        const newVariants = [...formData.variants];
                        newVariants[idx] = { ...newVariants[idx], label: e.target.value };
                        setFormData({ ...formData, variants: newVariants });
                      }} placeholder='e.g., "Select Size"' />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label style={{ fontSize: '12px', color: '#666' }}>Options (Comma-separated, e.g. "M, L, XL")</label>
                      <input required value={v.options} onChange={e => {
                        const newVariants = [...formData.variants];
                        newVariants[idx] = { ...newVariants[idx], options: e.target.value };
                        setFormData({ ...formData, variants: newVariants });
                      }} placeholder='e.g., "M, L, XL"' />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }} onClick={() => {
                  setFormData({ ...formData, variants: [...(formData.variants || []), { label: '', options: '' }] });
                }}>+ Add Variant</button>
              </div>
              <div className="form-group">
                <label>Key Features / Specs (one per line)</label>
                <textarea rows="4" value={formData.specs} onChange={e => setFormData({ ...formData, specs: e.target.value })} />
              </div>

              <h4 style={{ margin: '20px 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#053e7a', fontWeight: '500' }}>Product Details (Specifications Table)</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

                <div className="form-group">
                  <label>Net Quantity</label>
                  <input value={formData.net_quantity} onChange={e => setFormData({ ...formData, net_quantity: e.target.value })} placeholder="e.g. 1 Unit" />
                </div>
                <div className="form-group">
                  <label>Country of Origin</label>
                  <input value={formData.country_of_origin} onChange={e => setFormData({ ...formData, country_of_origin: e.target.value })} placeholder="e.g. China" />
                </div>
                <div className="form-group">
                  <label>Dimensions</label>
                  <input value={formData.dimensions} onChange={e => setFormData({ ...formData, dimensions: e.target.value })} placeholder="e.g. 13.2*5*14.4 cm" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Common or Generic Name of Commodity</label>
                  <input value={formData.generic_name} onChange={e => setFormData({ ...formData, generic_name: e.target.value })} placeholder="e.g. Massage Gun" />
                </div>
              </div>

              <div className="form-group">
                <label>Marketed By</label>
                <textarea rows="2" value={formData.marketed_by} onChange={e => setFormData({ ...formData, marketed_by: e.target.value })} placeholder="Marketed by address..." />
              </div>
              <div className="form-group">
                <label>Included Components</label>
                <textarea rows="2" value={formData.included_components} onChange={e => setFormData({ ...formData, included_components: e.target.value })} placeholder="e.g. 1 Unit massage gun, type-C cable..." />
              </div>
              <div className="form-group">
                <label>Customer Care Details</label>
                <textarea rows="2" value={formData.customer_care_details} onChange={e => setFormData({ ...formData, customer_care_details: e.target.value })} placeholder="Contact number, email, address..." />
              </div>
              <div className="form-group">
                <label>Name and Address of the Manufacturer</label>
                <textarea rows="2" value={formData.manufacturer_details} onChange={e => setFormData({ ...formData, manufacturer_details: e.target.value })} placeholder="Manufacturer details..." />
              </div>

              <h4 style={{ margin: '20px 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#053e7a', fontWeight: '500' }}>Product FAQs</h4>
              
              <div style={{ marginBottom: '16px' }}>
                {formData.faqs && formData.faqs.map((faq, idx) => (
                  <div key={idx} style={{ border: '1px solid #e0e0e0', padding: '12px', borderRadius: '6px', marginBottom: '12px', position: 'relative', backgroundColor: '#fafafa' }}>
                    <button type="button" style={{ position: 'absolute', top: '10px', right: '10px', color: '#d32f2f', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '500', fontSize: '12px' }} onClick={() => {
                      const newFaqs = formData.faqs.filter((_, i) => i !== idx);
                      setFormData({ ...formData, faqs: newFaqs });
                    }}>Remove</button>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#666' }}>Question {idx + 1}</label>
                      <input required value={faq.q} onChange={e => {
                        const newFaqs = [...formData.faqs];
                        newFaqs[idx] = { ...newFaqs[idx], q: e.target.value };
                        setFormData({ ...formData, faqs: newFaqs });
                      }} placeholder="Enter question..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label style={{ fontSize: '12px', color: '#666' }}>Answer {idx + 1}</label>
                      <textarea required rows="2" value={faq.a} onChange={e => {
                        const newFaqs = [...formData.faqs];
                        newFaqs[idx] = { ...newFaqs[idx], a: e.target.value };
                        setFormData({ ...formData, faqs: newFaqs });
                      }} placeholder="Enter answer..." />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }} onClick={() => {
                  setFormData({ ...formData, faqs: [...(formData.faqs || []), { q: '', a: '' }] });
                }}>+ Add FAQ Item</button>
              </div>

              <h4 style={{ margin: '20px 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#053e7a', fontWeight: '500' }}>Product Gallery Images (For Image Carousel)</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="form-group" style={{ border: '1px solid #eee', padding: '10px', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                    <label style={{ fontWeight: '500', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Gallery Image {idx + 1} <span style={{color: '#666', fontWeight: 'normal'}}>(Recommended: 800x800 px)</span></label>
                    <DragDropImageUpload 
                      onFileSelect={(file) => {
                        const newFiles = [...galleryFiles];
                        newFiles[idx] = file;
                        setGalleryFiles(newFiles);
                      }} 
                      label={`Gallery Image ${idx + 1}`} 
                      recommendedSize="800x800 px" 
                      editing={formData.gallery_images && formData.gallery_images[idx]} 
                    />
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '20px 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#053e7a', fontWeight: '500' }}>Product Detail Banners (Four Banners)</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="form-group" style={{ border: '1px solid #eee', padding: '10px', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                    <label style={{ fontWeight: '500', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Feature Banner {idx + 1} <span style={{color: '#666', fontWeight: 'normal'}}>(Recommended: 1000x1000 px)</span></label>
                    <DragDropImageUpload 
                      onFileSelect={(file) => {
                        const newFiles = [...bannerFiles];
                        newFiles[idx] = file;
                        setBannerFiles(newFiles);
                      }} 
                      label={`Feature Banner ${idx + 1}`} 
                      recommendedSize="1000x1000 px" 
                      editing={formData.detail_banners && formData.detail_banners[idx]} 
                    />
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
