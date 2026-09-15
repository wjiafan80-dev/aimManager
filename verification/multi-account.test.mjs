import test from 'node:test';
import assert from 'node:assert/strict';
import { toolUserCount, toolSeatCount, aiUsersCount, totalIssuedSeats, personMonthlyNTD, seatCostNTD, unassignedCostNTD, distinctTools, normTools } from '../src/utils/calc.js';
import { ymAdd12 } from '../src/utils/date.js';
const tools = [{id:'gpt',currency:'USD',monthly:8,seats:3}];
const person = {id:'p1',tools:[{id:'a1',toolId:'gpt',account:'one@example.com'},{id:'a2',toolId:'gpt',account:'two@example.com'}]};
const departments = [{people:[person]}];
test('同一人兩個帳號：1 人、2 席、兩席費用', () => {
  assert.equal(toolUserCount('gpt',departments),1);
  assert.equal(aiUsersCount(departments),1);
  assert.equal(toolSeatCount('gpt',departments),2);
  assert.equal(totalIssuedSeats(tools,departments),2);
  assert.equal(personMonthlyNTD(person,tools,32.5),520);
  assert.equal(seatCostNTD('monthly',tools,departments,32.5),780);
  assert.equal(unassignedCostNTD('monthly',tools,departments,32.5),260);
  assert.equal(distinctTools(normTools(person.tools)).length,1);
});
test('停用其中一帳號後保留另一帳號；移除人員不占席',()=>{
  const rows=[{people:[{...person,tools:[person.tools[0],{...person.tools[1],revoked:true}]},{...person,id:'removed',removed:true}]}];
  assert.equal(toolSeatCount('gpt',rows),1);
  assert.equal(toolUserCount('gpt',rows),1);
});
test('未設定購買數量仍按兩帳號計費',()=>{
  assert.equal(seatCostNTD('monthly',[{...tools[0],seats:0}],departments,32.5),520);
});
test('開始月預設一年期限',()=>assert.equal(ymAdd12('2026-09'),'2027-09'));
test('試算表日期轉為月份，正確顯示與判斷到期',()=>{
  const entry=normTools([{id:'a',toolId:'gpt',start:'Tue Sep 01 2026 08:00:00 GMT+0800 (台北標準時間)',end:'Wed Sep 01 2027 08:00:00 GMT+0800 (台北標準時間)'}])[0];
  assert.equal(entry.start,'2026-09'); assert.equal(entry.end,'2027-09');
});
