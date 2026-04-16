import { C, STAGE_COLOR, STAGE_LABELS } from "./theme";

// ── Core components ──────────────────────────────────────────────────────────
export const Badge = ({ label, color=C.accent }) => (
  <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{label}</span>
);

export const Btn = ({ onClick, children, color=C.accent, outline, small, danger, disabled, style:st={} }) => {
  const bg = danger ? C.red : color;
  return (
    <button onClick={onClick} disabled={disabled} style={{ cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.45:1, border:outline?`1.5px solid ${bg}`:"none", background:outline?"transparent":bg, color:outline?bg:"#fff", borderRadius:7, padding:small?"5px 12px":"9px 18px", fontFamily:"inherit", fontSize:small?11:13, fontWeight:600, display:"flex", alignItems:"center", gap:5, transition:"opacity 0.15s", ...st }}>
      {children}
    </button>
  );
};

export const Input = ({ label, value, onChange, type="text", placeholder, required, disabled, style:st={} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:600, color:C.textMid, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ border:`1.5px solid ${C.border}`, borderRadius:7, padding:"8px 11px", fontSize:13, fontFamily:"'IBM Plex Mono',monospace", color:C.text, outline:"none", background:disabled?"#f1f5f9":"#f8fafc", cursor:disabled?"not-allowed":"text", opacity:disabled?0.6:1, ...st }} />
  </div>
);

export const Textarea = ({ label, value, onChange, placeholder, rows=3, style:st={} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:600, color:C.textMid, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}</label>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ border:`1.5px solid ${C.border}`, borderRadius:7, padding:"8px 11px", fontSize:13, fontFamily:"inherit", color:C.text, outline:"none", background:"#f8fafc", resize:"vertical", ...st }}/>
  </div>
);

export const Select = ({ label, value, onChange, options, required, disabled }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:600, color:C.textMid, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
      style={{ border:`1.5px solid ${C.border}`, borderRadius:7, padding:"8px 11px", fontSize:13, fontFamily:"inherit", color:C.text, background:disabled?"#f1f5f9":"#f8fafc", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.6:1 }}>
      <option value="">-- Select --</option>
      {options.map(o => typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const Card = ({ children, style:st={}, title, action, accent }) => (
  <div style={{ background:C.card, borderRadius:12, border:`1px solid ${accent?accent+"33":C.border}`, padding:20, ...(accent?{borderLeft:`3px solid ${accent}`}:{}), ...st }}>
    {title && <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{title}</span>
      {action}
    </div>}
    {children}
  </div>
);

export const Stat = ({ label, value, sub, color=C.accent, icon, trend }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px", display:"flex", flexDirection:"column", gap:4 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:11, fontWeight:600, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
      {icon && <span style={{ fontSize:20 }}>{icon}</span>}
    </div>
    <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1.1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.textMid }}>{sub}</div>}
    {trend !== undefined && <div style={{ fontSize:11, color:trend>=0?C.green:C.red }}>{trend>=0?"↑":"↓"} {Math.abs(trend)}% vs yesterday</div>}
  </div>
);

export const ErrBanner = ({ err }) => err ? (
  <div style={{ background:C.redLight, border:`1.5px solid ${C.red}`, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.red }}>⚠ {err}</div>
) : null;

export const SuccessBanner = ({ msg, onDismiss }) => msg ? (
  <div style={{ background:C.greenLight, border:`1.5px solid ${C.green}`, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.green, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
    <span>✓ {msg}</span>
    {onDismiss && <button onClick={onDismiss} style={{ background:"none", border:"none", cursor:"pointer", color:C.green, fontSize:16, lineHeight:1 }}>×</button>}
  </div>
) : null;

export const Loading = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, gap:10, color:C.textLight }}>
    <span style={{ fontSize:20, animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> Loading…
  </div>
);

export const EmptyState = ({ icon="📋", message, action }) => (
  <div style={{ textAlign:"center", padding:"40px 20px", color:C.textLight }}>
    <div style={{ fontSize:36, marginBottom:10, opacity:0.5 }}>{icon}</div>
    <div style={{ fontSize:14 }}>{message}</div>
    {action && <div style={{ marginTop:14 }}>{action}</div>}
  </div>
);

export const PriorityBadge = ({ p }) => (
  <Badge label={p==="emergency"?"🚨 EMERGENCY":p==="urgent"?"⚡ URGENT":"Normal"} color={p==="emergency"?C.red:p==="urgent"?C.amber:C.textLight}/>
);

export const StageBadge = ({ stage }) => (
  <Badge label={STAGE_LABELS[stage]||stage} color={STAGE_COLOR[stage]||C.textMid}/>
);

// ── SVG Charts ────────────────────────────────────────────────────────────────
export function BarChart({ data=[], height=140, color=C.accent }) {
  if (!data.length) return <EmptyState message="No chart data" icon="📊"/>;
  const max = Math.max(...data.map(d=>d.value), 1);
  const W = data.length * 58;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width:"100%", height, overflow:"visible" }}>
      {data.map((d,i) => {
        const barH = Math.max((d.value/max)*(height-38),2);
        const x = i*58+4, y = height-28-barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={50} height={barH} fill={d.color||color} rx={4} opacity={0.85}/>
            <text x={x+25} y={height-10} textAnchor="middle" fontSize={9} fill={C.textLight}>{d.label}</text>
            {d.value>0&&<text x={x+25} y={y-5} textAnchor="middle" fontSize={9} fill={C.textMid} fontWeight="600">{d.display||d.value.toLocaleString()}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({ data=[], size=130, label }) {
  if (!data.length||data.every(d=>d.value===0)) return <EmptyState message="No data" icon="📊"/>;
  const total = data.reduce((s,d)=>s+d.value,0)||1;
  const cx=size/2, cy=size/2, r=size*0.37, ri=size*0.24;
  let cum=0;
  const slices = data.map(d => {
    const a1=(cum/total)*Math.PI*2-Math.PI/2; cum+=d.value;
    const a2=(cum/total)*Math.PI*2-Math.PI/2;
    const large=(d.value/total)>0.5?1:0;
    const cos1=Math.cos(a1),sin1=Math.sin(a1),cos2=Math.cos(a2),sin2=Math.sin(a2);
    return { ...d, path:`M${cx+r*cos1} ${cy+r*sin1} A${r} ${r} 0 ${large} 1 ${cx+r*cos2} ${cy+r*sin2} L${cx+ri*cos2} ${cy+ri*sin2} A${ri} ${ri} 0 ${large} 0 ${cx+ri*cos1} ${cy+ri*sin1}Z` };
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width:size, height:size, flexShrink:0 }}>
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} opacity={0.88}/>)}
        {label&&<text x={cx} y={cy+4} textAnchor="middle" fontSize={10} fontWeight="700" fill={C.textMid}>{label}</text>}
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {data.filter(d=>d.value>0).map((d,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:d.color, flexShrink:0 }}/>
            <span style={{ color:C.textMid }}>{d.label}</span>
            <span style={{ color:C.text, fontWeight:700, marginLeft:"auto" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data=[], height=100, color=C.accent }) {
  if (data.length<2) return null;
  const max = Math.max(...data.map(d=>d.value),1);
  const W=400, H=height;
  const pts = data.map((d,i) => ({ x:i/(data.length-1)*W, y:H-10-(d.value/max)*(H-20) }));
  const path = pts.map((p,i)=>`${i===0?"M":"L"}${p.x} ${p.y}`).join(" ");
  const area = `${path} L${W} ${H} L0 ${H}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height }} preserveAspectRatio="none">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3}/><stop offset="100%" stopColor={color} stopOpacity={0.02}/></linearGradient></defs>
      <path d={area} fill="url(#lg)"/>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill={color}/>)}
      {data.map((d,i)=><text key={i} x={pts[i].x} y={H} textAnchor="middle" fontSize={8} fill={C.textLight}>{d.label}</text>)}
    </svg>
  );
}

export function HorizBar({ data=[], color=C.accent }) {
  const max = Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {data.map((d,i)=>(
        <div key={i}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
            <span style={{ color:C.textMid }}>{d.label}</span>
            <span style={{ fontWeight:700, color:C.text }}>{d.display||d.value}</span>
          </div>
          <div style={{ background:C.border, borderRadius:4, height:7 }}>
            <div style={{ background:d.color||color, borderRadius:4, height:7, width:`${(d.value/max)*100}%`, transition:"width 0.5s" }}/>
          </div>
        </div>
      ))}
    </div>
  );
}
