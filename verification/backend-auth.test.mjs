import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./backend-auth.gs', import.meta.url), 'utf8');
function fixture(overrides = {}) {
  let reads = 0;
  const claims = { aud: '847735841044-q8m1daul6t38ttal3dvehti4ba3imjlb.apps.googleusercontent.com', iss: 'https://accounts.google.com', exp: Math.floor(Date.now()/1000)+3600, email: 'admin@example.com', email_verified: 'true', ...overrides };
  const ctx = vm.createContext({
    Date, Number, JSON,
    out: x => x,
    getData: () => { reads++; return { departments: [] }; },
    getSheet: () => ({getDataRange:()=>({getValues:()=>[['email'],['admin@example.com']]})}),
    UrlFetchApp: {fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify(claims)})},
  });
  vm.runInContext(source, ctx);
  return {ctx, reads:()=>reads, post: token => ctx.doPost({postData:{contents:JSON.stringify({action:'getData',token})}})};
}
test('GET 不洩漏資料，即使傳入 token',()=>{
  const f=fixture(); assert.equal(f.ctx.doGet({parameter:{token:'test'}}).code,401); assert.equal(f.reads(),0);
});
test('沒有 token 的 POST 不讀取公司資料',()=>{
  const f=fixture(); assert.equal(f.post().code,401); assert.equal(f.reads(),0);
});
for(const [name, claims] of Object.entries({
  outsider:{email:'outsider@example.com'}, audience:{aud:'other-client'}, issuer:{iss:'https://attacker.example'}, expired:{exp:1}, unverified:{email_verified:false}, noExpiry:{exp:undefined}
})) test(`拒絕 ${name}`,()=>{const f=fixture(claims);assert.equal(f.post('test').code,401);assert.equal(f.reads(),0);});
test('現有管理員有效登入可以讀取資料',()=>{const f=fixture();assert.ok(f.post('test').departments);assert.equal(f.reads(),1);});
