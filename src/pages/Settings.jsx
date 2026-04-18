import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { GoogleLogin } from '@react-oauth/google';

export default function Settings() {
  const { data, loading, isAdmin, onGoogleLogin, logout, saveSettings } = useApp();

  const [company, setCompany] = useState('');
  const [usdRate, setUsdRate] = useState(32.5);

  useEffect(() => {
    if (data?.settings) {
      setCompany(data.settings.company || '');
      setUsdRate(data.settings.usd_to_ntd || 32.5);
    }
  }, [data]);

  async function handleSave() {
    await saveSettings({ company, usd_to_ntd: parseFloat(usdRate) || 32.5 });
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: 640 }}>

      {/* 蝞∠??∟澈隞?*/}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">蝞∠??∟澈隞?/span>
        </div>
        <div style={{ padding: '16px' }}>
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>漎?撌脩?伐?蝞∠??⊥芋撘?</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>?餃</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                雿輻雿? Google 撣唾??餃嚗頂蝯望?撽??臬?函恣?皜銝准?
              </p>
              <GoogleLogin
                onSuccess={onGoogleLogin}
                onError={() => {}}
                text="signin_with"
                shape="rectangular"
                locale="zh-TW"
              />
            </div>
          )}
        </div>
      </div>

      {/* ?砍鞈? */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">?砍鞈?</span>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">?桐??迂</label>
            <input
              className="input"
              value={company}
              onChange={e => setCompany(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="label">USD ??NTD ?舐?</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="number"
                step="0.1"
                value={usdRate}
                onChange={e => setUsdRate(e.target.value)}
                style={{ width: 120 }}
                disabled={!isAdmin}
              />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                1 USD = NT${Math.round(usdRate)}
              </span>
            </div>
          </div>
          {isAdmin && (
            <div>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                ?脣?閮剖?
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ? */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">?</span>
        </div>
        <div style={{ padding: '16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <p>AI 撌亙蝞∠?蝟餌絞 v2.1.2</p>
          <p>鞈??脣???Google Sheets嚗?蝡舐 Google Apps Script 撽???/p>
          <p>?恣?撣唾??舀憓楊頛舀??芷鞈?嚗??犖?舀??/p>
        </div>
      </div>

    </div>
  );
}

