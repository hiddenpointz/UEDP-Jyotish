import React, { useState, useCallback } from "react";
import Head from "next/head";
import type { ChartData, BirthData, HoraData } from "../lib/uedpEngine";
import { OMEGA_CRIT, GLYPH, RASHIS, NAKSHATRAS } from "../lib/uedpEngine";

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const r2 = (v: number|undefined) => typeof v === "number" ? Math.round(v*100)/100 : "—";
const r4 = (v: number|undefined) => typeof v === "number" ? Math.round(v*10000)/10000 : "—";
const sf = (v: unknown, fb="—") => (v != null && v !== "" && v !== undefined) ? String(v) : fb;

const DIG_COLOR: Record<string,string> = {
  exalted:"#f5d06e",moolatrikona:"#e8b84b",own:"#c8962a",friend:"#5cd8a0",
  neutral:"#b0a888",enemy:"#e08030",debilitated:"#e86060"
};
const DIG_CLASS: Record<string,string> = {
  exalted:"dig-exalted",moolatrikona:"dig-moolatrikona",own:"dig-own",
  friend:"dig-friend",neutral:"dig-neutral",enemy:"dig-enemy",debilitated:"dig-debilitated"
};

const omegaColor = (o: number) => o >= OMEGA_CRIT ? "var(--jade2)" : o >= OMEGA_CRIT*0.7 ? "var(--gold2)" : "var(--crimson2)";
const scoreColor = (s: number) => s>=80?"var(--jade2)":s>=65?"var(--gold2)":s>=50?"#e08030":"var(--crimson2)";
const gradeChip = (s: number) => {
  const [label, cls] = s>=80?["Excellent","chip-ex"]:s>=65?["Good","chip-gd"]:s>=50?["Moderate","chip-mo"]:["Poor","chip-po"];
  return <span className={`score-chip ${cls}`}>{label}</span>;
};

const PLANET_ABBR: Record<string,string> = {Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
const P_ORDER = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

const SI_LAYOUT = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];

function SIChart({ planets, lagna, title }: { planets: Record<string,any>; lagna: {rashi:string}; title?: string }) {
  const lagnaIdx = RASHIS.indexOf(lagna?.rashi || "Mesha");
  const cells: Record<number,string[]> = {};
  for (const [pn,p] of Object.entries(planets||{})) {
    const ri = RASHIS.indexOf((p as any).rashi);
    if (ri<0) continue;
    if (!cells[ri]) cells[ri]=[];
    const dig = (p as any).dignity || "neutral";
    cells[ri].push(`<span style="color:${DIG_COLOR[dig]||"#b0a888"};font-size:9px;font-family:monospace">${PLANET_ABBR[pn]||pn.slice(0,2)}${(p as any).retrograde?"℞":""}</span>`);
  }
  return (
    <div style={{width:290}}>
      {title && <div style={{fontSize:10,color:"var(--gold3)",textAlign:"center",marginBottom:4,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{title}</div>}
      <div className="si-grid">
        {SI_LAYOUT.map((ri,i) => {
          if (ri===null) return <div key={i} className="si-cell si-center"><span style={{fontSize:8,color:"var(--text4)"}}>{title?.split("—")[0]}</span></div>;
          const isL = ri===lagnaIdx;
          return (
            <div key={i} className={`si-cell ${isL?"si-lagna":""}`}>
              <span className="si-rn">{ri+1}</span>
              {isL && <span style={{position:"absolute",top:2,right:3,color:"var(--gold)",fontSize:8}}>La</span>}
              <div className="si-planets" dangerouslySetInnerHTML={{__html:(cells[ri]||[]).join(" ")}} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OmegaGauge({ omega }: { omega: number }) {
  const col = omegaColor(omega);
  const pct = Math.min(100, omega*100);
  const r = 65; const circ = Math.PI*r;
  const dash = circ*pct/100;
  const critPct = OMEGA_CRIT*100;
  return (
    <svg width={160} height={100} viewBox="0 0 160 100">
      <path d="M 12 88 A 65 65 0 0 1 148 88" fill="none" stroke="rgba(42,53,85,0.8)" strokeWidth={12} strokeLinecap="round"/>
      <path d="M 12 88 A 65 65 0 0 1 148 88" fill="none" stroke={col} strokeWidth={12} strokeLinecap="round"
        strokeDasharray={`${(circ*pct/100).toFixed(1)} ${circ}`} strokeDashoffset={0} style={{transition:"stroke-dasharray 0.8s ease"}}/>
      {/* Critical threshold marker */}
      <circle cx={12 + 136*(critPct/100)} cy={88 - Math.sin(Math.PI*critPct/100)*65} r={4} fill="#e08030"/>
      <text x={80} y={78} textAnchor="middle" fontSize={22} fontWeight={700} fontFamily="'JetBrains Mono',monospace" fill={col}>{r4(omega)}</text>
      <text x={80} y={92} textAnchor="middle" fontSize={8} fontFamily="'JetBrains Mono',monospace" fill="var(--text3)">Ω_dynamics</text>
      <text x={76} y={50} textAnchor="middle" fontSize={8} fontFamily="'JetBrains Mono',monospace" fill="#e08030">1/e={OMEGA_CRIT.toFixed(3)}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// TAB DEFINITIONS
// ═══════════════════════════════════════════
type TabId = "chart"|"uedp"|"timeline"|"hora"|"panchang"|"planets"|"shadbala"|"dasha"|"doshas"|"yogas"|"medical"|"political"|"vargas"|"marriage"|"children"|"directions"|"predictions"|"remedies"|"ayanamsa";

const TABS: {id:TabId;label:string;icon:string}[] = [
  {id:"chart",label:"Chart",icon:"⊕"},
  {id:"uedp",label:"UEDP Ω",icon:"Ω"},
  {id:"timeline",label:"Timeline",icon:"📈"},
  {id:"hora",label:"Hora",icon:"⏰"},
  {id:"panchang",label:"Panchang",icon:"📅"},
  {id:"planets",label:"Planets",icon:"🪐"},
  {id:"shadbala",label:"Shadbala",icon:"⚖"},
  {id:"dasha",label:"Dasha",icon:"⌛"},
  {id:"doshas",label:"Doshas",icon:"⚡"},
  {id:"yogas",label:"Yogas",icon:"✦"},
  {id:"medical",label:"Medical",icon:"🌿"},
  {id:"political",label:"Political",icon:"🏛"},
  {id:"vargas",label:"Vargas",icon:"🔭"},
  {id:"marriage",label:"Marriage",icon:"💍"},
  {id:"children",label:"Children",icon:"👶"},
  {id:"directions",label:"Directions",icon:"🧭"},
  {id:"predictions",label:"Predictions",icon:"🔮"},
  {id:"remedies",label:"Remedies",icon:"🙏"},
  {id:"ayanamsa",label:"Ayanamsa",icon:"◎"},
];

const CITIES = [
  {name:"Chennai",lat:13.0827,lon:80.2707},
  {name:"Mumbai",lat:19.0760,lon:72.8777},
  {name:"Delhi",lat:28.6139,lon:77.2090},
  {name:"Bangalore",lat:12.9716,lon:77.5946},
  {name:"Kolkata",lat:22.5726,lon:88.3639},
  {name:"Hyderabad",lat:17.3850,lon:78.4867},
  {name:"Nagpur",lat:21.1458,lon:79.0882},
  {name:"Pune",lat:18.5204,lon:73.8567},
];

const AYANAMSA_LABELS: Record<string,string> = {
  lahiri:"Lahiri (IAU)",raman:"B.V.Raman",kp:"KP (Krishnamurti)",
  yukteshwar:"Yukteshwar",true_chitrapaksha:"True Chitra",jn_bhasin:"J.N.Bhasin"
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function Home() {
  const [chart, setChart] = useState<ChartData|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [tab, setTab] = useState<TabId>("chart");
  const [activeVarga, setActiveVarga] = useState("D1");
  const [birth, setBirth] = useState<BirthData>({
    name:"",day:14,month:4,year:1969,hour:10,minute:30,second:0,
    latitude:13.0827,longitude:80.2707,timezone:5.5,place:"Chennai",ayanamsa:"lahiri"
  });

  const set = <K extends keyof BirthData>(k:K, v:BirthData[K]) => setBirth(b=>({...b,[k]:v}));

  const compute = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/chart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(birth)});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Computation failed");
      setChart(data);
      setTab("chart");
    } catch(e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [birth]);

  // ═══════════════════════════
  // RENDER TABS
  // ═══════════════════════════

  function renderChart() {
    if (!chart) return null;
    const {lagna,planets,panchang,predictions,ashtakavarga,bhavas,dasha,uedp} = chart;
    const cur = dasha.current;
    return (
      <div>
        {/* Lagna Hero */}
        <div className="lagna-hero">
          <div>
            <div className="lagna-rashi-big">{lagna.rashi}</div>
            <div style={{color:"var(--text2)",fontSize:14,marginBottom:6}}>{lagna.sign} — {lagna.degInSign.toFixed(2)}°</div>
            <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.8}}>
              <span style={{color:"var(--gold)"}}>Nakshatra:</span> {lagna.nakshatra} (Pada {lagna.pada})<br/>
              <span style={{color:"var(--gold)"}}>Lagna Lord:</span> {lagna.rashiLord}<br/>
              <span style={{color:"var(--gold)"}}>Ayanamsa:</span> {chart.ayanamsaUsed} — {r4(chart.ayanamsaValue)}°
            </div>
          </div>
          <div>
            <OmegaGauge omega={uedp.omega}/>
            <div style={{fontSize:10,color:omegaColor(uedp.omega),textAlign:"center",fontFamily:"monospace"}}>
              {uedp.isStable?"✓ STABLE":"✗ BELOW Ω_crit"}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text3)",marginBottom:4,fontFamily:"monospace"}}>CURRENT DASHA</div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--gold2)"}}>{cur.mahadasha}</div>
            <div style={{fontSize:12,color:"var(--text2)"}}>AD: {cur.antardasha}<br/>PD: {cur.pratyantara}<br/>ends {cur.mahaEnds}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text3)",marginBottom:4,fontFamily:"monospace"}}>NAME</div>
            <div style={{fontSize:16,color:"var(--text)"}}>{chart.name||"Native"}</div>
            <div style={{fontSize:12,color:"var(--text3)"}}>{chart.place}</div>
            <div style={{fontSize:10,color:"var(--text3)",marginTop:4,fontFamily:"monospace"}}>Iseq: {r4(uedp.iseq)} | METP: {r2(uedp.metp)}</div>
          </div>
        </div>

        {/* SI Charts */}
        <div style={{display:"flex",flexWrap:"wrap",gap:16,marginBottom:16}}>
          <SIChart planets={planets} lagna={lagna} title="D1 — Rasi" />
          {chart.vargas?.D9 && <SIChart planets={chart.vargas.D9.planets} lagna={chart.vargas.D9.lagna} title="D9 — Navamsha" />}
        </div>

        {/* Domain predictions */}
        <div className="card">
          <div className="card-title">Life Domain Predictions — UEDP Ω weighted</div>
          {Object.values(predictions||{}).map(p => (
            <div key={p.domain} className="bar-row">
              <div className="bar-label">{p.icon} {p.domain}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${p.score}%`,background:scoreColor(p.score)}}/></div>
              <div className="bar-val" style={{color:scoreColor(p.score)}}>{p.score}</div>
            </div>
          ))}
        </div>

        {/* Sarva AV */}
        {ashtakavarga?.sarva?.bav && (
          <div className="card">
            <div className="card-title">Sarva Ashtakavarga — BPHS Ch.66–70</div>
            <div className="scroll-x">
              <table className="data-table">
                <thead><tr>{RASHIS.map(r=><th key={r}>{r.slice(0,3)}</th>)}</tr></thead>
                <tbody><tr>{ashtakavarga.sarva.bav.map((sc,i)=><td key={i} style={{color:sc>=28?"var(--jade2)":sc>=20?"var(--gold2)":"var(--crimson2)",fontWeight:700,fontFamily:"monospace"}}>{sc}</td>)}</tr></tbody>
              </table>
            </div>
          </div>
        )}

        {/* House grid */}
        {bhavas?.length > 0 && (
          <div className="card">
            <div className="card-title">Bhava Grid — 12 Houses</div>
            <div className="grid-3" style={{gap:6}}>
              {bhavas.map(b=>(
                <div key={b.bhava} style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:6,padding:9}}>
                  <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace",marginBottom:1}}>H{b.bhava} · {b.name}</div>
                  <div style={{fontSize:11,color:"var(--gold)",fontWeight:700,marginBottom:2}}>{b.rashi}</div>
                  <div style={{fontSize:10,color:"var(--text2)"}}>Lord: <span style={{color:"var(--gold2)"}}>{b.lord}</span>{b.lordHouse?` H${b.lordHouse}`:""} ({b.lordDignity})</div>
                  {b.planets?.length>0 && <div style={{marginTop:3,display:"flex",flexWrap:"wrap",gap:2}}>{b.planets.map(p=><span key={p} style={{fontSize:9,background:"rgba(200,150,42,0.12)",border:"1px solid var(--copper)",color:"var(--gold2)",borderRadius:3,padding:"1px 4px"}}>{p}</span>)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderUEDP() {
    if (!chart) return null;
    const u = chart.uedp;
    return (
      <div>
        <div className="card">
          <div className="card-title">UEDP v5 — Hybrinear Emergence Protocol — G S Ramesh Kumar</div>
          <div className="omega-gauge-wrap">
            <div>
              <OmegaGauge omega={u.omega}/>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div className="uedp-formula">
                <div style={{color:"var(--text3)",marginBottom:4}}>UEDP v5 Core Equations:</div>
                <div style={{color:"var(--gold3)"}}>Ω = Ψ · e<sup>−λ·I_seq</sup></div>
                <div style={{color:"var(--jade2)"}}>E*(t) = E(t) · (1 + λ·M(t))</div>
                <div style={{color:"var(--sapphire2)"}}>A/T = Υ·|φ| / (I_seq·Γ)</div>
                <div style={{color:"var(--text3)",marginTop:4,fontSize:10}}>Where:</div>
                <div style={{color:"var(--text2)"}}>I_seq = α·A + 0.3·B + 0.3·C</div>
                <div style={{color:"var(--text2)"}}>METP = Σ max(0, 1−Ω_t)</div>
                <div style={{color:"var(--text2)"}}>Ω_crit = 1/e = {OMEGA_CRIT.toFixed(6)}</div>
              </div>
            </div>
            <div style={{minWidth:180}}>
              <div className={`status-${u.isStable?"ok":"err"}`}>
                {u.isStable ? `✓ Ω (${u.omega}) ≥ 1/e — STRUCTURED DYNAMICS` : `✗ Ω (${u.omega}) < 1/e — EXCESSIVE INSTABILITY`}
              </div>
              <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.9,fontFamily:"monospace"}}>
                {[["Ω_dynamics",r4(u.omega)],["I_seq",r4(u.iseq)],["METP",r4(u.metp)],["R_mod",r4(u.rMod)],["A/T Ratio",r4(u.atRatio)],["F_pred",r4(u.fpred)],["Latent ΔE",r4(u.latentEmergence)],["Reversals",sf(u.reversals)]].map(([k,v])=>(
                  <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{fontFamily:"monospace"}}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">System Direction & Emergence</div>
          {[["RSL Direction",u.direction,u.direction.includes("Anados")?"var(--jade2)":"var(--crimson2)"],["A/T Interpretation",u.atInterpretation,u.atRatio>1?"var(--jade2)":"var(--crimson2)"],["System State",u.systemState,u.isStable?"var(--jade2)":"var(--crimson2)"]].map(([k,v,c])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{color:c as string}}>{v as string}</span></div>
          ))}
          {[["Instability A (magnitude)",r4(u.A)],["Instability B (direction)",r4(u.B)],["Instability C (reversal)",r4(u.C)],["F_pred (hybrinear)",r4(u.fpred)],["F_final",r4(u.ffinal)]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{fontFamily:"monospace",color:"var(--gold2)"}}>{v}</span></div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Ayanamsa Consensus & Confidence</div>
          {[["Overall Confidence",`${Math.round((chart.confidence?.overall||0)*100)}%`],["Mode",chart.confidence?.mode||""],["Ephemeris",chart.confidence?.ephemeris?.note||""],["Boundary",chart.confidence?.boundaryStability?.note||""],["Ayanamsa Agreement",chart.confidence?.ayanamsaAgreement?.note||""]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{fontSize:11,color:"var(--text2)"}}>{v}</span></div>
          ))}
        </div>
      </div>
    );
  }

  function renderTimeline() {
    if (!chart?.uedpTimeline) return null;
    const tl = chart.uedpTimeline;
    const peaks = tl.filter(t=>t.classification==="PEAK").sort((a,b)=>b.omega-a.omega).slice(0,8);
    const troughs = tl.filter(t=>t.classification==="TROUGH").sort((a,b)=>a.omega-b.omega).slice(0,8);
    const today = new Date().toISOString().slice(0,7);

    return (
      <div>
        <div className="card">
          <div className="card-title">UEDP Ω Timeline — Past · Present · Future</div>
          <p style={{fontSize:12,color:"var(--text2)",marginBottom:12,lineHeight:1.6}}>
            Ω coherence computed monthly using Keplerian planetary positions. PEAK = Ω ≥ 1σ above mean (structured dynamics window). TROUGH = Ω ≤ 1σ below mean (instability phase). Surya Siddhanta orbital mechanics + UEDP hybrinear protocol.
          </p>
          <div className="scroll-x" style={{maxHeight:400,overflowY:"auto"}}>
            <table className="data-table">
              <thead><tr>
                <th>Period</th><th>Ω</th><th>Stable?</th><th>Class</th><th>Career</th><th>Wealth</th><th>Marriage</th><th>Health</th><th>Events</th>
              </tr></thead>
              <tbody>
                {tl.map((t,i)=>{
                  const isCurrent = t.date.slice(0,7)===today;
                  const col = omegaColor(t.omega);
                  return (
                    <tr key={i} style={{background:isCurrent?"rgba(200,150,42,0.12)":""}}>
                      <td style={{fontFamily:"monospace",fontSize:11,color:isCurrent?"var(--gold2)":"var(--text3)"}}>{t.date}{isCurrent?" ◄":""}</td>
                      <td style={{color:col,fontFamily:"monospace",fontWeight:700}}>{r4(t.omega)}</td>
                      <td style={{color:t.isStable?"var(--jade2)":"var(--crimson2)"}}>{t.isStable?"✓":""}</td>
                      <td><span style={{fontSize:9,color:t.classification==="PEAK"?"var(--jade2)":t.classification==="TROUGH"?"var(--crimson2)":"var(--text3)"}}>{t.classification}</span></td>
                      {["career","wealth","marriage","health"].map(d=><td key={d} style={{fontFamily:"monospace",fontSize:10,color:scoreColor(t.domainScores?.[d]||50)}}>{t.domainScores?.[d]||"—"}</td>)}
                      <td style={{fontSize:10,color:"var(--text3)"}}>{t.events?.join("; ")||""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Peak Periods — Ω above threshold</div>
            {peaks.map((t,i)=>(
              <div key={i} className="data-row">
                <span className="lbl" style={{color:"var(--jade2)"}}>{t.date}</span>
                <span className="val" style={{fontFamily:"monospace",color:"var(--jade2)"}}>{r4(t.omega)}</span>
                {t.events?.[0] && <span style={{fontSize:10,color:"var(--text3)",marginLeft:6}}>{t.events[0]}</span>}
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">Trough Periods — Caution zones</div>
            {troughs.map((t,i)=>(
              <div key={i} className="data-row">
                <span className="lbl" style={{color:"var(--crimson2)"}}>{t.date}</span>
                <span className="val" style={{fontFamily:"monospace",color:"var(--crimson2)"}}>{r4(t.omega)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderHora() {
    if (!chart?.horaAnalysis) return null;
    const ha = chart.horaAnalysis;
    const {horas,bestHoras,avoidHoras,weeklyPattern} = ha;
    const currentHora = horas.find(h=>h.isCurrentHora);

    return (
      <div>
        <div className="card">
          <div className="card-title">Hora UEDP Analysis — Surya Siddhanta + G S Ramesh Kumar Protocol</div>
          <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.7,marginBottom:10}}>
            Hora = each 60-minute planetary hour. First hora of day = day lord. Sequence follows Chaldean order (Saturn→Jupiter→Mars→Sun→Venus→Mercury→Moon). Odd horas = Solar (Simha/Leo), Even = Lunar (Karka/Cancer) per Surya Siddhanta.<br/>
            UEDP Ω_hora = e<sup>−I_hora</sup> · W_lord · (1 + λ·D_activation). Formula: G S Ramesh Kumar UEDP v5.
          </div>
          <div className="grid-4" style={{marginBottom:12}}>
            {[["Day Lord",ha.dayLord,"var(--gold2)"],["Daily Ω",r4(ha.dailyOmega),omegaColor(ha.dailyOmega)],["Sunrise",ha.sunrise,"var(--text2)"],["Coherence",ha.dailyOmega>=OMEGA_CRIT?"STABLE":"CAUTION",ha.dailyOmega>=OMEGA_CRIT?"var(--jade2)":"var(--crimson2)"]].map(([k,v,c])=>(
              <div key={k} style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:6,padding:8,textAlign:"center"}}>
                <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace",marginBottom:2}}>{k}</div>
                <div style={{fontSize:15,fontWeight:700,color:c as string}}>{v}</div>
              </div>
            ))}
          </div>

          {currentHora && (
            <div className="hora-card current" style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"var(--gold)",fontFamily:"monospace",marginBottom:4}}>⏰ CURRENT HORA</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:22,fontWeight:700,color:"var(--gold2)"}}>{GLYPH[currentHora.horaLord]||""} {currentHora.horaLord}</div>
                  <div style={{fontSize:11,color:"var(--text3)",fontFamily:"monospace"}}>{currentHora.startTime} – {currentHora.endTime}</div>
                  <div style={{fontSize:11,color:"var(--text2)"}}>{currentHora.horaType} · {currentHora.horaSign}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>{currentHora.horaEffect}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                    {currentHora.domains.map(d=><span key={d} style={{fontSize:9,background:"rgba(58,184,122,0.1)",border:"1px solid var(--jade)",color:"var(--jade2)",borderRadius:3,padding:"1px 5px"}}>{d}</span>)}
                  </div>
                </div>
                <div>
                  {[["Ω_hora",r4(currentHora.omegaHora),omegaColor(currentHora.omegaHora)],["UEDP Score",r4(currentHora.uedpScore),"var(--gold2)"],["Dasha Act",r4(currentHora.dasha_activation),"var(--sapphire2)"],["Karma Load",r4(currentHora.horaKarmaLoad),"#e08030"]].map(([k,v,c])=>(
                    <div key={k} className="data-row"><span className="lbl">{k}</span><span style={{fontFamily:"monospace",color:c as string,fontSize:11}}>{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Best Horas Today — High Ω</div>
            {bestHoras.map((h,i)=>(
              <div key={i} className="hora-card best" style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:700,color:"var(--jade2)"}}>{GLYPH[h.horaLord]||""} {h.horaLord}</span>
                  <span style={{fontFamily:"monospace",fontSize:10,color:"var(--gold2)"}}>{h.startTime}–{h.endTime}</span>
                </div>
                <div style={{fontSize:10,color:"var(--text2)",marginBottom:3}}>{h.horaEffect}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:10}}>
                  <span style={{color:"var(--jade2)"}}>Ω={r4(h.omegaHora)}</span>
                  <span style={{color:"var(--gold2)"}}>Score={r4(h.uedpScore)}</span>
                  <span style={{color:"var(--sapphire2)"}}>{h.horaType}</span>
                </div>
                <div style={{fontSize:10,color:"var(--jade2)",marginTop:3}}>{h.horaRecommendation}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">Avoid These Horas — Low Ω</div>
            {avoidHoras.map((h,i)=>(
              <div key={i} className="hora-card avoid" style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:700,color:"var(--crimson2)"}}>{GLYPH[h.horaLord]||""} {h.horaLord}</span>
                  <span style={{fontFamily:"monospace",fontSize:10}}>{h.startTime}–{h.endTime}</span>
                </div>
                <div style={{fontSize:10,color:"var(--text3)",marginBottom:3}}>Ω={r4(h.omegaHora)} | Karma Load={r4(h.horaKarmaLoad)}</div>
                <div style={{fontSize:10,color:"var(--crimson2)"}}>Avoid: {h.warningDomains.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Full 24-hora table */}
        <div className="card">
          <div className="card-title">Full 24-Hora Day — UEDP Ω Analysis</div>
          <div className="scroll-x">
            <table className="data-table">
              <thead><tr>
                <th>#</th><th>Lord</th><th>Time</th><th>Type</th><th>Sign</th><th>Ω_hora</th><th>UEDP Score</th><th>Dasha Act</th><th>I_hora</th><th>Resilience</th><th>Domains</th>
              </tr></thead>
              <tbody>
                {horas.map(h=>{
                  const col = omegaColor(h.omegaHora);
                  return (
                    <tr key={h.horaNumber} style={{background:h.isCurrentHora?"rgba(200,150,42,0.1)":""}}>
                      <td style={{fontFamily:"monospace",color:"var(--text3)"}}>{h.horaNumber}{h.isCurrentHora?" ◄":""}</td>
                      <td style={{fontWeight:700,color:DIG_COLOR.friend}}>{GLYPH[h.horaLord]||""} {h.horaLord}</td>
                      <td style={{fontFamily:"monospace",fontSize:10,color:"var(--text3)"}}>{h.startTime}–{h.endTime}</td>
                      <td style={{fontSize:10,color:h.horaType==="Solar"?"var(--gold2)":"var(--sapphire2)"}}>{h.horaType}</td>
                      <td style={{fontSize:10}}>{h.horaSign}</td>
                      <td style={{color:col,fontFamily:"monospace",fontWeight:700}}>{r4(h.omegaHora)}</td>
                      <td style={{color:"var(--gold2)",fontFamily:"monospace"}}>{r4(h.uedpScore)}</td>
                      <td style={{fontFamily:"monospace",color:"var(--sapphire2)"}}>{r4(h.dasha_activation)}</td>
                      <td style={{fontFamily:"monospace",color:"var(--text3)"}}>{r4(h.horaInstability)}</td>
                      <td style={{fontFamily:"monospace",color:"var(--jade2)"}}>{r4(h.horaResilience)}</td>
                      <td style={{fontSize:10,color:"var(--text2)"}}>{h.domains.slice(0,2).join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly pattern */}
        {weeklyPattern && (
          <div className="card">
            <div className="card-title">Weekly Hora Pattern — UEDP Day-Lord Analysis</div>
            <div className="grid-4" style={{gap:8}}>
              {weeklyPattern.map(wp=>(
                <div key={wp.day} style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:7,padding:10}}>
                  <div style={{fontSize:10,color:"var(--text3)",fontFamily:"monospace"}}>{wp.day}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--gold2)",marginTop:2}}>{wp.dayLord}</div>
                  <div style={{fontSize:11,fontFamily:"monospace",color:omegaColor(wp.avgOmega)}}>Ω avg: {r4(wp.avgOmega)}</div>
                  <div style={{fontSize:10,color:wp.uedpGrade==="HIGH"?"var(--jade2)":wp.uedpGrade==="STABLE"?"var(--gold2)":"var(--crimson2)"}}>{wp.uedpGrade}</div>
                  <div style={{fontSize:9,color:"var(--text3)",marginTop:3}}>{wp.bestDomain}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPanchang() {
    if (!chart?.panchang) return null;
    const p = chart.panchang; const t=p.tithi;
    return (
      <div>
        <div className="card">
          <div className="card-title">Panchanga — Five Limbs (Surya Siddhanta)</div>
          {[["Tithi",`${t.name} — ${t.paksha} ${t.tithi_in_paksha} (${Math.round(t.progress*100)}%)`],["Vara (Weekday)",p.vara],["Nakshatra",`${p.nakshatra} · Lord: ${p.nakshatraLord}`],["Yoga",p.yoga],["Karana",p.karana],["Moon Sign",p.moonSign],["Sun Sign",p.sunSign],["Lagna",p.lagna],["Ayanamsa",p.moonSign]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val hi">{v}</span></div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Tithi Progress</div>
          <div style={{fontSize:14,color:"var(--gold2)",marginBottom:6}}>{t.name} — {Math.round(t.progress*100)}% elapsed</div>
          <div style={{height:10,background:"var(--deep)",borderRadius:5,overflow:"hidden"}}>
            <div style={{height:"100%",background:"var(--gold)",borderRadius:5,width:`${Math.round(t.progress*100)}%`}}/>
          </div>
        </div>
      </div>
    );
  }

  function renderPlanets() {
    if (!chart?.planets) return null;
    return (
      <div className="card">
        <div className="card-title">Graha Table — Phaladeepika + Surya Siddhanta</div>
        <div className="scroll-x">
          <table className="data-table">
            <thead><tr><th>Graha</th><th>Rashi</th><th>House</th><th>Degree</th><th>Nakshatra</th><th>Pada</th><th>Dignity</th><th>Lord</th><th>Speed</th><th>Notes</th></tr></thead>
            <tbody>
              {P_ORDER.map(pn=>{
                const p=chart.planets[pn];if(!p)return null;
                const dig=p.dignity;
                return (
                  <tr key={pn}>
                    <td><strong>{GLYPH[pn]||""} {pn}</strong></td>
                    <td>{p.rashi}<br/><span style={{fontSize:10,color:"var(--text3)"}}>{p.sign}</span></td>
                    <td style={{textAlign:"center",color:"var(--gold)",fontFamily:"monospace"}}>H{p.house}</td>
                    <td style={{fontFamily:"monospace",fontSize:11}}>{r4(p.degInSign)}°</td>
                    <td>{p.nakshatra}</td>
                    <td style={{fontFamily:"monospace"}}>{p.pada}</td>
                    <td className={DIG_CLASS[dig]||"dig-neutral"}>{dig}</td>
                    <td style={{color:"var(--text2)"}}>{p.rashiLord}</td>
                    <td style={{fontFamily:"monospace",fontSize:10,color:"var(--text3)"}}>{Math.abs(p.speed).toFixed(3)}</td>
                    <td style={{fontSize:10}}>{p.retrograde&&<span style={{color:"#e08030"}}>℞</span>}{p.combust&&<span style={{color:"var(--crimson2)"}}>☄</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderShadbala() {
    if (!chart?.shadbala) return null;
    return (
      <div className="card">
        <div className="card-title">Shadbala — Six Strengths (Phaladeepika Ch.12)</div>
        <div className="scroll-x">
          <table className="data-table">
            <thead><tr><th>Planet</th><th>Sthana</th><th>Dig</th><th>Kala</th><th>Chesta</th><th>Naisargika</th><th>Drik</th><th>Rupas</th><th>Grade</th><th>Ishta</th><th>Kashta</th></tr></thead>
            <tbody>
              {Object.entries(chart.shadbala).map(([pn,s])=>{
                const gc=s.strengthGrade==="Strong"?"var(--jade2)":s.strengthGrade==="Moderate"?"var(--gold2)":"var(--crimson2)";
                return (
                  <tr key={pn}>
                    <td><strong>{pn}</strong></td>
                    {[s.sthanaBala,s.digBala,s.kalaBala,s.chestaBala,s.naisargikaBala,s.drikBala].map((v,i)=><td key={i} style={{fontFamily:"monospace"}}>{r2(v)}</td>)}
                    <td style={{color:gc,fontFamily:"monospace",fontWeight:700}}>{r2(s.totalRupas)}</td>
                    <td style={{color:gc}}>{s.strengthGrade}</td>
                    <td style={{color:"var(--jade2)",fontFamily:"monospace"}}>{r2(s.ishtaPhala)}</td>
                    <td style={{color:"var(--crimson2)",fontFamily:"monospace"}}>{r2(s.kashtaPhala)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderDasha() {
    if (!chart?.dasha) return null;
    const {dasha} = chart; const cur=dasha.current; const today=new Date().toISOString().slice(0,10);
    const MD_THEME: Record<string,string> = {Ketu:"Spirituality, detachment, research, past karma",Venus:"Love, marriage, arts, luxury, comfort",Sun:"Career, government, authority, ego, health",Moon:"Mind, mother, emotions, property, public",Mars:"Energy, siblings, property, surgery, courage",Rahu:"Foreign, technology, ambition, illusion",Jupiter:"Wisdom, children, fortune, dharma, guru",Saturn:"Discipline, karma, delays, service, longevity",Mercury:"Business, communication, education, intellect"};
    return (
      <div>
        <div style={{background:"linear-gradient(135deg,rgba(15,21,37,0.9),rgba(22,30,53,0.9))",border:"2px solid var(--gold)",borderRadius:10,padding:16,marginBottom:14}}>
          <div style={{fontSize:10,color:"var(--text3)",fontFamily:"monospace",marginBottom:4}}>CURRENT MAHADASHA</div>
          <div style={{fontSize:32,fontWeight:700,color:"var(--gold2)"}}>{cur.mahadasha}</div>
          <div style={{fontSize:12,color:"var(--text2)",marginTop:4}}>
            AD: <strong style={{color:"var(--gold2)"}}>{cur.antardasha}</strong> ends {cur.antarEnds}<br/>
            PD: <strong style={{color:"var(--gold)"}}>{cur.pratyantara}</strong><br/>
            Elapsed: {dasha.elapsedYears} yrs · Remaining: {dasha.remainingYears} yrs
          </div>
          <div style={{marginTop:8,fontSize:12,color:"var(--text2)",fontStyle:"italic"}}>{MD_THEME[cur.mahadasha]}</div>
        </div>

        <div className="card">
          <div className="card-title">Current MD Antardashas — {cur.mahadasha}</div>
          {dasha.antardashas?.map((a,i)=>{
            const isC=a.lord===cur.antardasha;
            const nat=["Jupiter","Venus","Mercury","Moon"].includes(a.lord)?"var(--jade2)":["Saturn","Mars","Rahu","Ketu"].includes(a.lord)?"var(--crimson2)":"var(--gold2)";
            return (
              <div key={i} className="data-row" style={{background:isC?"rgba(200,150,42,0.08)":""}}>
                <span style={{color:nat,fontWeight:isC?700:400}}>{a.lord}{isC?" ◄":""} — {r2(a.years)} yrs</span>
                <span style={{color:"var(--text3)",fontSize:11,fontFamily:"monospace"}}>{a.start} → {a.end}</span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-title">Full 120-Year Vimshottari Timeline</div>
          <div className="scroll-x">
            <table className="data-table">
              <thead><tr><th>Mahadasha</th><th>From</th><th>To</th><th>Years</th><th>Status</th><th>Classical Theme</th></tr></thead>
              <tbody>
                {dasha.dashas?.map((d,i)=>{
                  const isC=d.start<=today&&today<=d.end;const isPast=d.end<today;
                  return (
                    <tr key={i} style={{background:isC?"rgba(200,150,42,0.1)":""}}>
                      <td style={{fontWeight:700,color:isC?"var(--gold2)":isPast?"var(--text3)":"var(--text)"}}>{d.lord}{isC?" ◄":""} ({d.years}y)</td>
                      <td style={{fontFamily:"monospace",fontSize:11,color:"var(--text3)"}}>{d.start}</td>
                      <td style={{fontFamily:"monospace",fontSize:11,color:"var(--text3)"}}>{d.end}</td>
                      <td style={{fontFamily:"monospace"}}>{d.years}</td>
                      <td style={{fontSize:11}}>{isC?"🔶 Current":isPast?"✓ Past":"— Future"}</td>
                      <td style={{fontSize:11,color:"var(--text2)"}}>{MD_THEME[d.lord]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderDoshas() {
    if (!chart?.doshas) return null;
    return (
      <div>
        <div className="card">
          <div className="card-title">Dosha Analysis — {chart.doshas.length} detected</div>
          <p style={{fontSize:12,color:"var(--text2)",marginBottom:10}}>Current Dasha: <strong style={{color:"var(--gold2)"}}>{chart.dasha?.current?.mahadasha}/{chart.dasha?.current?.antardasha}</strong></p>
        </div>
        {chart.doshas.map(d=>{
          const isHigh=d.level==="High";
          return (
            <div key={d.name} className={`dosha-card dosha-${isHigh?"high":"moderate"}`}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:isHigh?"var(--crimson2)":"#e08030"}}>{d.name}</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>{d.alias}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,fontFamily:"monospace",color:"var(--text2)"}}>Strength: {d.strength}</div>
                  <div style={{height:4,width:80,background:"var(--deep)",borderRadius:2,overflow:"hidden",marginTop:3}}>
                    <div style={{height:"100%",background:isHigh?"var(--crimson2)":"#e08030",width:`${d.strength}%`}}/>
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:"var(--text3)",marginBottom:6}}>{d.placement}</div>
              <div style={{marginBottom:6}}>{d.effects.map(e=><div key={e} style={{fontSize:11,color:"var(--text2)",marginBottom:2}}>⚡ {e}</div>)}</div>
              <div style={{background:"rgba(58,184,122,0.05)",border:"1px solid rgba(58,184,122,0.2)",borderRadius:5,padding:8}}>
                {d.remedies.map(r=><div key={r.r} className="remedy-line">✦ {r.r}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderYogas() {
    if (!chart?.yogas) return null;
    return (
      <div className="card">
        <div className="card-title">Yoga Detection — Phaladeepika + BPHS ({chart.yogas.length} found)</div>
        <div className="scroll-x">
          <table className="data-table">
            <thead><tr><th>Yoga</th><th>Type</th><th>Planets</th><th>Strength</th><th>Relevance</th><th>Description</th></tr></thead>
            <tbody>
              {chart.yogas.map((y,i)=>{
                const sc=y.strength;const col=scoreColor(sc);
                return (
                  <tr key={i}>
                    <td style={{fontWeight:700,color:"var(--gold2)"}}>{y.yoga}</td>
                    <td style={{fontSize:11,color:"var(--text3)"}}>{y.type}</td>
                    <td>{y.planets}</td>
                    <td style={{color:col,fontFamily:"monospace",fontWeight:700}}>{sc}</td>
                    <td>{gradeChip(sc)}</td>
                    <td style={{fontSize:11,color:"var(--text2)"}}>{y.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderMedical() {
    if (!chart?.medical) return null;
    const m=chart.medical;const tri=m.tridosha;
    return (
      <div>
        <div className="card">
          <div className="card-title">Ayurvedic Health Index — Tridosha</div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:14}}>
            <div>
              <div style={{fontSize:48,fontWeight:700,color:omegaColor(m.healthIndex||0)}}>{Math.round((m.healthIndex||0)*100)}%</div>
              <div style={{color:"var(--gold)",fontSize:14,fontWeight:600}}>{m.healthGrade}</div>
            </div>
            <div style={{flex:1,display:"flex",gap:8}}>
              {["Vata","Pitta","Kapha"].map(nm=>{const v=(tri as any)[nm]||0;const isDom=tri.dominant===nm;return(
                <div key={nm} style={{flex:1,background:"var(--deep)",border:`1px solid ${isDom?"var(--gold)":"var(--border)"}`,borderRadius:7,padding:10,textAlign:"center"}}>
                  <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace",marginBottom:2}}>{nm}</div>
                  <div style={{fontSize:22,fontWeight:700,color:isDom?"var(--gold2)":"var(--text2)"}}>{v}%</div>
                  {isDom&&<div style={{fontSize:9,color:"var(--gold)",fontFamily:"monospace"}}>Dominant</div>}
                </div>
              );})}
            </div>
          </div>
          {tri.remedies?.length>0&&<div>{tri.remedies.map(r=><div key={r} className="remedy-line">✦ {r}</div>)}</div>}
        </div>
        <div className="card">
          <div className="card-title">Current Dasha Health — {m.currentDashaHealth?.lord}</div>
          {[["Risk Level",m.currentDashaHealth?.risk],["Body Focus",(m.currentDashaHealth?.bodyFocus||[]).join(", ")]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{color:k==="Risk Level"&&v==="Elevated"?"var(--crimson2)":v==="Moderate"?"#e08030":"var(--jade2)"}}>{v}</span></div>
          ))}
        </div>
        {m.planetaryVulnerabilities?.length>0&&(
          <div className="card">
            <div className="card-title">Planetary Health Vulnerabilities</div>
            <table className="data-table">
              <thead><tr><th>Planet</th><th>Organs</th><th>Risk Conditions</th><th>Score</th><th>Reason</th></tr></thead>
              <tbody>{m.planetaryVulnerabilities.map(v=>(
                <tr key={v.planet}>
                  <td><strong>{v.planet}</strong></td>
                  <td style={{fontSize:11}}>{v.organs.join(", ")}</td>
                  <td style={{fontSize:11,color:"#e08030"}}>{v.diseases.join(", ")}</td>
                  <td style={{color:"var(--crimson2)",fontFamily:"monospace"}}>{Math.round((v.vulnerabilityScore||0)*100)}%</td>
                  <td style={{fontSize:11,color:"var(--text3)"}}>{v.reason}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderPolitical() {
    if (!chart?.political) return null;
    const pol=chart.political;const lead=pol.leadership;const dims=lead.dimensions;
    return (
      <div>
        <div className="card">
          <div className="card-title">Leadership Analysis</div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:14}}>
            <div style={{fontSize:48,fontWeight:700,color:"var(--gold2)"}}>{lead.overallLeadershipIndex}<span style={{fontSize:18,color:"var(--text2)"}}>/100</span></div>
            <div><div style={{color:"var(--gold)",fontSize:16,fontWeight:700}}>{lead.grade} Leadership</div>
            {lead.keyFactors?.map(f=><div key={f} style={{fontSize:11,color:"var(--text2)",marginTop:3}}>✦ {f}</div>)}
            </div>
          </div>
          {Object.entries(dims||{}).map(([k,v])=>(
            <div key={k} className="bar-row">
              <div className="bar-label">{k}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${v}%`,background:scoreColor(v)}}/></div>
              <div className="bar-val" style={{color:scoreColor(v)}}>{v}</div>
            </div>
          ))}
        </div>
        {chart.yogas?.length>0&&(
          <div className="card">
            <div className="card-title">Raja Yogas & Power Combinations</div>
            <table className="data-table">
              <thead><tr><th>Yoga</th><th>Type</th><th>Strength</th><th>Description</th></tr></thead>
              <tbody>{chart.yogas.map((y,i)=>(
                <tr key={i}><td style={{fontWeight:700,color:"var(--gold2)"}}>{y.yoga}</td><td style={{fontSize:11,color:"var(--text3)"}}>{y.type}</td><td style={{color:scoreColor(y.strength),fontFamily:"monospace"}}>{y.strength}</td><td style={{fontSize:11,color:"var(--text2)"}}>{y.description}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderVargas() {
    if (!chart?.vargas) return null;
    const keys = Object.keys(chart.vargas);
    const vb = chart.vargas[activeVarga]||{};
    const DESC: Record<string,string> = {D1:"Rasi — Complete life",D9:"Navamsha — Marriage, dharma",D10:"Dashamsha — Career",D3:"Drekkana — Siblings",D4:"Chaturthamsha — Property",D7:"Saptamsha — Children",D12:"Dwadashamsha — Parents",D60:"Shastiamsha — Karma"};
    return (
      <div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
          {keys.map(k=><button key={k} className={`ayan-btn ${activeVarga===k?"active":""}`} onClick={()=>setActiveVarga(k)}>{k} <span style={{fontSize:8,opacity:0.6}}>{(DESC[k]||"").split("—")[0]}</span></button>)}
        </div>
        <div style={{fontSize:11,color:"var(--text2)",marginBottom:10,padding:8,background:"var(--deep)",borderRadius:5}}>{DESC[activeVarga]||activeVarga} · Lagna: <strong style={{color:"var(--gold2)"}}>{vb.lagna?.rashi} ({vb.lagna?.sign})</strong></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:16,marginBottom:14}}>
          <SIChart planets={vb.planets||{}} lagna={vb.lagna||{rashi:"Mesha"}} title={`${activeVarga} Chart`}/>
          <div style={{flex:1,minWidth:200}}>
            <div className="scroll-x">
              <table className="data-table">
                <thead><tr><th>Graha</th><th>Rashi</th><th>H</th><th>Dignity</th></tr></thead>
                <tbody>{P_ORDER.map(pn=>{const p=(vb.planets||{})[pn];if(!p||!p.rashi)return null;return(<tr key={pn}><td><strong>{GLYPH[pn]||""} {pn}</strong></td><td>{p.rashi}<br/><span style={{fontSize:9,color:"var(--text3)"}}>{p.sign}</span></td><td style={{color:"var(--gold)",textAlign:"center"}}>H{p.house}</td><td className={DIG_CLASS[p.dignity]||"dig-neutral"}>{p.dignity}</td></tr>);})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMarriage() {
    if (!chart?.marriage) return null;
    const m=chart.marriage;
    return (
      <div>
        <div className="card">
          <div className="card-title">Vivah Analysis — Phaladeepika + BPHS</div>
          <div style={{fontSize:22,fontWeight:700,color:scoreColor(m.successPct),marginBottom:8}}>{m.successScore}/10 — {m.successAnalysis}</div>
          {[["7th House",m.h7Rashi],["7th Lord",`${m.h7Lord} — ${m.h7LordDignity} in H${m.h7LordHouse}`],["7th Planets",m.h7Planets?.join(", ")||"—"],["Spouse Qualities",m.spouseQualities]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val">{v}</span></div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Marriage Type</div>
          <div style={{fontSize:14,fontWeight:700,color:"var(--gold2)",marginBottom:10}}>{m.marriageType}</div>
          {[["Love",m.loveScore],["Arranged",m.arrangedScore],["Live-in",m.liveinScore]].map(([k,v])=>(
            <div key={k} className="bar-row">
              <div className="bar-label">{k}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${Math.min(100,(v as number)*10)}%`,background:k==="Love"?"var(--crimson2)":k==="Arranged"?"var(--sapphire2)":"var(--text3)"}}/></div>
              <div className="bar-val">{v}</div>
            </div>
          ))}
          {m.loveReasons?.length>0&&<div style={{marginTop:8}}>{m.loveReasons.map(r=><div key={r} style={{fontSize:11,color:"var(--crimson2)",marginBottom:2}}>♥ {r}</div>)}</div>}
          {m.arrangedReasons?.length>0&&<div style={{marginTop:4}}>{m.arrangedReasons.map(r=><div key={r} style={{fontSize:11,color:"var(--sapphire2)",marginBottom:2}}>◈ {r}</div>)}</div>}
        </div>
        <div className="card">
          <div className="card-title">D9 Navamsha Validation</div>
          {m.d9Validation&&[["D9 H7 Lord",m.d9Validation.h7LordInD9],["H7 Lord D9 Dignity",m.d9Validation.h7LordD9Dig],["Venus D9",m.d9Validation.venusD9Dig],["D9 Note",m.d9Validation.d9Note]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{fontSize:11}}>{v}</span></div>
          ))}
        </div>
        {m.separationIndicators?.length>0&&<div className="status-err">⚠ Separation Indicators:<br/>{m.separationIndicators.map(s=><div key={s} style={{marginTop:4}}>• {s}</div>)}</div>}
        {m.upcomingDashas?.length>0&&(
          <div className="card">
            <div className="card-title">Upcoming Marriage Dasha Windows</div>
            <p style={{fontSize:11,color:"var(--text2)",marginBottom:8}}>{m.timingCurrent}</p>
            <table className="data-table"><thead><tr><th>Period</th><th>From</th><th>To</th><th>Note</th></tr></thead>
            <tbody>{m.upcomingDashas.map((d,i)=><tr key={i}><td style={{fontWeight:700,color:"var(--gold2)"}}>{d.period}</td><td style={{fontFamily:"monospace",fontSize:11}}>{d.from}</td><td style={{fontFamily:"monospace",fontSize:11}}>{d.to}</td><td style={{fontSize:11,color:"var(--text2)"}}>{d.note}</td></tr>)}</tbody></table>
          </div>
        )}
        <div className="card"><div className="card-title">Vivah Remedies</div>{m.remedies?.map(r=><div key={r} className="remedy-line">✦ {r}</div>)}</div>
      </div>
    );
  }

  function renderChildren() {
    if (!chart?.children) return null;
    const c=chart.children;
    return (
      <div>
        <div className="card">
          <div className="card-title">Putra Bhava — BPHS 5th House + D7</div>
          <div style={{fontSize:26,fontWeight:700,color:scoreColor(c.likelihoodPct),marginBottom:8}}>{c.childScore}/10 — {c.likelihood}</div>
          {[["5th House",c.h5Rashi],["5th Lord",`${c.h5Lord} — ${c.h5LordDignity} in H${c.h5LordHouse}`],["5th Planets",c.h5Planets?.join(", ")||"—"],["Jupiter",`H${c.jupiterHouse} — ${c.jupiterDignity} ${c.jupiterStrong?"✓ Strong":"⚠ Weak"}`],["Putra Karaka (Jaimini)",c.putraKaraka],["Count Tendency",c.countTendency]].map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val">{v}</span></div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Gender Tendency (Classical Indicators — Not Deterministic)</div>
          <div style={{fontSize:14,fontWeight:700,color:"var(--gold2)",marginBottom:8}}>{c.genderTendency}</div>
          <div className="bar-row"><div className="bar-label">Male</div><div className="bar-track"><div className="bar-fill" style={{width:`${c.genderBreakdown?.malePct||50}%`,background:"var(--sapphire2)"}}/></div><div className="bar-val">{c.genderBreakdown?.malePct}%</div></div>
          <div className="bar-row"><div className="bar-label">Female</div><div className="bar-track"><div className="bar-fill" style={{width:`${c.genderBreakdown?.femalePct||50}%`,background:"#f9a8d4"}}/></div><div className="bar-val">{c.genderBreakdown?.femalePct}%</div></div>
          <div style={{fontSize:10,color:"var(--text3)",marginTop:4}}>Confidence: {c.genderBreakdown?.confidence} | D7 H5 Rashi: {c.genderBreakdown?.d7H5Rashi}</div>
        </div>
        {c.afflictions?.length>0&&<div className="status-warn">⚠ Afflictions:<br/>{c.afflictions.map(a=><div key={a} style={{marginTop:3}}>• {a}</div>)}</div>}
        <div className="card"><div className="card-title">Santana Remedies</div>{c.remedies?.map(r=><div key={r} className="remedy-line">✦ {r}</div>)}</div>
        <div style={{fontSize:11,color:"var(--text3)",padding:10,background:"var(--deep)",borderRadius:5,border:"1px solid var(--border)"}}>{c.advisory}</div>
      </div>
    );
  }

  function renderDirections() {
    if (!chart?.directions) return null;
    const d=chart.directions;
    return (
      <div>
        <div className="card">
          <div className="card-title">Auspicious Directions — 6-Layer Synthesis</div>
          <p style={{fontSize:11,color:"var(--text2)",marginBottom:10,lineHeight:1.6}}>L1: Surya Siddhanta Dikpala · L2: Phaladeepika Digbala · L3: BPHS Lagna Rashi · L4: Atharva Veda Nakshatra-Vastu · L5: Karma Disha (Shadbala) · L6: 10th Lord Career</p>
          <div style={{fontSize:13,color:"var(--text2)",marginBottom:10}}>{d.summary}</div>
          {d.primaryDirections?.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:10,color:"var(--gold)",fontFamily:"monospace",marginBottom:4}}>PRIMARY</div>
            {d.primaryDirections.map((p,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><span style={{fontSize:16,fontWeight:700,color:"var(--gold2)",minWidth:100}}>{p.direction}</span><span style={{fontSize:10,color:"var(--jade2)"}}>weight: {p.weight}</span><span style={{fontSize:10,color:"var(--text3)"}}>{p.reasons?.slice(0,2).join(" · ")}</span></div>)}
          </div>}
          {d.secondaryDirections?.length>0&&<div><div style={{fontSize:10,color:"var(--gold3)",fontFamily:"monospace",marginBottom:4}}>SECONDARY</div>
            {d.secondaryDirections.map((p,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><span style={{fontSize:13,color:"var(--text)",minWidth:100}}>{p.direction}</span><span style={{fontSize:10,color:"var(--text2)"}}>{p.reasons?.slice(0,2).join(" · ")}</span></div>)}
          </div>}
        </div>
        <div className="card">
          <div className="card-title">Purpose-Specific Directions</div>
          {Object.entries(d.purposeDirections||{}).map(([k,v])=>(
            <div key={k} className="data-row"><span className="lbl">{k.replace(/_/g," ")}</span><span className="val hi">{v}</span></div>
          ))}
        </div>
        <div className="card"><div className="card-title">Remedies</div>{d.remedies?.map(r=><div key={r} className="remedy-line">✦ {r}</div>)}</div>
      </div>
    );
  }

  function renderPredictions() {
    if (!chart?.predictions) return null;
    return (
      <div className="card">
        <div className="card-title">Life Domain Predictions — UEDP Protocol Weighted</div>
        <p style={{fontSize:11,color:"var(--text2)",marginBottom:10}}>Scores derived from UEDP Ω × Shadbala × Dasha activation × Functional polarity per lagna.</p>
        {Object.values(chart.predictions||{}).map(p=>(
          <div key={p.domain}>
            <div className="bar-row">
              <div className="bar-label">{p.icon} {p.domain}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${p.score}%`,background:scoreColor(p.score)}}/></div>
              <div className="bar-val" style={{color:scoreColor(p.score)}}>{p.score}</div>
              <div style={{marginLeft:4}}>{gradeChip(p.score)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderRemedies() {
    if (!chart) return null;
    const PLANET_REM: Record<string,{gem:string;mantra:string;day:string;donate:string}> = {
      Sun:{gem:"Ruby (Manikya) — gold",mantra:"Om Hraam Hreem Hraum Sah Suryaya Namah (6000×)",day:"Sunday",donate:"Wheat, jaggery, copper, red cloth"},
      Moon:{gem:"Pearl (Moti) — silver",mantra:"Om Shraam Shreem Shraum Sah Chandraya Namah (11000×)",day:"Monday",donate:"Rice, milk, white items, silver"},
      Mars:{gem:"Red Coral (Moonga) — copper",mantra:"Om Kraam Kreem Kraum Sah Bhaumaya Namah (7000×)",day:"Tuesday",donate:"Red lentils, copper, red cloth"},
      Mercury:{gem:"Emerald (Panna) — gold",mantra:"Om Braam Breem Braum Sah Budhaya Namah (17000×)",day:"Wednesday",donate:"Green moong, books, green cloth"},
      Jupiter:{gem:"Yellow Sapphire (Pukhraj) — gold",mantra:"Om Graam Greem Graum Sah Guruve Namah (19000×)",day:"Thursday",donate:"Yellow items, turmeric, chana dal"},
      Venus:{gem:"Diamond/White Sapphire",mantra:"Om Draam Dreem Draum Sah Shukraya Namah (20000×)",day:"Friday",donate:"White items, sugar, white cloth"},
      Saturn:{gem:"Blue Sapphire (Neelam) — TRIAL 3 DAYS",mantra:"Om Praam Preem Praum Sah Shanaischaraya Namah (23000×)",day:"Saturday",donate:"Black sesame, iron, blue/black cloth"},
      Rahu:{gem:"Hessonite (Gomed) — silver",mantra:"Om Bhraam Bhreem Bhraum Sah Rahave Namah (18000×)",day:"Saturday",donate:"Black/blue items, black gram"},
      Ketu: {
  gem: "Cat's Eye (Lehsunia)",
  mantra: "Om Sraam Sreem Sraum Sah Ketave Namah (17000×)",
  day: "Tuesday",
  donate: "Blanket, sesame, black or neutral items"

   };
  }
  
},

