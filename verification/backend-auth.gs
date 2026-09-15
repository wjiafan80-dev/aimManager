function doGet(e) {
  return out({ success: false, error: "未授權，請使用管理員帳號登入", code: 401 });
}
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, data, token } = body;
    if (!verifyAdmin(token)) {
      return out({ success: false, error: '未授權，請使用管理員帳號登入', code: 401 });
    }
    switch (action) {
      case 'getData': return out(getData());
      case 'saveTool': return out(saveTool(data));
      case 'deleteTool': return out(deleteTool(data.id));
      case 'saveDept': return out(saveDept(data));
      case 'deleteDept': return out(deleteDept(data.id));
      case 'renameCenter': return out(renameCenter(data));
      case 'savePersonFull': return out(savePersonFull(data));
      case 'deletePerson': return out(deletePerson(data));
      case 'permanentDeletePerson': return out(permanentDeletePerson(data));
      case 'saveAssignment': return out(saveAssignment(data));
      case 'revokeAssignment': return out(revokeAssignment(data));
      case 'deleteAssignment': return out(deleteAssignment(data.id));
      case 'saveLog': return out(saveLog(data));
      case 'deleteLog': return out(deleteLog(data.id));
      case 'saveMaturity': return out(saveMaturity(data));
      case 'saveSettings': return out(saveSettings(data));
      default: return out({ success: false, error: 'Unknown action' });
    }
  } catch(err) {
    return out({ success: false, error: err.message });
  }
}
function verifyAdmin(idToken) {
  if (!idToken) return false;
  try {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken,
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return false;
    const info = JSON.parse(res.getContentText());
    if (info.aud !== "847735841044-q8m1daul6t38ttal3dvehti4ba3imjlb.apps.googleusercontent.com") return false;
    if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') return false;
    if (!Number.isFinite(Number(info.exp)) || Number(info.exp) <= Date.now() / 1000) return false;
    if (!info.email || (info.email_verified !== true && info.email_verified !== 'true')) return false;
    return isAdminEmail(info.email);
  } catch(e) { return false; }
}
function isAdminEmail(email) {
  const sheet = getSheet('Admins');
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) return true;
  }
  return false;
}
