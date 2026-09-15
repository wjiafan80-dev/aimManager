import React from 'react';
import {createRoot} from 'react-dom/client';
import {AppProvider} from '../src/context/AppContext.jsx';
import {PersonModal} from '../src/pages/Personnel.jsx';
import '../src/index.css';
const person={id:'p-test',name:'測試人員',empId:'TEST',tools:[{id:'a-test',toolId:'gpt',account:'first@example.com',start:'2026-09',end:'2027-09'}]};
createRoot(document.getElementById('root')).render(<AppProvider><div style={{maxWidth:800,padding:24}}><PersonModal person={person} deptId="dept" departments={[{id:'dept',name:'測試單位'}]} tools={[{id:'gpt',name:'ChatGPT',plan:'Business',monthly:8,currency:'USD',color:'#2563eb'}]} usd={32.5} onClose={()=>{}} onSave={payload=>{document.getElementById('result').textContent=JSON.stringify(payload);}}/><pre id="result" /></div></AppProvider>);
