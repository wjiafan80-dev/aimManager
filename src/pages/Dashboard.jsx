import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  activePeopleCount,
  aiUsersCount,
  getExpiringItems,
  normTools,
  seatCostNTD,
  toolMonthlyNTD,
  toolUserCount,
  totalIssuedSeats,
  totalPurchasedSeats,
  unassignedCostNTD,
} from '../utils/calc.js';
import { ntd, toolName } from '../utils/format.js';

function buildTopCostTools(tools, departments, usd) {
  return [...tools]
    .map((tool) => {
      const usedSeats = toolUserCount(tool.id, departments);
      const chargedSeats = tool.seats || usedSeats;
      return {
        ...tool,
        usedSeats,
        chargedSeats,
        monthlyCost: toolMonthlyNTD(tool, usd) * chargedSeats,
      };
    })
    .sort((left, right) => right.monthlyCost - left.monthlyCost)
    .slice(0, 3);
}

function buildIdleTools(tools, departments) {
  return [...tools]
    .map((tool) => {
      const usedSeats = toolUserCount(tool.id, departments);
      const idleSeats = Math.max(0, (tool.seats || 0) - usedSeats);
      return { ...tool, usedSeats, idleSeats };
    })
    .filter((tool) => tool.idleSeats > 0)
    .sort((left, right) => right.idleSeats - left.idleSeats)
    .slice(0, 4);
}

function buildMultiToolPeople(departments) {
  return departments
    .flatMap((department) =>
      (department.people || [])
        .filter((person) => !person.removed)
        .map((person) => {
          const activeTools = normTools(person.tools).filter((tool) => !tool.revoked);
          return { department, person, activeTools };
        }),
    )
    .filter(({ activeTools }) => activeTools.length >= 2)
    .sort((left, right) => right.activeTools.length - left.activeTools.length)
    .slice(0, 4);
}

function buildCenterUsage(departments) {
  return [...departments.reduce((map, department) => {
    const centerName = department.center || department.name || '未分類';
    const activePeople = (department.people || []).filter((person) => !person.removed);
    const aiUsers = activePeople.filter((person) =>
      normTools(person.tools).some((tool) => !tool.revoked),
    ).length;

    const current = map.get(centerName) || { center: centerName, totalPeople: 0, aiUsers: 0 };
    current.totalPeople += activePeople.length;
    current.aiUsers += aiUsers;
    map.set(centerName, current);
    return map;
  }, new Map()).values()].sort((left, right) => right.aiUsers - left.aiUsers);
}

export default function Dashboard({ onNav }) {
  const { data } = useApp();
  const [showAllCenters, setShowAllCenters] = useState(false);

  if (!data) return null;

  const { tools, departments, settings } = data;
  const usd = settings.usd_to_ntd;

  const totalPeople = activePeopleCount(departments);
  const aiUsers = aiUsersCount(departments);
  const penetration = totalPeople ? Math.round((aiUsers / totalPeople) * 100) : 0;
  const issuedSeats = totalIssuedSeats(tools, departments);
  const purchasedSeats = totalPurchasedSeats(tools);
  const monthlyTotal = seatCostNTD('monthly', tools, departments, usd);
  const annualTotal = seatCostNTD('annual', tools, departments, usd);
  const idleCost = unassignedCostNTD('monthly', tools, departments, usd);
  const expiringItems = getExpiringItems(departments, tools, 2);
  const urgentExpiringItems = expiringItems.slice(0, 5);
  const topCostTools = buildTopCostTools(tools, departments, usd);
  const idleTools = buildIdleTools(tools, departments);
  const multiToolPeople = buildMultiToolPeople(departments);
  const centerUsage = buildCenterUsage(departments);
  const visibleCenterUsage = showAllCenters ? centerUsage : centerUsage.slice(0, 3);

  return (
    <div>
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #ecfeff 100%)',
          border: '1px solid #dbeafe',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', color: '#2563eb', fontWeight: 800, marginBottom: 8 }}>
              AI 工具管理總覽
            </div>
            <h2 style={{ fontSize: 30, lineHeight: 1.25, marginBottom: 10 }}>
              先看人數、花費、閒置與到期，
              <br />
              主管一眼就能掌握目前導入狀況
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 700, margin: 0 }}>
              這裡整理目前實際使用 AI 工具的人數、授權使用情況、每月與每年花費，以及近期到期與閒置風險，方便快速判讀下一步要優先調整哪一塊。
            </p>
          </div>

          <div
            style={{
              minWidth: 260,
              background: '#ffffffd9',
              border: '1px solid #dbeafe',
              borderRadius: 18,
              padding: '18px 20px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>目前 AI 導入覆蓋率</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>{penetration}%</div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              {aiUsers} 人使用 AI 工具
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              全公司共 {totalPeople} 位在職人員，目前已有 {aiUsers} 位配置 AI 工具。
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="AI 使用人數"
          value={aiUsers}
          sub={`共 ${totalPeople} 位在職人員，使用率 ${penetration}%`}
          color="#2563eb"
          onClick={() => onNav('personnel')}
        />
        <StatCard
          label="已發 / 已購買授權"
          value={`${issuedSeats}${purchasedSeats ? ` / ${purchasedSeats}` : ''}`}
          sub={purchasedSeats > 0 ? `目前共管理 ${tools.length} 項工具授權` : '目前以實際使用人數計算授權需求'}
          color={purchasedSeats > 0 && issuedSeats > purchasedSeats ? '#ef4444' : '#0f766e'}
          onClick={() => onNav('tools')}
        />
        <StatCard
          label="每月總費用"
          value={ntd(monthlyTotal)}
          sub={idleCost > 0 ? `其中閒置成本約 ${ntd(idleCost)} / 月` : '目前沒有明顯閒置成本'}
          color={idleCost > 0 ? '#f59e0b' : '#16a34a'}
          onClick={() => onNav('reports')}
        />
        <StatCard
          label="每年總費用"
          value={ntd(annualTotal)}
          sub="以目前工具定價與授權數量估算"
          color="#7c3aed"
          onClick={() => onNav('reports')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 20, marginBottom: 20 }}>
        <InsightCard
          title="本週管理重點"
          subtitle=""
        >
          <InsightRow
            title="目前月費最高工具"
            value={topCostTools[0] ? `${toolName(topCostTools[0])} ${ntd(topCostTools[0].monthlyCost)} / 月` : '目前沒有資料'}
            tone="#2563eb"
          />
          <InsightRow
            title="目前閒置最多工具"
            value={idleTools[0] ? `${toolName(idleTools[0])} 閒置 ${idleTools[0].idleSeats} 席` : '目前沒有閒置授權'}
            tone="#f59e0b"
          />
          <InsightRow
            title="最近需要處理的到期項目"
            value={urgentExpiringItems[0] ? `${urgentExpiringItems[0].person.name} / ${toolName(urgentExpiringItems[0].tool)} / ${urgentExpiringItems[0].entry.end}` : '近 2 個月沒有到期項目'}
            tone="#ef4444"
          />
        </InsightCard>

        <InsightCard
          title="整體概況"
          subtitle="快速掌握目前管理規模"
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <SummaryPill label="AI 使用人數" value={`${aiUsers} 人`} tone="#2563eb" />
            <SummaryPill label="工具種類" value={`${tools.length} 項`} tone="#0f766e" />
            <SummaryPill label="近期待處理到期" value={`${expiringItems.length} 筆`} tone="#f59e0b" />
            <SummaryPill label="多工具使用者" value={`${multiToolPeople.length} 人`} tone="#7c3aed" />
          </div>
        </InsightCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ListCard
          title="各中心 AI 使用人數"
          subtitle="預設顯示前 3 個導入最多的單位，可再展開查看全部"
          actionLabel={showAllCenters ? '收合' : '展開全部'}
          onAction={() => setShowAllCenters((current) => !current)}
        >
          {visibleCenterUsage.map((item) => (
            <ListRow
              key={item.center}
              left={item.center}
              right={`${item.aiUsers} 人`}
              sub={`共 ${item.totalPeople} 人，導入率 ${item.totalPeople ? Math.round((item.aiUsers / item.totalPeople) * 100) : 0}%`}
              tone="#2563eb"
            />
          ))}
          {centerUsage.length > 3 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', paddingTop: 4 }}>
              {showAllCenters ? `目前顯示全部 ${centerUsage.length} 個單位` : `目前顯示前 3 個單位，另有 ${centerUsage.length - 3} 個單位`}
            </div>
          )}
        </ListCard>

        <ListCard
          title="高成本工具"
          subtitle="目前月費支出最高的工具"
          actionLabel="查看費用報表"
          onAction={() => onNav('reports')}
        >
          {topCostTools.map((tool) => (
            <ListRow
              key={tool.id}
              left={toolName(tool)}
              right={`${ntd(tool.monthlyCost)} / 月`}
              sub={`使用 ${tool.usedSeats} 人，計費 ${tool.chargedSeats} 席`}
            />
          ))}
        </ListCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ListCard
          title="近期到期項目"
          subtitle="近 2 個月內需要續約或調整的人員與工具"
          actionLabel="查看費用報表"
          onAction={() => onNav('reports')}
        >
          {urgentExpiringItems.length > 0 ? urgentExpiringItems.map(({ person, dept, tool, entry, expired }) => (
            <ListRow
              key={`${person.id}-${tool.id}-${entry.end}`}
              left={`${person.name} / ${toolName(tool)}`}
              right={entry.end}
              sub={`${dept.name}${expired ? '，已到期' : '，即將到期'}`}
              tone={expired ? '#ef4444' : '#f59e0b'}
            />
          )) : <EmptyHint text="近 2 個月沒有到期項目" />}
        </ListCard>

        <ListCard
          title="閒置與重度使用觀察"
          subtitle="一邊看閒置授權，一邊看多工具使用者"
          actionLabel="查看工具管理"
          onAction={() => onNav('tools')}
        >
          {idleTools.length > 0 ? idleTools.map((tool) => (
            <ListRow
              key={tool.id}
              left={toolName(tool)}
              right={`閒置 ${tool.idleSeats} 席`}
              sub={`已購買 ${tool.seats} 席，目前使用 ${tool.usedSeats} 人`}
              tone="#f59e0b"
            />
          )) : (
            <EmptyHint text="目前沒有閒置授權" />
          )}

          {multiToolPeople.length > 0 && (
            <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>多工具使用者</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {multiToolPeople.map(({ department, person, activeTools }) => (
                  <ListRow
                    key={person.id}
                    left={person.name}
                    right={`${activeTools.length} 項工具`}
                    sub={`${department.name}，${activeTools.slice(0, 3).map((tool) => {
                      const matchedTool = tools.find((item) => item.id === tool.toolId);
                      return matchedTool ? toolName(matchedTool) : tool.toolId;
                    }).join('、')}`}
                    tone="#7c3aed"
                  />
                ))}
              </div>
            </div>
          )}
        </ListCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div className="card stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 6 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{sub}</div>
      </div>
    </div>
  );
}

function InsightCard({ title, subtitle, children }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{subtitle}</div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </div>
  );
}

function InsightRow({ title, value, tone }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}

function SummaryPill({ label, value, tone }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 12,
        background: `${tone}12`,
        border: `1px solid ${tone}22`,
        padding: '12px 14px',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: tone }}>{value}</span>
    </div>
  );
}

function ListCard({ title, subtitle, actionLabel, onAction, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>
        </div>
        {actionLabel && (
          <button className="btn btn-ghost btn-sm" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      <div style={{ padding: '8px 16px 14px', display: 'grid', gap: 10 }}>{children}</div>
    </div>
  );
}

function ListRow({ left, right, sub, tone = 'var(--text)' }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 700 }}>{left}</span>
        <span style={{ color: tone, fontWeight: 700 }}>{right}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

function EmptyHint({ text }) {
  return <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>{text}</div>;
}
