import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../context/AppContext.jsx';

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
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">管理員身份</span>
        </div>
        <div style={{ padding: '16px' }}>
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>已登入管理員模式</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>登出</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                使用 Google 帳號登入後，才能修改工具、座位與系統設定。
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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">公司資訊</span>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">單位名稱</label>
            <input
              className="input"
              value={company}
              onChange={e => setCompany(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="label">USD 兌台幣匯率</label>
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
                儲存設定
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">關於系統</span>
        </div>
        <div style={{ padding: '16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <p>AI 工具管理系統 v2.1.2</p>
          <p>資料儲存於 Google Sheets，後端由 Google Apps Script 提供。</p>
          <p>目前畫面已統一使用台幣顯示費用，方便直接做管理與採購判讀。</p>
        </div>
      </div>
    </div>
  );
}
