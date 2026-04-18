export const demoData = {
  settings: {
    company: '大愛電視 AI 工具管理展示版',
    usd_to_ntd: 32.5,
  },
  tools: [
    { id: 'chatgpt-team', name: 'ChatGPT', plan: 'Team', seats: 18, currency: 'USD', monthly: 25, annual: 300, color: '#10b981' },
    { id: 'gemini-business', name: 'Gemini', plan: 'Business', seats: 10, currency: 'USD', monthly: 20, annual: 240, color: '#2563eb' },
    { id: 'claude-team', name: 'Claude', plan: 'Team', seats: 8, currency: 'USD', monthly: 30, annual: 360, color: '#f97316' },
    { id: 'midjourney', name: 'Midjourney', plan: 'Standard', seats: 4, currency: 'USD', monthly: 30, annual: 360, color: '#8b5cf6' },
    { id: 'notion-ai', name: 'Notion AI', plan: 'Add-on', seats: 12, currency: 'USD', monthly: 10, annual: 120, color: '#111827' },
    { id: 'canva-pro', name: 'Canva', plan: 'Pro', seats: 6, currency: 'USD', monthly: 15, annual: 180, color: '#06b6d4' },
  ],
  departments: [
    {
      id: 'newsroom',
      center: '新聞中心',
      name: '新聞編採',
      people: [
        {
          id: 'p1',
          name: '王曉雯',
          empId: 'N001',
          removed: false,
          tools: [
            { id: 'a1', toolId: 'chatgpt-team', account: 'news-edit-01@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
            { id: 'a2', toolId: 'notion-ai', account: 'news-edit-01@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
          ],
        },
        {
          id: 'p2',
          name: '林子傑',
          empId: 'N014',
          removed: false,
          tools: [
            { id: 'a3', toolId: 'chatgpt-team', account: 'news-plan-02@daai.tv', start: '2026-02', end: '2026-05', revoked: false },
            { id: 'a4', toolId: 'claude-team', account: 'news-plan-02@daai.tv', start: '2026-02', end: '2026-07', revoked: false },
          ],
        },
        {
          id: 'p3',
          name: '陳思穎',
          empId: 'N022',
          removed: false,
          tools: [
            { id: 'a5', toolId: 'gemini-business', account: 'news-digital-03@daai.tv', start: '2026-01', end: '2026-10', revoked: false },
          ],
        },
      ],
    },
    {
      id: 'program',
      center: '節目中心',
      name: '節目製作',
      people: [
        {
          id: 'p4',
          name: '張祐誠',
          empId: 'P005',
          removed: false,
          tools: [
            { id: 'a6', toolId: 'chatgpt-team', account: 'program-01@daai.tv', start: '2026-01', end: '2026-04', revoked: false },
            { id: 'a7', toolId: 'midjourney', account: 'program-01@daai.tv', start: '2026-01', end: '2026-08', revoked: false },
          ],
        },
        {
          id: 'p5',
          name: '黃鈺庭',
          empId: 'P011',
          removed: false,
          tools: [
            { id: 'a8', toolId: 'canva-pro', account: 'design-02@daai.tv', start: '2026-02', end: '2026-12', revoked: false },
            { id: 'a9', toolId: 'notion-ai', account: 'design-02@daai.tv', start: '2026-02', end: '2026-12', revoked: false },
          ],
        },
        {
          id: 'p6',
          name: '李宜庭',
          empId: 'P018',
          removed: false,
          tools: [
            { id: 'a10', toolId: 'chatgpt-team', account: 'program-03@daai.tv', start: '2026-03', end: '2026-06', revoked: false },
          ],
        },
      ],
    },
    {
      id: 'marketing',
      center: '品牌中心',
      name: '行銷企劃',
      people: [
        {
          id: 'p7',
          name: '吳佩珊',
          empId: 'M003',
          removed: false,
          tools: [
            { id: 'a11', toolId: 'chatgpt-team', account: 'marketing-01@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
            { id: 'a12', toolId: 'gemini-business', account: 'marketing-01@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
            { id: 'a13', toolId: 'canva-pro', account: 'marketing-01@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
          ],
        },
        {
          id: 'p8',
          name: '許智偉',
          empId: 'M015',
          removed: false,
          tools: [
            { id: 'a14', toolId: 'notion-ai', account: 'marketing-02@daai.tv', start: '2026-02', end: '2026-12', revoked: false },
          ],
        },
      ],
    },
    {
      id: 'it',
      center: '管理中心',
      name: '資訊室',
      people: [
        {
          id: 'p9',
          name: '伍家範',
          empId: 'IT001',
          removed: false,
          tools: [
            { id: 'a15', toolId: 'chatgpt-team', account: 'it-admin@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
            { id: 'a16', toolId: 'claude-team', account: 'it-admin@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
            { id: 'a17', toolId: 'gemini-business', account: 'it-admin@daai.tv', start: '2026-01', end: '2026-12', revoked: false },
          ],
        },
        {
          id: 'p10',
          name: '周建宏',
          empId: 'IT007',
          removed: false,
          tools: [
            { id: 'a18', toolId: 'chatgpt-team', account: 'it-helpdesk@daai.tv', start: '2026-02', end: '2026-05', revoked: false },
            { id: 'a19', toolId: 'claude-team', account: 'it-helpdesk@daai.tv', start: '2026-02', end: '2026-09', revoked: false },
            { id: 'a20', toolId: 'notion-ai', account: 'it-helpdesk@daai.tv', start: '2026-02', end: '2026-12', revoked: false },
          ],
        },
        {
          id: 'p11',
          name: '高子晴',
          empId: 'IT010',
          removed: false,
          tools: [
            { id: 'a21', toolId: 'gemini-business', account: 'it-pm@daai.tv', start: '2026-03', end: '2026-11', revoked: false },
          ],
        },
      ],
    },
  ],
  log: [
    { id: 'l1', toolId: 'chatgpt-team', month: '2026-01', delta: 6 },
    { id: 'l2', toolId: 'chatgpt-team', month: '2026-02', delta: 4 },
    { id: 'l3', toolId: 'chatgpt-team', month: '2026-03', delta: 2 },
    { id: 'l4', toolId: 'gemini-business', month: '2026-01', delta: 3 },
    { id: 'l5', toolId: 'gemini-business', month: '2026-02', delta: 2 },
    { id: 'l6', toolId: 'claude-team', month: '2026-02', delta: 2 },
    { id: 'l7', toolId: 'claude-team', month: '2026-03', delta: 1 },
    { id: 'l8', toolId: 'notion-ai', month: '2026-01', delta: 4 },
    { id: 'l9', toolId: 'notion-ai', month: '2026-02', delta: 2 },
    { id: 'l10', toolId: 'canva-pro', month: '2026-02', delta: 2 },
    { id: 'l11', toolId: 'midjourney', month: '2026-01', delta: 1 },
  ],
  maturity: {
    newsroom: { training: 3, process: 3, tracking: 2, support: 3 },
    program: { training: 3, process: 2, tracking: 2, support: 3 },
    marketing: { training: 4, process: 4, tracking: 3, support: 4 },
    it: { training: 5, process: 4, tracking: 4, support: 4 },
  },
};
