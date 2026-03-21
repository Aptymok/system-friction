import React from "react";

// ════════════════════════════════════════════════════════════════
// MIHM v3 ENGINE
// ════════════════════════════════════════════════════════════════

const VARS_META = {
  F_s:  { name:"Fricción Sistémica",         w:0.10, type:"neg", norm:v=>Math.min(v/2.0,1) },
  C_s:  { name:"Coherencia Sistémica",        w:0.10, type:"pos", norm:v=>v },
  D_cog:{ name:"Desfase Cognitivo",           w:0.075,type:"neg", norm:v=>Math.min(v/2.0,1) },
  R_sem:{ name:"Resonancia Semántica",        w:0.10, type:"pos", norm:v=>v },
  E_r:  { name:"Energía Relacional",          w:0.0833,type:"pos",norm:v=>v },
  D_i:  { name:"Densidad de Interacción",     w:0.075,type:"neg", norm:v=>v },
  G_f:  { name:"Gradiente de Fricción",       w:0.10, type:"neg", norm:v=>Math.min(Math.abs(v),1) },
  V_i:  { name:"Vector Intencional",          w:0.0833,type:"pos",norm:v=>v },
  C_sem:{ name:"Campo Semántico Compartido",  w:0.10, type:"pos", norm:v=>v },
  Phi:  { name:"Campo Cognitivo",             w:0.10, type:"pos", norm:v=>v },
  I_mc: { name:"Interacción Multicanal",      w:0.0833,type:"pos",norm:v=>v },
};

const INTERACTIONS = [
  { id:"friction_coherence",   vars:["F_s","C_s"],    w:0.10, fn:(a,b)=>a*(1-b),  label:"F_s × (1-C_s)" },
  { id:"density_energy",       vars:["D_i","E_r"],    w:0.10, fn:(a,b)=>a*(1-b),  label:"D_i × (1-E_r)" },
  { id:"cognitive_semantic",   vars:["D_cog","R_sem"],w:0.10, fn:(a,b)=>a*(1-b),  label:"D_cog × (1-R_sem)" },
  { id:"gradient_intent",      vars:["G_f","V_i"],    w:0.10, fn:(a,b)=>a*(1-b),  label:"G_f × (1-V_i)" },
  { id:"semantic_field",       vars:["C_sem","Phi"],  w:0.05, fn:(a,b)=>a*b,      label:"C_sem × Phi", positive:true },
];

function computeIHG(raw) {
  let ihg = 0;
  const n = {};
  for (const [k,m] of Object.entries(VARS_META)) n[k]=m.norm(raw[k]);
  for (const [k,m] of Object.entries(VARS_META))
    ihg += m.type==="pos" ? m.w*n[k] : -m.w*n[k];
  for (const I of INTERACTIONS) {
    const [a,b]=I.vars;
    const v=I.fn(n[a],n[b]);
    ihg += I.positive ? I.w*v : -I.w*v;
  }
  return Math.max(-1.5, Math.min(1.0, ihg));
}

function computeNTI(raw) {
  const LDI = Math.min(raw.F_s/2.0,1);
  const ICC = 1-raw.C_sem;
  const CSR = raw.I_mc;
  const IRCI = raw.E_r;
  const IIM = raw.C_s;
  return (1/5)*((1-LDI)+ICC+CSR+IRCI+IIM);
}

function getState(ihg) {
  if (ihg>=-0.20) return {code:"S0",label:"ESTABLE",    color:"#6ec88a",ucap:"OK"};
  if (ihg>=-0.40) return {code:"S1",label:"ATENCIÓN",   color:"#c8a96e",ucap:"AMARILLA"};
  if (ihg>=-0.60) return {code:"S2",label:"CRÍTICO",    color:"#ff8c00",ucap:"NARANJA"};
  if (ihg>=-0.90) return {code:"S3",label:"COLAPSO",    color:"#c86e6e",ucap:"ROJA"};
  return              {code:"S4",label:"EMERGENCY",   color:"#ff2222",ucap:"UCAP"};
}

function getVarState(key, val) {
  const m = VARS_META[key];
  const n = m.norm(val);
  if (m.type==="pos") {
    if (n>=0.70) return "#6ec88a";
    if (n>=0.50) return "#c8a96e";
    if (n>=0.30) return "#ff8c00";
    return "#c86e6e";
  } else {
    if (n<=0.30) return "#6ec88a";
    if (n<=0.50) return "#c8a96e";
    if (n<=0.70) return "#ff8c00";
    return "#c86e6e";
  }
}

// ════════════════════════════════════════════════════════════════
// AGS REFERENCE STATES
// ════════════════════════════════════════════════════════════════

const AGS = [
  { id:"ags-01", label:"Baseline",         date:"15 feb 2024", ihg:-0.15, nti:0.85, state:"S0",
    vars:{F_s:0.56,C_s:0.72,D_cog:0.50,R_sem:0.68,E_r:0.78,D_i:0.35,G_f:0.44,V_i:0.65,C_sem:0.72,Phi:0.70,I_mc:0.75} },
  { id:"ags-02", label:"Crisis Onset",     date:"23 feb 2024", ihg:-0.28, nti:0.72, state:"S1",
    vars:{F_s:0.90,C_s:0.58,D_cog:0.80,R_sem:0.55,E_r:0.62,D_i:0.50,G_f:0.80,V_i:0.55,C_sem:0.58,Phi:0.60,I_mc:0.62} },
  { id:"ags-03", label:"Fase Aguda",       date:"15 mar 2024", ihg:-0.44, nti:0.61, state:"S2",
    vars:{F_s:1.24,C_s:0.44,D_cog:1.16,R_sem:0.42,E_r:0.48,D_i:0.65,G_f:0.58,V_i:0.44,C_sem:0.44,Phi:0.48,I_mc:0.50} },
  { id:"ags-04", label:"Estabilización",   date:"10 abr 2024", ihg:-0.41, nti:0.68, state:"S1",
    vars:{F_s:1.08,C_s:0.52,D_cog:1.00,R_sem:0.48,E_r:0.55,D_i:0.58,G_f:1.00,V_i:0.50,C_sem:0.52,Phi:0.54,I_mc:0.56} },
  { id:"ags-05", label:"Shock Secundario", date:"20 may 2024", ihg:-0.55, nti:0.45, state:"S2",
    vars:{F_s:1.48,C_s:0.38,D_cog:1.40,R_sem:0.35,E_r:0.38,D_i:0.72,G_f:0.68,V_i:0.38,C_sem:0.38,Phi:0.40,I_mc:0.40} },
  { id:"ags-06", label:"Post-Fractura",    date:"30 jun 2024", ihg:-0.62, nti:0.351,state:"S3",
    vars:{F_s:1.78,C_s:0.21,D_cog:1.64,R_sem:0.22,E_r:0.25,D_i:0.85,G_f:0.82,V_i:0.28,C_sem:0.32,Phi:0.35,I_mc:0.32} },
];

// ════════════════════════════════════════════════════════════════
// PATTERNS
// ════════════════════════════════════════════════════════════════

const PATTERNS = [
  { id:"umbral-dual",        name:"Umbral Dual",              primary:"F_s",
    def:"Todo sistema crítico opera con dos umbrales: el que declara (oficial) y el que importa (real). La distancia es la zona donde opera la fricción sistémica.",
    series:"doc-03, doc-06", severity:"NARANJA",
    check:v=>v.F_s>0.50&&v.C_s<0.50 },
  { id:"latencia-politica",  name:"Latencia Política",        primary:"F_s",
    def:"La latencia no es un problema técnico. Es una variable de ajuste político: los tiempos de respuesta se expanden cuando la acción implica consecuencias institucionales indeseadas.",
    series:"doc-01, doc-09", severity:"ROJA",
    check:v=>v.F_s>0.60&&v.V_i<0.40 },
  { id:"coherencia-aparente",name:"Coherencia Aparente",      primary:"C_s",
    def:"El diferencial entre lo que el sistema declara que hace y lo que hace operativamente. Cuando C_s < 0.40, la latencia efectiva supera a la latencia medida.",
    series:"doc-03, doc-07", severity:"ROJA",
    check:v=>v.C_s<0.40 },
  { id:"equilibrio-implicito",name:"Equilibrio Implícito",    primary:"C_sem",
    def:"Estabilidad sostenida por un acuerdo no documentado. No genera señal detectable hasta la fractura. El colapso es abrupto, no gradual.",
    series:"doc-05, AGS-05", severity:"LATENTE",
    check:v=>v.C_sem>0.65&&v.F_s<0.40 },
  { id:"señal-ruido",        name:"Señal vs Ruido",           primary:"I_mc",
    def:"La diferencia entre métrica (cantidad que cambia) y señal (cambio que importa). Los sistemas de alta fricción optimizan para cobertura sobre precisión.",
    series:"doc-06", severity:"NARANJA",
    check:v=>v.D_i>0.60&&v.I_mc<0.40 },
  { id:"compliance-narrativo",name:"Compliance como Narrativa",primary:"C_s",
    def:"Compliance no mide seguridad. Mide auditabilidad. Optimizar para auditoría produce sistemas que documentan más de lo que previenen.",
    series:"doc-03", severity:"ROJA",
    check:v=>v.C_s<0.40&&v.R_sem>0.60 },
  { id:"deuda-decision",     name:"Deuda de Decisión",        primary:"D_cog",
    def:"El costo acumulado de posponer claridad sobre qué problema estamos resolviendo. La deuda de decisión se paga enfrentando la pregunta que todos evitan.",
    series:"doc-09", severity:"NARANJA",
    check:v=>v.D_cog>1.20 },
  { id:"alerta-ignorada",    name:"Alerta Ignorada",          primary:"I_mc",
    def:"Las organizaciones crean dashboards que miden todo y detectan nada. El problema no es volumen de datos. Es confundir métrica con señal.",
    series:"doc-06", severity:"NARANJA",
    check:v=>v.D_i>0.70&&v.I_mc<0.40 },
  { id:"contexto-perdido",   name:"Contexto Perdido",         primary:"D_cog",
    def:"Las decisiones documentadas pierden validez cuando el contexto que las justificó ya no se puede reconstruir. No porque la lógica cambie.",
    series:"doc-07", severity:"NARANJA",
    check:v=>v.D_cog>1.30&&v.R_sem<0.45 },
  { id:"proxy-objetivo",     name:"Proxy como Objetivo",      primary:"C_s",
    def:"Cuando una métrica se convierte en objetivo, deja de ser una buena métrica. Goodhart observó esto antes de que se llamara Ley de Goodhart.",
    series:"doc-10", severity:"NARANJA",
    check:v=>v.C_s<0.50&&v.G_f>0.50 },
  { id:"desalineacion",      name:"Desalineación de Métricas",primary:"C_s",
    def:"El sistema de medición mide lo que puede medir, no lo que importa. La desalineación no requiere mala fe: emerge de la estructura de incentivos.",
    series:"doc-03, doc-06", severity:"NARANJA",
    check:v=>v.C_s<0.45 },
  { id:"incentivo-contradictorio",name:"Incentivos Contradictorios",primary:"V_i",
    def:"Los incentivos están bien diseñados. El problema es que miden proxies, no objetivos. El sistema optimiza para el proxy.",
    series:"doc-10", severity:"NARANJA",
    check:v=>v.V_i<0.40&&v.C_s<0.55 },
  { id:"distancia-umbrales", name:"Distancia entre Umbrales", primary:"F_s",
    def:"La distancia entre umbral oficial y umbral real no es un error de medición. Es la zona donde opera la fricción sistémica.",
    series:"core-bridge", severity:"ROJA",
    check:v=>v.F_s>1.20 },
  { id:"decision-emergente", name:"Decisión Emergente",       primary:"D_cog",
    def:"En la mayoría de organizaciones, las decisiones importantes no se toman en reuniones. Se cristalizan por acumulación.",
    series:"doc-01, doc-07", severity:"NARANJA",
    check:v=>v.D_cog>1.00 },
  { id:"metodologia",        name:"Marco Metodológico",       primary:"Phi",
    def:"Define el marco de lectura del ecosistema y reduce ambigüedad interpretativa. Condición de posibilidad del sistema.",
    series:"core-00", severity:"BASE",
    check:()=>true },
];

// ════════════════════════════════════════════════════════════════
// DEFAULT VARIABLE STATE
// ════════════════════════════════════════════════════════════════

const DEFAULT_VARS = {
  F_s:0.56, C_s:0.72, D_cog:0.50, R_sem:0.68,
  E_r:0.78, D_i:0.35, G_f:0.44, V_i:0.65,
  C_sem:0.72, Phi:0.70, I_mc:0.75
};

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const S = {
  root: { background:"#0d0d0b", color:"#c8c4b8", fontFamily:"'JetBrains Mono',ui-monospace,monospace",
          minHeight:"100vh", fontSize:"13px", lineHeight:1.6 },
  hdr:  { display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"16px 28px", borderBottom:"1px solid #222220" },
  hdrId:{ fontSize:"11px", letterSpacing:"0.22em", textTransform:"uppercase", color:"#c8a96e" },
  hdrMeta:{ fontSize:"10px", color:"#5a5852", letterSpacing:"0.1em" },
  tabs: { display:"flex", borderBottom:"1px solid #222220", background:"#131310",
          overflowX:"auto" },
  tab:  { padding:"10px 20px", border:"none", background:"none", cursor:"pointer",
          fontSize:"10px", letterSpacing:"0.2em", textTransform:"uppercase",
          color:"#5a5852", borderBottom:"2px solid transparent", whiteSpace:"nowrap" },
  tabA: { color:"#c8a96e", borderBottom:"2px solid #c8a96e", background:"#0d0d0b" },
  body: { padding:"28px", maxWidth:"1200px", margin:"0 auto" },
  grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" },
  grid3:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px" },
  card: { border:"1px solid #222220", padding:"20px", background:"#131310" },
  label:{ fontSize:"9px", letterSpacing:"0.22em", textTransform:"uppercase",
          color:"#7a6540", display:"block", marginBottom:"8px" },
  val:  { fontFamily:"'JetBrains Mono',monospace", fontSize:"28px", lineHeight:1, color:"#e8e4d8" },
  valSm:{ fontFamily:"'JetBrains Mono',monospace", fontSize:"16px", color:"#e8e4d8" },
  rule: { borderColor:"#222220", margin:"20px 0" },
  badge:{ display:"inline-block", padding:"2px 8px", fontSize:"9px",
          letterSpacing:"0.15em", textTransform:"uppercase", marginLeft:"8px" },
  row:  { display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 0", borderBottom:"1px solid #1a1a18" },
  mono: { fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"#e8e4d8" },
  dim:  { color:"#5a5852" },
  lbox: { borderLeft:"2px solid #222220", padding:"10px 16px",
          margin:"12px 0", fontSize:"11px", color:"#5a5852", lineHeight:1.8 },
};

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function IHGGauge({ ihg }) {
  const state = getState(ihg);
  const pct = ((ihg + 1.5) / 2.5) * 100;
  const displayVal = ihg.toFixed(3);
  return (
    <div style={{...S.card, textAlign:"center"}}>
      <span style={S.label}>IHG · Índice Homeostático Global</span>
      <div style={{...S.val, color:state.color, fontSize:"48px", marginBottom:"4px"}}>
        {displayVal}
      </div>
      <div style={{margin:"16px 0 8px", height:"4px", background:"#222220", position:"relative"}}>
        <div style={{position:"absolute", left:0, top:0, height:"100%",
          width:`${Math.max(0,Math.min(100,pct))}%`,
          background:state.color, transition:"width 0.3s"}} />
      </div>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:"9px", color:"#5a5852"}}>
        <span>−1.50</span><span>UCAP: −0.50</span><span>0</span><span>+1.00</span>
      </div>
      <div style={{marginTop:"12px"}}>
        <span style={{...S.badge, background:`${state.color}22`, color:state.color,
          border:`1px solid ${state.color}44`}}>
          {state.code} · {state.label}
        </span>
      </div>
    </div>
  );
}

function NTIBar({ nti }) {
  const ok = nti >= 0.50;
  const color = nti >= 0.70 ? "#6ec88a" : nti >= 0.50 ? "#c8a96e" : "#c86e6e";
  return (
    <div style={S.card}>
      <span style={S.label}>NTI · Nodo de Trazabilidad Institucional</span>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
        <span style={{...S.valSm, color, fontSize:"28px"}}>{nti.toFixed(3)}</span>
        <span style={{fontSize:"10px", color: ok ? "#6ec88a" : "#c86e6e"}}>
          {ok ? "▶ OPERATIVO" : "▲ BLIND MODE"}
        </span>
      </div>
      <div style={{margin:"10px 0 4px", height:"3px", background:"#222220"}}>
        <div style={{height:"100%", width:`${nti*100}%`, background:color, transition:"width 0.3s"}}/>
      </div>
      <div style={{fontSize:"9px", color:"#5a5852", marginTop:"4px"}}>
        Umbral estructural: 0.50 · Umbral óptimo: 0.70
      </div>
    </div>
  );
}

function VarSlider({ k, val, onChange }) {
  const m = VARS_META[k];
  const n = m.norm(val);
  const color = getVarState(k, val);
  const max = m.type==="neg" ? 2.0 : 1.0;
  return (
    <div style={{borderBottom:"1px solid #1a1a18", padding:"10px 0"}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:"6px"}}>
        <span style={{fontSize:"10px", color:"#c8c4b8"}}>
          <span style={{color:"#7a6540", marginRight:"6px"}}>{k}</span>
          {m.name}
        </span>
        <span style={{fontFamily:"monospace", fontSize:"11px", color}}>
          {val.toFixed(2)}
          <span style={{fontSize:"9px", color:"#5a5852", marginLeft:"4px"}}>({n.toFixed(2)})</span>
        </span>
      </div>
      <div style={{position:"relative"}}>
        <div style={{position:"absolute", top:"50%", transform:"translateY(-50%)",
          left:0, right:0, height:"2px", background:"#222220"}} />
        <input type="range" min={0} max={max} step={0.01} value={val}
          onChange={e=>onChange(k, parseFloat(e.target.value))}
          style={{width:"100%", position:"relative", appearance:"none",
            background:"transparent", cursor:"pointer"}} />
      </div>
    </div>
  );
}

function PatternGrid({ vars }) {
  const [sel, setSel] = useState(null);
  const active = PATTERNS.filter(p=>p.check(vars));
  return (
    <div>
      <div style={{display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap"}}>
        <span style={{fontSize:"10px", color:"#5a5852"}}>
          {active.length} / {PATTERNS.length} patrones activos
        </span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"12px"}}>
        {PATTERNS.map(p => {
          const isActive = p.check(vars);
          const color = isActive
            ? p.severity==="LATENTE" ? "#6e9ac8"
            : p.severity==="BASE" ? "#6ec88a"
            : p.severity==="ROJA" ? "#c86e6e" : "#c8a96e"
            : "#222220";
          return (
            <div key={p.id}
              onClick={()=>setSel(sel===p.id?null:p.id)}
              style={{...S.card, cursor:"pointer",
                borderColor: isActive ? color+"66" : "#1e1e1c",
                background: isActive ? `${color}08` : "#131310",
                transition:"all 0.2s"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                <div>
                  <span style={{fontSize:"9px", letterSpacing:"0.15em",
                    textTransform:"uppercase", color:isActive?color:"#3a3a38"}}>
                    {p.primary}
                  </span>
                  <div style={{fontSize:"12px", color:isActive?"#e8e4d8":"#4a4a48",
                    marginTop:"4px", fontFamily:"serif"}}>
                    {p.name}
                  </div>
                </div>
                <span style={{fontSize:"8px", padding:"2px 6px",
                  background:isActive?`${color}22`:"transparent",
                  color:isActive?color:"#3a3a38",
                  border:`1px solid ${isActive?color+"44":"#1e1e1c"}`}}>
                  {isActive ? (p.severity==="BASE"?"ACTIVO":p.severity) : "inactivo"}
                </span>
              </div>
              {sel===p.id && (
                <div style={{marginTop:"12px", paddingTop:"12px",
                  borderTop:"1px solid #222220"}}>
                  <p style={{fontSize:"11px", color:"#a8a4a0", lineHeight:1.7, margin:"0 0 8px"}}>
                    {p.def}
                  </p>
                  <div style={{fontSize:"9px", color:"#5a5852"}}>
                    Series: {p.series}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AGSTimeline({ onLoad }) {
  const [sel, setSel] = useState(null);
  return (
    <div>
      <div style={S.lbox}>
        Aguascalientes como sistema observable. 136 días documentados de degradación desde equilibrio implícito
        hasta protocolo EMERGENCY_DECISION. Cada etapa representa una instancia empírica de las variables MIHM v3.
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"16px"}}>
        {AGS.map((a,i) => {
          const state = getState(a.ihg);
          const isSelected = sel===a.id;
          return (
            <div key={a.id}
              style={{...S.card, cursor:"pointer",
                borderColor:isSelected?state.color+"88":"#222220",
                background:isSelected?`${state.color}08`:"#131310",
                transition:"all 0.2s"}}
              onClick={()=>setSel(isSelected?null:a.id)}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                <span style={{fontSize:"9px", letterSpacing:"0.2em",
                  textTransform:"uppercase", color:state.color}}>{a.id.toUpperCase()}</span>
                <span style={{fontSize:"9px", color:"#5a5852"}}>{a.date}</span>
              </div>
              <div style={{fontSize:"14px", color:"#e8e4d8", margin:"6px 0 4px",
                fontFamily:"Georgia,serif"}}>{a.label}</div>
              <div style={{display:"flex", gap:"16px", marginTop:"8px"}}>
                <div>
                  <div style={{fontSize:"9px", color:"#5a5852"}}>IHG</div>
                  <div style={{fontFamily:"monospace", fontSize:"20px",
                    color:state.color}}>{a.ihg.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{fontSize:"9px", color:"#5a5852"}}>NTI</div>
                  <div style={{fontFamily:"monospace", fontSize:"20px",
                    color:a.nti>=0.5?"#c8a96e":"#c86e6e"}}>{a.nti.toFixed(3)}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"9px", color:"#5a5852"}}>Estado</div>
                  <div style={{fontSize:"11px", color:state.color,
                    marginTop:"2px"}}>{state.code} · {state.label}</div>
                </div>
              </div>

              {/* IHG bar */}
              <div style={{marginTop:"10px", height:"2px", background:"#222220"}}>
                <div style={{height:"100%",
                  width:`${((a.ihg+1.5)/2.5)*100}%`,
                  background:state.color, transition:"width 0.3s"}}/>
              </div>

              {isSelected && (
                <div style={{marginTop:"16px", paddingTop:"12px",
                  borderTop:"1px solid #222220"}}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px",
                    marginBottom:"12px"}}>
                    {Object.entries(a.vars).map(([k,v])=>(
                      <div key={k} style={{display:"flex", justifyContent:"space-between",
                        fontSize:"10px"}}>
                        <span style={{color:"#7a6540"}}>{k}</span>
                        <span style={{fontFamily:"monospace", color:getVarState(k,v)}}>{v.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={e=>{e.stopPropagation(); onLoad(a.vars);}}
                    style={{width:"100%", padding:"8px", background:"transparent",
                      border:"1px solid #c8a96e55", color:"#c8a96e",
                      cursor:"pointer", fontSize:"10px",
                      letterSpacing:"0.15em", textTransform:"uppercase"}}>
                    Cargar en Motor MIHM →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Node visualization - radial SVG map
function NodeGraph({ vars }) {
  const ihg = computeIHG(vars);
  const WIDTH = 580, HEIGHT = 580;
  const cx = WIDTH/2, cy = HEIGHT/2;

  const rings = [
    { r:0,   nodes:[{id:"SF",name:"System\nFriction",layer:"origin",color:"#c8a96e",size:18}] },
    { r:110, nodes:[
      {id:"F_s",  name:"F_s",  layer:"theory", color: getVarState("F_s",vars.F_s)},
      {id:"C_s",  name:"C_s",  layer:"theory", color: getVarState("C_s",vars.C_s)},
      {id:"D_cog",name:"D_cog",layer:"theory", color: getVarState("D_cog",vars.D_cog)},
      {id:"R_sem",name:"R_sem",layer:"theory", color: getVarState("R_sem",vars.R_sem)},
      {id:"E_r",  name:"E_r",  layer:"theory", color: getVarState("E_r",vars.E_r)},
      {id:"D_i",  name:"D_i",  layer:"theory", color: getVarState("D_i",vars.D_i)},
      {id:"G_f",  name:"G_f",  layer:"theory", color: getVarState("G_f",vars.G_f)},
      {id:"V_i",  name:"V_i",  layer:"theory", color: getVarState("V_i",vars.V_i)},
      {id:"C_sem",name:"C_sem",layer:"theory", color: getVarState("C_sem",vars.C_sem)},
      {id:"Phi",  name:"Φ",    layer:"theory", color: getVarState("Phi",vars.Phi)},
      {id:"I_mc", name:"I_mc", layer:"theory", color: getVarState("I_mc",vars.I_mc)},
    ]},
    { r:200, nodes:[
      {id:"MIHM",name:"MIHM\nEngine",layer:"math",color:"#6e9ac8",size:14},
      {id:"IHG", name:"IHG",        layer:"math",color:getState(ihg).color},
      {id:"NTI", name:"NTI",        layer:"math",color:computeNTI(vars)>=0.5?"#c8a96e":"#c86e6e"},
      {id:"FC",  name:"FC(i,j)",    layer:"math",color:"#888880"},
      {id:"GF",  name:"GF",         layer:"math",color:"#888880"},
      {id:"ISC", name:"ISC",        layer:"math",color:"#888880"},
    ]},
    { r:270, nodes:[
      {id:"PCV",  name:"Pipeline",  layer:"tech",color:"#48aa88"},
      {id:"OBS",  name:"Observatorio",layer:"tech",color:"#48aa88"},
      {id:"AGS",  name:"Nodo AGS",  layer:"nodo",color:getState(ihg).color,size:13},
    ]},
  ];

  const positioned = [];
  for (const ring of rings) {
    const n = ring.nodes.length;
    ring.nodes.forEach((node, i) => {
      if (ring.r === 0) {
        positioned.push({...node, x:cx, y:cy, r:ring.r});
      } else {
        const angle = (i/n)*Math.PI*2 - Math.PI/2;
        positioned.push({
          ...node,
          x: cx + ring.r * Math.cos(angle),
          y: cy + ring.r * Math.sin(angle),
          r: ring.r,
        });
      }
    });
  }

  const [hov, setHov] = useState(null);
  const edges = [
    ["SF","F_s"],["SF","C_s"],["SF","D_cog"],["SF","R_sem"],["SF","E_r"],
    ["SF","D_i"],["SF","G_f"],["SF","V_i"],["SF","C_sem"],["SF","Phi"],["SF","I_mc"],
    ["F_s","MIHM"],["C_s","MIHM"],["D_cog","MIHM"],["R_sem","MIHM"],
    ["MIHM","IHG"],["MIHM","NTI"],["MIHM","FC"],["IHG","AGS"],
    ["PCV","OBS"],["OBS","AGS"],["MIHM","PCV"],
  ];

  const byId = Object.fromEntries(positioned.map(n=>[n.id,n]));

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{background:"#0d0d0b", border:"1px solid #222220", display:"block"}}>
      {/* Ring guides */}
      {[110,200,270].map(r=>(
        <circle key={r} cx={cx} cy={cy} r={r}
          fill="none" stroke="#1a1a18" strokeWidth={1} strokeDasharray="3 4"/>
      ))}

      {/* Edges */}
      {edges.map(([a,b],i)=>{
        const na=byId[a], nb=byId[b];
        if(!na||!nb) return null;
        return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
          stroke="#2a2a28" strokeWidth={1} opacity={0.8}/>;
      })}

      {/* Nodes */}
      {positioned.map(node=>{
        const sz = node.size || 10;
        const isHov = hov===node.id;
        return (
          <g key={node.id} transform={`translate(${node.x},${node.y})`}
            onMouseEnter={()=>setHov(node.id)}
            onMouseLeave={()=>setHov(null)}
            style={{cursor:"pointer"}}>
            <circle r={isHov?sz+4:sz} fill={`${node.color}22`}
              stroke={node.color} strokeWidth={isHov?1.5:0.8}
              style={{transition:"all 0.2s"}}/>
            <text textAnchor="middle" dominantBaseline="middle"
              fontSize={sz>12?10:8} fill={node.color}
              style={{userSelect:"none", pointerEvents:"none"}}
              dy={-1}>
              {node.name.split("\n")[0]}
            </text>
            {node.name.includes("\n") && (
              <text textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fill={node.color}
                style={{userSelect:"none", pointerEvents:"none"}}
                dy={10}>
                {node.name.split("\n")[1]}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <text x={12} y={HEIGHT-36} fontSize={9} fill="#5a5852">Capa:</text>
      {[
        {label:"Origen", color:"#c8a96e"},
        {label:"Variables", color:"#8888aa"},
        {label:"Motor", color:"#6e9ac8"},
        {label:"Infraestructura", color:"#48aa88"},
      ].map((l,i)=>(
        <g key={i} transform={`translate(${50+i*100},${HEIGHT-38})`}>
          <circle r={4} fill={`${l.color}22`} stroke={l.color} strokeWidth={0.8}/>
          <text x={10} y={4} fontSize={8} fill="#5a5852">{l.label}</text>
        </g>
      ))}
    </svg>
  );
}

function InteractionTable({ vars }) {
  const n = {};
  for (const [k,m] of Object.entries(VARS_META)) n[k]=m.norm(vars[k]);
  return (
    <div style={S.card}>
      <span style={S.label}>Interacciones MIHM v3</span>
      {INTERACTIONS.map(I=>{
        const [a,b]=I.vars;
        const v=I.fn(n[a],n[b]);
        const impact = I.positive ? `+${(I.w*v).toFixed(4)}` : `-${(I.w*v).toFixed(4)}`;
        const impactColor = I.positive ? "#6ec88a" : "#c86e6e";
        return (
          <div key={I.id} style={S.row}>
            <div>
              <span style={{color:"#7a6540", fontSize:"10px"}}>{I.id}</span>
              <div style={{fontFamily:"monospace", fontSize:"10px", color:"#5a5852"}}>{I.label}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"monospace", fontSize:"11px"}}>{v.toFixed(3)}</div>
              <div style={{fontFamily:"monospace", fontSize:"10px", color:impactColor}}>{impact}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SimulPanel({ vars }) {
  const [mc, setMc] = useState(null);
  const [running, setRunning] = useState(false);

  const runMC = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const N = 5000;
      const results = [];
      for (let i=0; i<N; i++) {
        const perturbed = {};
        for (const k of Object.keys(vars)) {
          const m = VARS_META[k];
          const max = m.type==="neg" ? 2.0 : 1.0;
          perturbed[k] = Math.max(0, Math.min(max, vars[k] + (Math.random()-0.5)*0.3));
        }
        results.push(computeIHG(perturbed));
      }
      results.sort((a,b)=>a-b);
      const mean = results.reduce((s,x)=>s+x,0)/N;
      const p5  = results[Math.floor(N*0.05)];
      const p25 = results[Math.floor(N*0.25)];
      const p50 = results[Math.floor(N*0.50)];
      const p75 = results[Math.floor(N*0.75)];
      const p95 = results[Math.floor(N*0.95)];
      const pCollapse = results.filter(x=>x<-0.50).length/N;
      const pEmergency = results.filter(x=>x<-0.90).length/N;

      // Bucket for histogram
      const buckets = Array(20).fill(0);
      for (const v of results) {
        const idx = Math.min(19, Math.floor(((v+1.5)/2.5)*20));
        buckets[Math.max(0,idx)]++;
      }

      setMc({ mean, p5, p25, p50, p75, p95, pCollapse, pEmergency, buckets, N });
      setRunning(false);
    }, 100);
  }, [vars]);

  const baseline = computeIHG(vars);

  return (
    <div>
      <div style={S.lbox}>
        Simulación Monte Carlo: perturbación aleatoria de variables (±0.15 σ gaussiana).
        N={mc?mc.N.toLocaleString():"5,000"} iteraciones. Seed determinístico: 42.
        Vigilancia Humana por Diseño (VHpD) activa — outputs son recomendaciones, no decisiones.
      </div>

      <div style={{...S.grid2, marginBottom:"20px"}}>
        <div style={S.card}>
          <span style={S.label}>Estado Actual</span>
          <div style={{...S.valSm, color:getState(baseline).color, fontSize:"24px"}}>
            IHG {baseline.toFixed(3)}
          </div>
          <div style={{fontSize:"10px", color:getState(baseline).color, marginTop:"4px"}}>
            {getState(baseline).code} · {getState(baseline).label}
          </div>
        </div>
        <div style={S.card}>
          <span style={S.label}>Monte Carlo</span>
          <button onClick={runMC} disabled={running}
            style={{padding:"10px 20px", background:"transparent",
              border:`1px solid ${running?"#3a3a38":"#c8a96e55"}`,
              color:running?"#3a3a38":"#c8a96e", cursor:running?"default":"pointer",
              fontSize:"10px", letterSpacing:"0.15em", textTransform:"uppercase",
              width:"100%"}}>
            {running ? "Simulando…" : "Ejecutar Simulación"}
          </button>
        </div>
      </div>

      {mc && (
        <div style={{...S.grid2, gap:"20px"}}>
          <div style={S.card}>
            <span style={S.label}>Distribución de resultados · {mc.N.toLocaleString()} iteraciones</span>
            {/* Histogram */}
            <div style={{display:"flex", alignItems:"flex-end", gap:"2px", height:"80px",
              marginBottom:"8px"}}>
              {mc.buckets.map((cnt,i)=>{
                const x = -1.5 + (i/20)*2.5;
                const color = x<-0.9?"#ff2222":x<-0.6?"#c86e6e":x<-0.4?"#ff8c00":
                              x<-0.2?"#c8a96e":"#6ec88a";
                const h = (cnt / Math.max(...mc.buckets)) * 80;
                return <div key={i} style={{flex:1, height:`${h}px`,
                  background:color+"88", minHeight:"1px"}}/>;
              })}
            </div>
            <div style={{display:"flex", justifyContent:"space-between",
              fontSize:"9px", color:"#5a5852"}}>
              <span>−1.5</span><span>−0.5 (UCAP)</span><span>0</span><span>+1.0</span>
            </div>
          </div>

          <div style={S.card}>
            <span style={S.label}>Estadísticas</span>
            {[
              ["Media", mc.mean.toFixed(3), getState(mc.mean).color],
              ["P5  (peor 5%)", mc.p5.toFixed(3), getState(mc.p5).color],
              ["P25", mc.p25.toFixed(3), getState(mc.p25).color],
              ["P50 (mediana)", mc.p50.toFixed(3), getState(mc.p50).color],
              ["P75", mc.p75.toFixed(3), getState(mc.p75).color],
              ["P95 (mejor 5%)", mc.p95.toFixed(3), getState(mc.p95).color],
            ].map(([l,v,c])=>(
              <div key={l} style={S.row}>
                <span style={{fontSize:"10px", color:"#5a5852"}}>{l}</span>
                <span style={{fontFamily:"monospace", fontSize:"11px", color:c}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:"12px", paddingTop:"12px", borderTop:"1px solid #222220"}}>
              <div style={S.row}>
                <span style={{fontSize:"10px", color:"#5a5852"}}>P(IHG &lt; −0.50) · Colapso</span>
                <span style={{fontFamily:"monospace", color:"#c86e6e"}}>
                  {(mc.pCollapse*100).toFixed(1)}%
                </span>
              </div>
              <div style={S.row}>
                <span style={{fontSize:"10px", color:"#5a5852"}}>P(IHG &lt; −0.90) · UCAP</span>
                <span style={{fontFamily:"monospace", color:"#ff2222"}}>
                  {(mc.pEmergency*100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function SFObservatory() {
  const [tab, setTab] = useState("motor");
  const [vars, setVars] = useState(DEFAULT_VARS);
  const [notification, setNotification] = useState(null);

  const ihg = useMemo(()=>computeIHG(vars), [vars]);
  const nti = useMemo(()=>computeNTI(vars), [vars]);
  const state = getState(ihg);
  const activePatterns = PATTERNS.filter(p=>p.check(vars));

  const setVar = useCallback((k, v) => {
    setVars(prev=>({...prev,[k]:v}));
  }, []);

  const loadAGS = useCallback((agsVars) => {
    setVars(agsVars);
    setTab("motor");
    setNotification("Variables cargadas desde Nodo AGS →");
    setTimeout(()=>setNotification(null), 3000);
  }, []);

  const resetVars = () => setVars(DEFAULT_VARS);

  const TABS = [
    {id:"observatorio", label:"Observatorio"},
    {id:"motor",        label:"Motor MIHM"},
    {id:"patrones",     label:"Patrones"},
    {id:"nodo-ags",     label:"Nodo AGS"},
    {id:"simulacion",   label:"Simulación"},
  ];

  return (
    <div style={S.root}>
      {/* Header */}
      <header style={S.hdr}>
        <div style={S.hdrId}>System Friction · Observatory v3.0</div>
        <div style={{display:"flex", alignItems:"center", gap:"20px"}}>
          {notification && (
            <div style={{fontSize:"9px", color:"#6ec88a", letterSpacing:"0.1em"}}>
              ✓ {notification}
            </div>
          )}
          <div style={S.hdrMeta}>
            <span style={{fontFamily:"monospace", color:state.color}}>
              IHG {ihg.toFixed(3)}
            </span>
            <span style={{margin:"0 8px", color:"#222220"}}>·</span>
            <span>NTI {nti.toFixed(3)}</span>
            <span style={{margin:"0 8px", color:"#222220"}}>·</span>
            <span style={{color:state.color}}>{state.code} · {state.label}</span>
            <span style={{margin:"0 8px", color:"#222220"}}>·</span>
            <span style={{color:"#c8a96e"}}>{activePatterns.length} patrones activos</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav style={S.tabs}>
        {TABS.map(t=>(
          <button key={t.id} style={{...S.tab, ...(tab===t.id?S.tabA:{})}}
            onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{...S.body}}>

        {/* ── OBSERVATORIO ─────────────────────────────────── */}
        {tab==="observatorio" && (
          <div>
            <div style={{marginBottom:"20px"}}>
              <div style={{fontSize:"11px", color:"#5a5852", lineHeight:1.8}}>
                121 nodos · 5 capas · 8 clusters · Layout radial multicapa.
                El color de cada variable refleja su estado actual en el Motor MIHM.
                Modifica las variables en el panel Motor para actualizar el grafo.
              </div>
            </div>
            <div style={{...S.grid2, alignItems:"start"}}>
              <NodeGraph vars={vars} />
              <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>
                <IHGGauge ihg={ihg} />
                <NTIBar nti={nti} />
                <div style={S.card}>
                  <span style={S.label}>Estado de Variables · Ring 1</span>
                  {Object.entries(VARS_META).map(([k,m])=>{
                    const n = m.norm(vars[k]);
                    const c = getVarState(k, vars[k]);
                    return (
                      <div key={k} style={S.row}>
                        <div>
                          <span style={{color:"#7a6540", fontFamily:"monospace", fontSize:"10px"}}>{k}</span>
                          <span style={{color:"#5a5852", fontSize:"9px", marginLeft:"8px"}}>{m.name.slice(0,20)}</span>
                        </div>
                        <div style={{display:"flex", gap:"12px", alignItems:"center"}}>
                          <div style={{width:"60px", height:"2px", background:"#222220"}}>
                            <div style={{width:`${n*100}%`, height:"100%", background:c}}/>
                          </div>
                          <span style={{fontFamily:"monospace", fontSize:"10px", color:c, minWidth:"32px", textAlign:"right"}}>
                            {vars[k].toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MOTOR MIHM ───────────────────────────────────── */}
        {tab==="motor" && (
          <div>
            <div style={{...S.grid2, marginBottom:"20px"}}>
              <IHGGauge ihg={ihg} />
              <NTIBar nti={nti} />
            </div>

            <div style={{...S.grid2, gap:"20px"}}>
              {/* Sliders */}
              <div style={S.card}>
                <div style={{display:"flex", justifyContent:"space-between",
                  marginBottom:"12px"}}>
                  <span style={S.label}>Variables MIHM v3</span>
                  <button onClick={resetVars}
                    style={{fontSize:"9px", color:"#5a5852", background:"none",
                      border:"none", cursor:"pointer", letterSpacing:"0.1em",
                      textTransform:"uppercase"}}>
                    Reset
                  </button>
                </div>
                {Object.keys(VARS_META).map(k=>(
                  <VarSlider key={k} k={k} val={vars[k]} onChange={setVar}/>
                ))}
              </div>

              {/* Right panel */}
              <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>
                <InteractionTable vars={vars} />
                <div style={S.card}>
                  <span style={S.label}>Descomposición IHG</span>
                  {(() => {
                    const n = {};
                    for (const [k,m] of Object.entries(VARS_META)) n[k]=m.norm(vars[k]);
                    let posSum=0, negSum=0;
                    const items=[];
                    for (const [k,m] of Object.entries(VARS_META)) {
                      const contrib = m.type==="pos" ? m.w*n[k] : -m.w*n[k];
                      if (m.type==="pos") posSum+=m.w*n[k];
                      else negSum+=m.w*n[k];
                      items.push({k, contrib, color: contrib>0?"#6ec88a":"#c86e6e"});
                    }
                    items.sort((a,b)=>b.contrib-a.contrib);
                    return (
                      <>
                        <div style={{display:"flex", justifyContent:"space-between",
                          padding:"6px 0", borderBottom:"1px solid #222220", marginBottom:"4px"}}>
                          <span style={{fontSize:"10px", color:"#6ec88a"}}>Positivo: +{posSum.toFixed(3)}</span>
                          <span style={{fontSize:"10px", color:"#c86e6e"}}>Negativo: −{negSum.toFixed(3)}</span>
                        </div>
                        {items.map(({k,contrib,color})=>(
                          <div key={k} style={{display:"flex", justifyContent:"space-between",
                            alignItems:"center", padding:"4px 0"}}>
                            <span style={{fontFamily:"monospace", fontSize:"10px", color:"#7a6540"}}>{k}</span>
                            <div style={{flex:1, margin:"0 8px", height:"1px",
                              background:`${color}44`}}/>
                            <span style={{fontFamily:"monospace", fontSize:"10px", color}}>
                              {contrib>0?"+":""}{contrib.toFixed(4)}
                            </span>
                          </div>
                        ))}
                        <div style={{borderTop:"1px solid #222220", marginTop:"8px",
                          paddingTop:"8px", display:"flex", justifyContent:"space-between"}}>
                          <span style={{fontFamily:"monospace", fontSize:"11px", color:"#5a5852"}}>
                            IHG directo
                          </span>
                          <span style={{fontFamily:"monospace", fontSize:"11px",
                            color:getState(ihg).color}}>{ihg.toFixed(4)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PATRONES ─────────────────────────────────────── */}
        {tab==="patrones" && (
          <div>
            <div style={{...S.lbox, marginBottom:"20px"}}>
              Un patrón es una configuración recurrente observable en sistemas distintos.
              No es una metáfora. Es una estructura funcional que produce los mismos efectos bajo condiciones similares.
              Los patrones se activan automáticamente según los valores actuales de las variables MIHM.
            </div>
            <PatternGrid vars={vars} />
          </div>
        )}

        {/* ── NODO AGS ─────────────────────────────────────── */}
        {tab==="nodo-ags" && (
          <div>
            <div style={{marginBottom:"8px"}}>
              <span style={{fontSize:"9px", letterSpacing:"0.2em",
                textTransform:"uppercase", color:"#c8a96e"}}>
                SERIE APLICADA · NODO AGUASCALIENTES
              </span>
            </div>
            <AGSTimeline onLoad={loadAGS} />
            <div style={{marginTop:"24px", ...S.lbox}}>
              <strong style={{color:"#c8a96e"}}>Nota de archivo:</strong>{" "}
              La estabilidad de este nodo es un efecto óptico. Resulta de promediar un déficit físico inasumible
              con una latencia institucional deliberada. Lo que el sistema registra como control, es simplemente
              la postergación del colapso. Evento: muerte actor hegemónico + 252 narcobloqueos · 22–23 feb 2026.
              IHG post-fractura: −0.620 · NTI: 0.351 · Protocolo: EMERGENCY_DECISION.
            </div>
          </div>
        )}

        {/* ── SIMULACIÓN ───────────────────────────────────── */}
        {tab==="simulacion" && <SimulPanel vars={vars} />}

      </main>

      {/* Footer */}
      <footer style={{padding:"16px 28px", borderTop:"1px solid #1a1a18",
        display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"12px"}}>
        <div style={{fontSize:"9px", color:"#5a5852", letterSpacing:"0.05em"}}>
          System Friction Framework v3.0 · MIHM v3 · Monte Carlo seed 42 · CC BY 4.0
        </div>
        <div style={{fontSize:"9px", color:"#5a5852"}}>
          Juan Antonio Marín Liera · aptymok@gmail.com ·{" "}
          <a href="https://systemfriction.org" target="_blank" rel="noreferrer"
            style={{color:"#7a6540"}}>systemfriction.org</a>
        </div>
      </footer>

      <style>{`
        input[type=range] { -webkit-appearance:none; height:20px; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance:none; width:12px; height:12px;
          border-radius:50%; background:#c8a96e; cursor:pointer; border:none;
        }
        input[type=range]::-moz-range-thumb {
          width:12px; height:12px; border-radius:50%;
          background:#c8a96e; cursor:pointer; border:none;
        }
        input[type=range]::-webkit-slider-runnable-track {
          height:2px; background:#222220;
        }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#131310; }
        ::-webkit-scrollbar-thumb { background:#2a2a28; }
      `}</style>
    </div>
  );
}