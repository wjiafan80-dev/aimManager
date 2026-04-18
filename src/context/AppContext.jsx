import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/gas.js';
import { demoData } from '../data/demoData.js';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

function cloneDemoData() {
  return JSON.parse(JSON.stringify(demoData));
}

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [dataSource, setDataSource] = useState('live');

  const toast = useCallback((msg, type = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 3500);
  }, []);

  const loadDemoData = useCallback((silent = false) => {
    setData(cloneDemoData());
    setDataSource('demo');
    setLoading(false);

    if (!silent) {
      toast('已切換為展示資料，可直接進行主管 demo。', 'ok');
    }
  }, [toast]);

  const loadData = useCallback(async ({ silentFallback = false } = {}) => {
    setLoading(true);

    try {
      const result = await api.getData();
      if (result.error) throw new Error(result.error);

      setData(result);
      setDataSource('live');
    } catch (error) {
      loadDemoData(silentFallback);
      toast(`正式資料載入失敗，已改用展示資料：${error.message}`, 'err');
    } finally {
      setLoading(false);
    }
  }, [loadDemoData, toast]);

  useEffect(() => {
    loadData({ silentFallback: true });
  }, [loadData]);

  function onGoogleLogin(credentialResponse) {
    setToken(credentialResponse.credential);
    setIsAdmin(true);
    toast('已登入管理員模式。', 'ok');
  }

  function logout() {
    setToken(null);
    setIsAdmin(false);
    toast('已登出管理員模式。');
  }

  async function call(fn, successMsg) {
    setSaving(true);

    try {
      const result = await fn();
      if (result && result.error) {
        toast(result.error, 'err');
        return null;
      }

      if (successMsg) {
        toast(successMsg, 'ok');
      }

      await loadData();
      return result;
    } catch (error) {
      toast(error.message, 'err');
      return null;
    } finally {
      setSaving(false);
    }
  }

  const saveTool = (payload, logEntry) => call(async () => {
    const result = await api.saveTool(payload, token);
    if (result?.success && logEntry) await api.saveLog(logEntry, token);
    return result;
  }, '工具已儲存。');

  const deleteTool = (id) => call(() => api.deleteTool(id, token), '工具已刪除。');

  const saveDept = (payload) => call(() => api.saveDept(payload, token), '單位已儲存。');
  const deleteDept = (id) => call(() => api.deleteDept(id, token), '單位已刪除。');
  const renameCenter = (payload) => call(() => api.renameCenter(payload, token), '中心名稱已更新。');

  const savePersonFull = (payload) => call(() => api.savePersonFull(payload, token), '人員資料已儲存。');
  const deletePerson = (payload) => call(() => api.deletePerson(payload, token), '人員已停用。');
  const permanentDeletePerson = (payload) => call(() => api.permanentDeletePerson(payload, token), '人員已永久刪除。');

  const saveAssignment = (payload) => call(() => api.saveAssignment(payload, token), null);
  const revokeAssignment = (payload) => call(() => api.revokeAssignment(payload, token), '授權已停用。');
  const deleteAssignment = (id) => call(() => api.deleteAssignment(id, token), '停用紀錄已刪除。');

  const saveLog = (payload) => call(() => api.saveLog(payload, token), '授權異動已記錄。');
  const deleteLog = (id) => call(() => api.deleteLog(id, token), '異動紀錄已刪除。');

  const saveMaturity = (payload) => call(() => api.saveMaturity(payload, token), '成熟度評估已儲存。');
  const saveSettings = (payload) => call(() => api.saveSettings(payload, token), '設定已儲存。');

  const value = {
    data,
    loading,
    saving,
    token,
    isAdmin,
    toasts,
    dataSource,
    loadData,
    loadDemoData,
    toast,
    onGoogleLogin,
    logout,
    saveTool,
    deleteTool,
    saveDept,
    deleteDept,
    renameCenter,
    savePersonFull,
    deletePerson,
    permanentDeletePerson,
    saveAssignment,
    revokeAssignment,
    deleteAssignment,
    saveLog,
    deleteLog,
    saveMaturity,
    saveSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
