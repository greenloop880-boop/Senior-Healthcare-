import { supabase } from '../supabase/client';

export const brandService = {
  async getBrands() {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createBrand(brand) {
    const { data, error } = await supabase
      .from('brands')
      .insert([{
        name: brand.name,
        brand_code: brand.brand_code,
        slug: brand.slug,
        logo: brand.logo,
        is_active: brand.is_active ?? true
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBrand(id, brand) {
    const { data, error } = await supabase
      .from('brands')
      .update({
        name: brand.name,
        brand_code: brand.brand_code,
        slug: brand.slug,
        logo: brand.logo,
        is_active: brand.is_active
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteBrand(id) {
    // Soft delete
    const { error } = await supabase
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  }
};
