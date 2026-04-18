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

      {/* 管理員身份 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">管理員身份</span>
        </div>
        <div style={{ padding: '16px' }}>
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>⬤ 已登入（管理員模式）</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>登出</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                使用你的 Google 帳號登入，系統會驗證是否在管理員清單中。
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

      {/* 公司資訊 */}
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
            <label className="label">USD → NTD 匯率</label>
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

      {/* 關於 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">關於</span>
        </div>
        <div style={{ padding: '16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <p>AI 工具管理系統 v2.1.1</p>
          <p>資料儲存於 Google Sheets，後端由 Google Apps Script 驅動。</p>
          <p>僅管理員帳號可新增、編輯或刪除資料；所有人可查看。</p>
        </div>
      </div>

    </div>
  );
}
