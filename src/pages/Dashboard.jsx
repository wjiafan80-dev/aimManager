import { useApp } from '../context/AppContext.jsx';
import {
  activePeopleCount,
  aiUsersCount,
  fpScore,
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

function getScoreLabel(score) {
  if (score >= 70) return '全面推進期';
  if (score >= 40) return '擴大導入期';
  return '基礎建置期';
}

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
    .slice(0, 3);
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

export default function Dashboard({ onNav }) {
  const { data } = useApp();
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
  const score = fpScore(departments, tools);
  const expiringItems = getExpiringItems(departments, tools, 2);
  const urgentExpiringItems = expiringItems.slice(0, 5);
  const topCostTools = buildTopCostTools(tools, departments, usd);
  const idleTools = buildIdleTools(tools, departments);
  const multiToolPeople = buildMultiToolPeople(departments);

  return (
    <div>
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #ecfeff 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', color: 'var(--primary)', fontWeight: 700, marginBottom: 8 }}>
              AI 工具管理儀表板
            </div>
            <h2 style={{ fontSize: 28, lineHeight: 1.25, marginBottom: 10 }}>
              集中掌握 AI 工具授權、使用情況與預算風險
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 680 }}>
              提供統一的工具、人員、授權與費用資訊，方便日常管理、授權盤點與預算追蹤。
            </p>
          </div>

          <div
            style={{
              minWidth: 220,
              background: '#ffffffcc',
              border: '1px solid #dbeafe',
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>AI 戰力指數</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{score}</div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>{getScoreLabel(score)}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              目前 AI 使用率 {penetration}% ，已形成跨單位使用基礎。
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
          label="已配置 / 已採購授權"
          value={`${issuedSeats}${purchasedSeats ? ` / ${purchasedSeats}` : ''}`}
          sub={purchasedSeats > 0 ? `目前追蹤 ${tools.length} 項工具授權` : '目前以實際使用人數估算授權'}
          color={purchasedSeats > 0 && issuedSeats > purchasedSeats ? '#ef4444' : '#0f766e'}
          onClick={() => onNav('tools')}
        />
        <StatCard
          label="每月成本"
          value={ntd(monthlyTotal)}
          sub={idleCost > 0 ? `可優先檢討閒置成本 ${ntd(idleCost)}` : '目前未發現明顯閒置成本'}
          color={idleCost > 0 ? '#f59e0b' : '#16a34a'}
          onClick={() => onNav('reports')}
        />
        <StatCard
          label="年度預算需求"
          value={ntd(annualTotal)}
          sub="可作為年度採購與整併評估基準"
          color="#7c3aed"
          onClick={() => onNav('reports')}
        />
      </div>

      <div className="quick-actions" style={{ marginBottom: 20 }}>
        <button className="quick-btn" onClick={() => onNav('reports')}>
          <QuickIcon icon="report" />
          查看報表
        </button>
        <button className="quick-btn" onClick={() => onNav('personnel')}>
          <QuickIcon icon="people" />
          看使用人員
        </button>
        <button className="quick-btn" onClick={() => onNav('tools')}>
          <QuickIcon icon="tools" />
          看工具授權
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
        <InsightCard
          title="重點摘要"
          subtitle="整合目前最需要優先關注的管理資訊"
        >
          <InsightRow
            title="成本最高工具"
            value={topCostTools[0] ? `${toolName(topCostTools[0])} ${ntd(topCostTools[0].monthlyCost)}/月` : '尚無資料'}
            tone="#2563eb"
          />
          <InsightRow
            title="閒置授權風險"
            value={idleTools[0] ? `${toolName(idleTools[0])} 閒置 ${idleTools[0].idleSeats} 席` : '目前無明顯閒置授權'}
            tone="#f59e0b"
          />
          <InsightRow
            title="近期到期授權"
            value={urgentExpiringItems[0] ? `${urgentExpiringItems[0].person.name} / ${toolName(urgentExpiringItems[0].tool)} / ${urgentExpiringItems[0].entry.end}` : '近 2 個月無到期授權'}
            tone="#ef4444"
          />
        </InsightCard>

        <InsightCard
          title="整體狀態"
          subtitle="快速掌握目前的使用、到期與配置情形"
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <SummaryPill label="使用人數" value={`${aiUsers} 人`} tone="#2563eb" />
            <SummaryPill label="工具數量" value={`${tools.length} 項`} tone="#0f766e" />
            <SummaryPill label="到期提醒" value={`${expiringItems.length} 筆`} tone="#f59e0b" />
            <SummaryPill label="多工具使用者" value={`${multiToolPeople.length} 人`} tone="#7c3aed" />
          </div>
        </InsightCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ListCard
          title="高成本工具排行"
          subtitle="先找金額高、再問是否真的有必要保留"
          actionLabel="前往報表"
          onAction={() => onNav('reports')}
        >
          {topCostTools.map((tool) => (
            <ListRow
              key={tool.id}
              left={toolName(tool)}
              right={`${ntd(tool.monthlyCost)} / 月`}
              sub={`使用 ${tool.usedSeats} 人，計價 ${tool.chargedSeats} 席`}
            />
          ))}
        </ListCard>

        <ListCard
          title="近期到期清單"
          subtitle="用於追蹤近期需要續約或調整的授權"
          actionLabel="前往報表"
          onAction={() => onNav('reports')}
        >
          {urgentExpiringItems.length > 0 ? urgentExpiringItems.map(({ person, dept, tool, entry, expired }) => (
            <ListRow
              key={`${person.id}-${tool.id}-${entry.end}`}
              left={`${person.name} / ${toolName(tool)}`}
              right={entry.end}
              sub={`${dept.name}${expired ? '，已逾期' : '，即將到期'}`}
              tone={expired ? '#ef4444' : '#f59e0b'}
            />
          )) : <EmptyHint text="近 2 個月沒有到期授權。" />}
        </ListCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ListCard
          title="閒置授權清單"
          subtitle="用於盤點可再分配或可檢討的授權席次"
          actionLabel="看工具頁"
          onAction={() => onNav('tools')}
        >
          {idleTools.length > 0 ? idleTools.map((tool) => (
            <ListRow
              key={tool.id}
              left={toolName(tool)}
              right={`閒置 ${tool.idleSeats} 席`}
              sub={`已購 ${tool.seats} 席，目前使用 ${tool.usedSeats} 人`}
              tone="#f59e0b"
            />
          )) : <EmptyHint text="目前沒有閒置授權。" />}
        </ListCard>

        <ListCard
          title="多工具使用者"
          subtitle="適合拿來談工具重疊與整併策略"
          actionLabel="看人員頁"
          onAction={() => onNav('personnel')}
        >
          {multiToolPeople.length > 0 ? multiToolPeople.map(({ department, person, activeTools }) => (
            <ListRow
              key={person.id}
              left={person.name}
              right={`${activeTools.length} 項工具`}
              sub={`${department.name}：${activeTools.slice(0, 3).map((tool) => {
                const matchedTool = tools.find((item) => item.id === tool.toolId);
                return matchedTool ? toolName(matchedTool) : tool.toolId;
              }).join('、')}`}
              tone="#7c3aed"
            />
          )) : <EmptyHint text="目前沒有多工具使用者。" />}
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

function QuickIcon({ icon }) {
  if (icon === 'report') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
        <path d="M9 17v-6M13 17V7M17 17v-3M5 21h14" />
      </svg>
    );
  }

  if (icon === 'people') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (icon === 'tools') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
      <path d="M12 2 15 8l6 .9-4.5 4.3 1.1 6L12 16.8 6.4 19.2l1.1-6L3 8.9 9 8z" />
    </svg>
  );
}
