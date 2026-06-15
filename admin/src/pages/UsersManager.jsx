import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('author', 'SYSTEM_USER_PROFILE')
        .order('date', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="admin-page animate-fade">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="admin-title" style={{ margin: 0 }}>Registered Users</h1>
        <input 
          type="text" 
          placeholder="Search by name, email, or mobile..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '250px' }}
        />
      </div>

      <div className="admin-card">
        {isLoading ? (
          <p style={{ padding: '20px', color: 'var(--text-gray)' }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--text-gray)' }}>No users found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Gender</th>
                <th>DOB</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(user => {
                if (!searchQuery) return true;
                const profileData = user.content || {};
                const term = searchQuery.toLowerCase();
                return (user.title && user.title.toLowerCase().includes(term)) || 
                       (profileData.email && profileData.email.toLowerCase().includes(term)) ||
                       (profileData.mobile && profileData.mobile.toLowerCase().includes(term));
              }).map(user => {
                const profileData = user.content || {};
                return (
                  <tr key={user.id}>
                    <td>
                      {user.image_url ? (
                        <img src={user.image_url} alt="avatar" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: '600' }}>{user.title}</td>
                    <td>{profileData.email || 'N/A'}</td>
                    <td>{profileData.mobile || 'N/A'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{profileData.gender || 'N/A'}</td>
                    <td>{profileData.dob || 'N/A'}</td>
                    <td>{new Date(user.date).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
