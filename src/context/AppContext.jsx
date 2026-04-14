import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/gas.js';
import { today } from '../utils/date.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getData();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (e) {
      toast('載入資料失敗：' + e.message, 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, []);

  // ── Auth ────────────────────────────────────────
  function onGoogleLogin(credentialResponse) {
    setToken(credentialResponse.credential);
    setIsAdmin(true);
    toast('管理員登入成功', 'ok');
  }

  function logout() {
    setToken(null);
    setIsAdmin(false);
    toast('已登出管理員模式');
  }

  // ── Generic API call wrapper ─────────────────────
  async function call(fn, successMsg) {
    try {
      const result = await fn();
      if (result && result.error) { toast(result.error, 'err'); return null; }
      if (successMsg) toast(successMsg, 'ok');
      await loadData();
      return result;
    } catch (e) {
      toast(e.message, 'err');
      return null;
    }
  }

  // ── Tools ────────────────────────────────────────
  const saveTool    = (d, logEntry) => call(async () => {
    const r = await api.saveTool(d, token);
    if (r?.success && logEntry) await api.saveLog(logEntry, token);
    return r;
  }, '工具已儲存');

  const deleteTool  = (id)  => call(() => api.deleteTool(id, token), '工具已刪除');

  // ── Departments ──────────────────────────────────
  const saveDept    = (d)   => call(() => api.saveDept(d, token), '單位已儲存');
  const deleteDept  = (id)  => call(() => api.deleteDept(id, token), '單位已刪除');
  const renameCenter = (d)  => call(() => api.renameCenter(d, token), '中心名稱已更新');

  // ── People ───────────────────────────────────────
  const savePersonFull       = (d) => call(() => api.savePersonFull(d, token), '人員已儲存');
  const deletePerson         = (d) => call(() => api.deletePerson(d, token), '人員已移除');
  const permanentDeletePerson = (d) => call(() => api.permanentDeletePerson(d, token), '人員已永久刪除');

  // ── Assignments ──────────────────────────────────
  const saveAssignment   = (d)  => call(() => api.saveAssignment(d, token), null);
  const revokeAssignment = (d)  => call(() => api.revokeAssignment(d, token), '授權已收回');
  const deleteAssignment = (id) => call(() => api.deleteAssignment(id, token), '記錄已刪除');

  // ── Log ──────────────────────────────────────────
  const saveLog   = (d)  => call(() => api.saveLog(d, token), '採購紀錄已儲存');
  const deleteLog = (id) => call(() => api.deleteLog(id, token), '紀錄已刪除');

  // ── Maturity ─────────────────────────────────────
  const saveMaturity = (d) => call(() => api.saveMaturity(d, token), '評估已儲存');

  // ── Settings ─────────────────────────────────────
  const saveSettings = (d) => call(() => api.saveSettings(d, token), '設定已儲存');

  const value = {
    data, loading, token, isAdmin, toasts,
    loadData, toast,
    onGoogleLogin, logout,
    saveTool, deleteTool,
    saveDept, deleteDept, renameCenter,
    savePersonFull, deletePerson, permanentDeletePerson,
    saveAssignment, revokeAssignment, deleteAssignment,
    saveLog, deleteLog,
    saveMaturity,
    saveSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
