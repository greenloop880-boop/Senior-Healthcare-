import { supabase } from '../supabase/client';

export const authService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Check if the user is an admin
    const isAdmin = await this.checkIsAdmin();
    if (!isAdmin) {
      await this.logout();
      throw new Error("Access Denied: You do not have admin privileges.");
    }
    
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async checkIsAdmin() {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Error checking admin status:", e);
      return false;
    }
  }
};
