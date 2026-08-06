import React from 'react';
import { POLICIES_DATA } from '../config/images';
import { useAppContext } from '../context/AppContext';

export default function PolicyPage() {
  const { currentPageParams, navigateTo } = useAppContext();
  const policyKey = currentPageParams.policyKey || "return";
  const policy = POLICIES_DATA[policyKey];

  if (!policy) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h3>Policy Not Found</h3>
        <button className="btn-primary-sm" style={{ width: 'auto', marginTop: '16px' }} onClick={() => navigateTo('home')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="section-container animate-fade">
      <div className="policy-layout">
        {/* Policy side list tabs */}
        <aside className="policy-nav-sidebar">
          {Object.keys(POLICIES_DATA).map(key => (
            <button
              key={key}
              className={`policy-nav-btn ${policyKey === key ? 'active' : ''}`}
              onClick={() => navigateTo('policy', { policyKey: key })}
            >
              {POLICIES_DATA[key].title}
            </button>
          ))}
        </aside>

        {/* Policy content */}
        <main className="policy-content-main">
          <h1>{policy.title}</h1>
          <span className="policy-last-updated">Last Updated: {policy.lastUpdated}</span>
          <div className="policy-text-block">
            {policy.content.map((pText, i) => (
              <p key={i}>{pText}</p>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
