import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

export default function CallbacksManager() {
  const [callbacks, setCallbacks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('blogs').select('*').eq('author', 'SYSTEM_CALLBACK').order('date', { ascending: false });
    if (data) setCallbacks(data);
    setIsLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Mark this request as resolved/deleted?')) {
      await supabase.from('blogs').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Callback Requests Manager</h2>
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '250px' }}
        />
      </div>

      {isLoading ? <p>Loading...</p> : callbacks.length === 0 ? <p>No callback requests found.</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Time Slot</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {callbacks.filter(r => {
                if (!searchQuery) return true;
                const parsedContent = r.content || {};
                const term = searchQuery.toLowerCase();
                const name = parsedContent.name || r.title.replace('Callback Request: ', '');
                const phone = parsedContent.phone || r.summary;
                return name.toLowerCase().includes(term) || phone.toLowerCase().includes(term);
              }).map(r => {
                const parsedContent = r.content || {};
                return (
                  <tr key={r.id}>
                    <td>{new Date(r.date).toLocaleString()}</td>
                    <td>{parsedContent.name || r.title.replace('Callback Request: ', '')}</td>
                    <td>{parsedContent.phone || r.summary}</td>
                    <td>{parsedContent.timeSlot || r.read_time}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-danger" onClick={() => handleDelete(r.id)}>Resolve</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
