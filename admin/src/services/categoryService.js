import { supabase } from '../supabase/client';

export const categoryService = {
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(cat => ({ ...cat, image_url: cat.image || cat.image_url }));
  },

  async createCategory(category) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name: category.name,
        slug: category.slug,
        image: category.image_url,
        is_active: category.is_active ?? true
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateCategory(id, category) {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: category.name,
        slug: category.slug,
        image: category.image_url,
        is_active: category.is_active
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  }
};
