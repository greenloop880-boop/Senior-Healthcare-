import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

export default function SettingsManager() {
  const [announcementText, setAnnouncementText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data) {
        setAnnouncementText(data.text);
      } else if (error && error.code === 'PGRST116') {
        // Row does not exist yet, set a default
        setAnnouncementText("<strong>IMPORTANT :</strong> Dear Customer, Senior Anandam never asks for additional payments, OTPs, bank details, or personal information over phone calls. If you receive any suspicious calls, please report: <strong>+91 9911789911</strong> or email: <strong>support@senioranandam.com</strong>");
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .upsert({ id: 1, text: announcementText });

      if (error) {
        console.error("Error saving announcement settings:", error);
        alert("Failed to save settings: " + error.message);
      } else {
        alert("Announcement settings updated successfully!");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h2>Global Settings</h2>
      </div>

      {isLoading ? <p>Loading settings...</p> : (
        <div style={{ background: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1e3a8a' }}>Top Announcement Strip Text</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                This message scrolls at the very top of the storefront website. You can use HTML tags like <code>&lt;strong&gt;text&lt;/strong&gt;</code> to highlight key information in bold.
              </p>
              
              <textarea
                required
                rows="4"
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Enter announcement text..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              />
            </div>

            {/* Live Preview Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>Live Marquee Preview</h4>
              <div style={{
                backgroundColor: '#0c2340',
                color: '#ffffff',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '400',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid #000'
              }}>
                <div 
                  dangerouslySetInnerHTML={{ __html: announcementText || '<em>No text specified</em>' }} 
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.4'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving}
                style={{ padding: '10px 24px' }}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={fetchAnnouncement}
                style={{ padding: '10px 24px' }}
              >
                Reset Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
