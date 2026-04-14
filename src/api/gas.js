const GAS_URL = import.meta.env.VITE_GAS_URL;

async function gasGet(params = {}) {
  const url = new URL(GAS_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { redirect: 'follow' });
  if (!res.ok) throw new Error('API 回應錯誤：' + res.status);
  return res.json();
}

async function gasPost(action, data, token = null) {
  const body = { action, data };
  if (token) body.token = token;
  const res = await fetch(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('API 回應錯誤：' + res.status);
  return res.json();
}

export const api = {
  getData:               ()           => gasGet({ action: 'getData' }),
  saveTool:              (d, tk)      => gasPost('saveTool', d, tk),
  deleteTool:            (id, tk)     => gasPost('deleteTool', { id }, tk),
  saveDept:              (d, tk)      => gasPost('saveDept', d, tk),
  deleteDept:            (id, tk)     => gasPost('deleteDept', { id }, tk),
  renameCenter:          (d, tk)      => gasPost('renameCenter', d, tk),
  savePersonFull:        (d, tk)      => gasPost('savePersonFull', d, tk),
  deletePerson:          (d, tk)      => gasPost('deletePerson', d, tk),
  permanentDeletePerson: (d, tk)      => gasPost('permanentDeletePerson', d, tk),
  saveAssignment:        (d, tk)      => gasPost('saveAssignment', d, tk),
  revokeAssignment:      (d, tk)      => gasPost('revokeAssignment', d, tk),
  deleteAssignment:      (id, tk)     => gasPost('deleteAssignment', { id }, tk),
  saveLog:               (d, tk)      => gasPost('saveLog', d, tk),
  deleteLog:             (id, tk)     => gasPost('deleteLog', { id }, tk),
  saveMaturity:          (d, tk)      => gasPost('saveMaturity', d, tk),
  saveSettings:          (d, tk)      => gasPost('saveSettings', d, tk),
};
