import { supabase } from '../supabase/client';

export const supplierService = {
  async getSuppliers() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async createSupplier(payload) {
    const { error } = await supabase
      .from('vendors')
      .insert([payload]);
    
    if (error) throw error;
    return true;
  },

  async updateSupplier(id, payload) {
    const { error } = await supabase
      .from('vendors')
      .update(payload)
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async deleteSupplier(id) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
