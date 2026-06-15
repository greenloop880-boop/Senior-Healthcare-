import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

export default function NewsletterManager() {
  const [subscribers, setSubscribers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscribers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('author', 'SYSTEM_NEWSLETTER')
        .order('date', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleCopyEmails = () => {
    const emails = subscribers.map(s => s.title).join(', ');
    navigator.clipboard.writeText(emails);
    alert('Emails copied to clipboard!');
  };

  return (
    <div className="admin-page animate-fade">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="admin-title" style={{ margin: 0 }}>Newsletter Subscribers</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search email address..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '250px' }}
          />
          {subscribers.length > 0 && (
            <button className="btn-primary" onClick={handleCopyEmails}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px' }}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy All Emails
            </button>
          )}
        </div>
      </div>

      <div className="admin-card">
        {isLoading ? (
          <p style={{ padding: '20px', color: 'var(--text-gray)' }}>Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--text-gray)' }}>No subscribers found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Subscribed Date</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.filter(sub => {
                if (!searchQuery) return true;
                return sub.title && sub.title.toLowerCase().includes(searchQuery.toLowerCase());
              }).map(sub => (
                <tr key={sub.id}>
                  <td style={{ fontWeight: '600' }}>{sub.title}</td>
                  <td>{new Date(sub.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
