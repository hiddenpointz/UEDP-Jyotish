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
type TabId = "chart"|"uedp"|"timeline"|"hora"|"panchang"|"planets"|"shadbala"|"dasha"|"doshas"|"yogas"|"medical"|"political"|"vargas"|"marriage"|"children"|"directions"|"predictions"|"remedies"|"ayanamsa"|"transits"|"scenario"|"muhurta"|"match"|"gandas"|"location"|"fullTimeline"|"pariharas";

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
  {id:"transits",label:"Transits",icon:"🌐"},
  {id:"scenario",label:"Scenario",icon:"⚖️"},
  {id:"muhurta",label:"Muhurta",icon:"🕰️"},
  {id:"match",label:"Match",icon:"💞"},
  {id:"gandas",label:"Gandas",icon:"⚠️"},
  {id:"location",label:"Location",icon:"📍"},
  {id:"fullTimeline",label:"Life Arc",icon:"🗓️"},
  {id:"pariharas",label:"Pariharas",icon:"🪔"},
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
  // Decisional engine state
  const [decisional, setDecisional] = useState<Record<string,any>|null>(null);
  const [decisionalLoading, setDecisionalLoading] = useState(false);
  // Scenario / Muhurta inputs
  const [scenarioDate, setScenarioDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [scenarioDomain, setScenarioDomain] = useState<string>("career");
  const [scenarioAction, setScenarioAction] = useState<string>("Proposed decision");
  const [muhurtaEnd, setMuhurtaEnd] = useState<string>(new Date(Date.now()+60*86400000).toISOString().slice(0,10));
  // Match partner
  const [partnerBirth, setPartnerBirth] = useState<Partial<BirthData>>({name:"",day:1,month:1,year:1970,hour:0,minute:0,second:0,latitude:13.0827,longitude:80.2707,timezone:5.5});
  const [locationList] = useState([
    {lat:28.6139,lon:77.2090,name:"Delhi",timezone:5.5},
    {lat:19.0760,lon:72.8777,name:"Mumbai",timezone:5.5},
    {lat:13.0827,lon:80.2707,name:"Chennai",timezone:5.5},
    {lat:12.9716,lon:77.5946,name:"Bengaluru",timezone:5.5},
    {lat:22.5726,lon:88.3639,name:"Kolkata",timezone:5.5},
    {lat:17.3850,lon:78.4867,name:"Hyderabad",timezone:5.5},
    {lat:21.1458,lon:79.0882,name:"Nagpur",timezone:5.5},
    {lat:18.5204,lon:73.8567,name:"Pune",timezone:5.5},
  ]);

  const set = <K extends keyof BirthData>(k:K, v:BirthData[K]) => setBirth(b=>({...b,[k]:v}));

  const fetchDecisional = useCallback(async (module: string, extras: Record<string,unknown> = {}) => {
    if (!birth) return;
    setDecisionalLoading(true);
    try {
      const body: Record<string,unknown> = {birth, module, ...extras};
      const res = await fetch("/api/decisional",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Decisional computation failed");
      setDecisional(d => ({...d, ...data}));
    } catch(e) {
      setError(String(e));
    } finally {
      setDecisionalLoading(false);
    }
  }, [birth]);

  const compute = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/chart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(birth)});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Computation failed");
      setChart(data);
      setDecisional(null); // reset decisional on new chart
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

      Ketu:{gem:"Cat's Eye (Lehsunia)",mantra:"Om Sraam Sreem Sraum Sah Ketave Namah (17000×)",day:"Tuesday",donate:"Blanket, sesame, neutral items"},
    };
    return (
      <div>
        <div className="card">
          <div className="card-title">Navagraha Parihara — Gem, Mantra, Day, Donation</div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:10}}>⚠ Blue Sapphire requires 3-day trial. All gems must be energised in correct hora on prescribed day.</div>
          <div className="scroll-x">
            <table className="data-table">
              <thead><tr><th>Planet</th><th>Gem</th><th>Day</th><th>Mantra</th><th>Donation</th></tr></thead>
              <tbody>
                {Object.entries(PLANET_REM).map(([pn,rem])=>(
                  <tr key={pn}>
                    <td><strong>{GLYPH[pn]||""} {pn}</strong></td>
                    <td style={{fontSize:11}}>{rem.gem}</td>
                    <td style={{color:"var(--gold2)",fontWeight:600}}>{rem.day}</td>
                    <td style={{fontSize:10,color:"var(--text3)"}}>{rem.mantra}</td>
                    <td style={{fontSize:11}}>{rem.donate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {chart.doshas?.length>0&&(
          <div className="card">
            <div className="card-title">Dosha-Specific Remedies</div>
            {chart.doshas.map(d=>(
              <div key={d.name} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--gold2)",marginBottom:4}}>{d.name} — {d.alias}</div>
                {d.remedies?.map(r=><div key={r.r} className="remedy-line">✦ {r.r}</div>)}
              </div>
            ))}
          </div>
        )}
        <div className="card">
          <div className="card-title">General Daily Practices (Atharva Veda)</div>
          {["Recite Maha Mrityunjaya Mantra 108× daily","Visit Navagraha temple every Saturday","Fast on the day ruled by your Lagna Lord","Donate food to the poor on Janma Nakshatra day monthly","Feed cows on Saturdays (Saturn propitiation)","Light sesame oil lamp on Saturdays","Recite Hanuman Chalisa on Tuesdays and Saturdays"].map(r=>(
            <div key={r} className="remedy-line">✦ {r}</div>
          ))}
        </div>
      </div>
    );
  }

  function renderAyanamsa() {
    if (!chart?.allAyanamsas) return null;
    const used=chart.ayanamsaUsed; const usedVal=chart.allAyanamsas[used]||0;
    const AYANAMSA_LABELS2: Record<string,string> = {lahiri:"Lahiri (IAU)",raman:"B.V.Raman",kp:"KP (Krishnamurti)",yukteshwar:"Yukteshwar",true_chitrapaksha:"True Chitra",jn_bhasin:"J.N.Bhasin"};
    return (
      <div className="card">
        <div className="card-title">Ayanamsa Comparison — All Systems</div>
        {Object.entries(chart.allAyanamsas).map(([k,v])=>{
          const ip=k===used; const diff=v-usedVal;
          const dc=Math.abs(diff)<0.1?"var(--jade2)":Math.abs(diff)<0.3?"var(--gold2)":"var(--crimson2)";
          return (
            <div key={k} className="data-row">
              <span className="lbl" style={{color:ip?"var(--gold2)":undefined,fontWeight:ip?700:400}}>{AYANAMSA_LABELS2[k]||k}{ip?" ★ Primary":""}</span>
              <span style={{fontFamily:"monospace",color:ip?"var(--gold2)":"var(--gold)"}}>{r4(v)}°{!ip&&<span style={{fontSize:10,color:dc,marginLeft:4}}>{diff>=0?"+":""}{r4(diff)}°</span>}</span>
            </div>
          );
        })}
        {chart.confidence&&(
          <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--border)"}}>
            <div style={{fontSize:10,color:"var(--gold3)",fontFamily:"monospace",marginBottom:6}}>UEDP CONFIDENCE LAYER</div>
            {[["Overall",`${Math.round((chart.confidence.overall||0)*100)}%`],["Mode",chart.confidence.mode],["Ephemeris",chart.confidence.ephemeris?.note||""],["Boundary",chart.confidence.boundaryStability?.note||""]].map(([k,v])=>(
              <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val" style={{fontSize:11}}>{v}</span></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DECISIONAL ENGINE RENDER FUNCTIONS
  // ═══════════════════════════════════════════

  function DecisionalGate({module,children,extras}:{module:string;children:React.ReactNode;extras?:Record<string,unknown>}) {
    const data = decisional?.[module==="transits"?"transits":module==="scenario"?"scenario":module==="muhurta"?"muhurta":module==="match"?"match":module==="gandas"?"gandas":module==="location"?"location":module==="timeline"?"timeline":module==="doshas_full"?"doshasFull":module];
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    if (data) return <>{children}</>;
    return (
      <div className="card" style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Click to load {module} data from the decisional engine.</div>
        <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} onClick={()=>fetchDecisional(module,extras||{})} disabled={decisionalLoading}>
          {decisionalLoading?"⏳ Computing…":`⊕ Load ${module}`}
        </button>
      </div>
    );
  }

  function renderTransits() {
    const tr = decisional?.transits;
    const load = ()=>fetchDecisional("transits",{targetDate:new Date().toISOString().slice(0,10)});
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    if (!tr) return (
      <div className="card" style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Load current transit analysis for all 9 planets over natal chart.</div>
        <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} onClick={load} disabled={decisionalLoading}>{decisionalLoading?"⏳ Computing…":"🌐 Load Transits"}</button>
      </div>
    );
    return (
      <div>
        <div className="card">
          <div className="card-title">Current Planetary Transits — As of {tr.asOf}</div>
          <div style={{marginBottom:10,display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 14px"}}>
              <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace"}}>TRANSIT Ω</div>
              <div style={{fontSize:18,fontWeight:700,color:omegaColor(tr.uedpOmegaTransit||0)}}>{r4(tr.uedpOmegaTransit)}</div>
            </div>
            <div style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 14px"}}>
              <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace"}}>SADE SATI</div>
              <div style={{fontSize:14,fontWeight:700,color:tr.saturnTransit?.sadeSati?"var(--crimson2)":"var(--jade2)"}}>{tr.saturnTransit?.sadeSati?`YES — ${tr.saturnTransit.sadeSatiPhase}`:"Not Active"}</div>
            </div>
            <div style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 14px"}}>
              <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace"}}>RAHU-KETU AXIS</div>
              <div style={{fontSize:12,color:"var(--gold2)"}}>{tr.rahuKetu?.axis}</div>
            </div>
          </div>
          <div className="scroll-x">
            <table className="data-table">
              <thead><tr><th>Planet</th><th>Transit Rashi</th><th>H</th><th>Natal H</th><th>Relationship</th><th>Strength</th><th>Effect</th><th>Period</th></tr></thead>
              <tbody>
                {(tr.currentTransits||[]).map((t:any)=>(
                  <tr key={t.planet}>
                    <td><strong>{GLYPH[t.planet]||""} {t.planet}</strong></td>
                    <td>{t.transitRashi}</td>
                    <td style={{color:"var(--gold)",fontFamily:"monospace",textAlign:"center"}}>H{t.transitHouse}</td>
                    <td style={{color:"var(--text3)",fontFamily:"monospace",textAlign:"center"}}>H{t.natalHouse}</td>
                    <td style={{fontSize:10,color:t.relationship==="trine"?"var(--jade2)":t.relationship==="opposition"?"var(--crimson2)":"var(--text2)"}}>{t.relationship}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:50,height:5,background:"var(--deep)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${t.strength}%`,background:scoreColor(t.strength)}}/></div>
                        <span style={{fontSize:10,fontFamily:"monospace",color:scoreColor(t.strength)}}>{t.strength}</span>
                      </div>
                    </td>
                    <td style={{fontSize:10,color:"var(--text2)",maxWidth:220}}>{t.effect}</td>
                    <td style={{fontSize:10,fontFamily:"monospace",color:"var(--text3)"}}>{t.startDate}→{t.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {tr.rahuKetu&&(
          <div className="card">
            <div className="card-title">Rahu-Ketu Axis — Karmic Transit</div>
            <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.8}}>{tr.rahuKetu.effect}</div>
            {[["Natal Rahu House",`H${tr.rahuKetu.natalHouseRahu}`],["Natal Ketu House",`H${tr.rahuKetu.natalHouseKetu}`]].map(([k,v])=>(
              <div key={k} className="data-row"><span className="lbl">{k}</span><span className="val hi">{v}</span></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderScenario() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const sc = decisional?.scenario;
    const DOMAINS = ["career","marriage","business","education","investment","travel","medical","political","assets","children","spiritual","money","foreign"];
    const clsColor: Record<string,string> = {PROCEED:"var(--jade2)",CAUTION:"var(--gold2)",DELAY:"#e08030",AVOID:"var(--crimson2)"};
    return (
      <div>
        <div className="card">
          <div className="card-title">⚖️ Decisional Scenario Engine</div>
          <p style={{fontSize:11,color:"var(--text2)",marginBottom:12}}>Enter a proposed date, domain, and action. The engine scores it across 6 dimensions: Dasha, Transit, UEDP Ω, Panchang, Natal strength, and Ganda risk.</p>
          <div className="grid-2" style={{gap:10,marginBottom:10}}>
            <div>
              <label className="form-label">Proposed Date</label>
              <input className="form-input" type="date" value={scenarioDate} onChange={e=>setScenarioDate(e.target.value)}/>
            </div>
            <div>
              <label className="form-label">Life Domain</label>
              <select className="form-input" value={scenarioDomain} onChange={e=>setScenarioDomain(e.target.value)}>
                {DOMAINS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label className="form-label">Action / Decision Description</label>
            <input className="form-input" value={scenarioAction} onChange={e=>setScenarioAction(e.target.value)} placeholder="e.g. Accept job offer, Sign agreement, Start business"/>
          </div>
          <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} disabled={decisionalLoading}
            onClick={()=>fetchDecisional("scenario",{targetDate:scenarioDate,actionDomain:scenarioDomain,action:scenarioAction})}>
            {decisionalLoading?"⏳ Computing…":"⊕ Score This Decision"}
          </button>
        </div>

        {sc&&(
          <div>
            <div style={{background:"var(--deep)",border:`2px solid ${clsColor[sc.classification]||"var(--border)"}`,borderRadius:10,padding:18,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:48,fontWeight:700,color:clsColor[sc.classification]}}>{sc.score}</div>
              <div style={{fontSize:22,fontWeight:700,color:clsColor[sc.classification],marginBottom:6}}>{sc.classification}</div>
              <div style={{fontSize:13,color:"var(--text2)"}}>{sc.recommendation}</div>
            </div>
            <div className="card">
              <div className="card-title">Scoring Breakdown — 6 Dimensions</div>
              {[
                ["Dasha Compatibility",sc.dimensions?.dashaScore,sc.dimensions?.dashaNotes],
                ["Transit Quality",sc.dimensions?.transitScore,sc.dimensions?.transitNotes],
                ["Panchang",sc.dimensions?.panchangScore,sc.dimensions?.panchangNotes],
                ["Natal Strength",sc.dimensions?.natalStrength,sc.dimensions?.natalNotes],
                ["UEDP Ω",Math.round((sc.dimensions?.uedpOmega||0)*100),`Ω=${r4(sc.dimensions?.uedpOmega)} ${sc.dimensions?.uedpStable?"(STABLE)":"(BELOW Ω_crit)"}`],
                ["Ganda Risk",Math.max(0,100-(sc.dimensions?.gandaRisk||0)),sc.dimensions?.gandaNotes],
              ].map(([k,v,note])=>(
                <div key={String(k)} className="bar-row">
                  <div className="bar-label" style={{minWidth:150}}>{k}</div>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${v}%`,background:scoreColor(Number(v))}}/></div>
                  <div className="bar-val" style={{color:scoreColor(Number(v))}}>{v}</div>
                  <div style={{fontSize:10,color:"var(--text3)",marginLeft:8,flex:1}}>{note}</div>
                </div>
              ))}
            </div>
            {sc.alternativeDates?.length>0&&(
              <div className="card">
                <div className="card-title">Better Alternative Dates (within ±30 days)</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {sc.alternativeDates.map((d:string)=>(
                    <button key={d} className="city-btn" onClick={()=>setScenarioDate(d)} style={{color:"var(--jade2)",borderColor:"var(--jade)"}}>{d}</button>
                  ))}
                </div>
              </div>
            )}
            {sc.remediesIfProceed?.length>0&&(
              <div className="card">
                <div className="card-title">Remedies if Proceeding Despite Risk</div>
                {sc.remediesIfProceed.map((r:string)=><div key={r} className="remedy-line">✦ {r}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderMuhurta() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const mu = decisional?.muhurta;
    const DOMAINS = ["marriage","career","business","education","investment","medical","political","money","assets","children","spiritual","foreign"];
    const clsCols: Record<string,string> = {EXCELLENT:"var(--jade2)",GOOD:"var(--gold2)",MODERATE:"#e08030",AVOID:"var(--crimson2)"};
    return (
      <div>
        <div className="card">
          <div className="card-title">🕰️ Muhurta Finder — Best Windows for Any Action</div>
          <p style={{fontSize:11,color:"var(--text2)",marginBottom:12}}>Scans a date range day-by-day. Scores Vara (weekday), Nakshatra, Tithi, and Hora for your chosen domain. Returns top 10 windows.</p>
          <div className="grid-2" style={{gap:10,marginBottom:10}}>
            <div>
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={scenarioDate} onChange={e=>setScenarioDate(e.target.value)}/>
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={muhurtaEnd} onChange={e=>setMuhurtaEnd(e.target.value)}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label className="form-label">Domain / Purpose</label>
            <select className="form-input" value={scenarioDomain} onChange={e=>setScenarioDomain(e.target.value)}>
              {DOMAINS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </div>
          <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} disabled={decisionalLoading}
            onClick={()=>fetchDecisional("muhurta",{targetDate:scenarioDate,endDate:muhurtaEnd,actionDomain:scenarioDomain})}>
            {decisionalLoading?"⏳ Computing…":"🕰️ Find Best Muhurtas"}
          </button>
        </div>
        {mu&&(
          <div>
            <div className="card" style={{background:"rgba(58,184,122,0.06)",border:"1px solid var(--jade)"}}>
              <div className="card-title">Best Muhurta</div>
              <div style={{fontSize:28,fontWeight:700,color:"var(--jade2)"}}>{mu.bestDate}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:4}}>{mu.summary}</div>
            </div>
            <div className="card">
              <div className="card-title">Top 10 Muhurta Windows — {mu.domain?.charAt(0).toUpperCase()+(mu.domain?.slice(1)||"")} {mu.rangeStart}→{mu.rangeEnd}</div>
              <div className="scroll-x">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Vara</th><th>Nakshatra</th><th>Tithi</th><th>Best Hora</th><th>Score</th><th>Grade</th><th>Reasons</th></tr></thead>
                  <tbody>
                    {(mu.windows||[]).map((w:any,i:number)=>(
                      <tr key={i} style={{background:w.classification==="EXCELLENT"?"rgba(58,184,122,0.07)":""}}>
                        <td style={{fontFamily:"monospace",fontWeight:700,color:clsCols[w.classification]}}>{w.date}</td>
                        <td style={{color:"var(--gold2)"}}>{w.vara}</td>
                        <td>{w.nakshatra}</td>
                        <td style={{fontFamily:"monospace",color:"var(--text3)"}}>{w.tithi}</td>
                        <td style={{fontSize:10,color:"var(--sapphire2)"}}>{w.bestHora}</td>
                        <td style={{fontFamily:"monospace",fontWeight:700,color:clsCols[w.classification]}}>{w.score}</td>
                        <td><span style={{fontSize:9,color:clsCols[w.classification],border:`1px solid ${clsCols[w.classification]}`,borderRadius:3,padding:"1px 5px"}}>{w.classification}</span></td>
                        <td style={{fontSize:10,color:"var(--text3)"}}>{(w.reasons||[]).slice(0,2).join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMatch() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const ma = decisional?.match;
    const gradeCol = (g:string) => g==="Excellent"?"var(--jade2)":g==="Good"?"var(--gold2)":g==="Acceptable"?"#e08030":"var(--crimson2)";
    return (
      <div>
        <div className="card">
          <div className="card-title">💞 Kundali Match — Ashtakoot + UEDP Harmony</div>
          <p style={{fontSize:11,color:"var(--text2)",marginBottom:12}}>Enter partner's birth details. Full 8-koot Ashtakoot analysis + Mangal dosha + Nadi dosha + UEDP field coherence harmony.</p>
          <div className="grid-2" style={{gap:8,marginBottom:8}}>
            <div>
              <label className="form-label">Partner Name</label>
              <input className="form-input" value={String(partnerBirth.name||"")} onChange={e=>setPartnerBirth(p=>({...p,name:e.target.value}))} placeholder="Partner Name"/>
            </div>
            <div>
              <label className="form-label">Date (D / M / YYYY)</label>
              <div className="grid-3">
                <input className="form-input" type="number" value={partnerBirth.day||1} onChange={e=>setPartnerBirth(p=>({...p,day:+e.target.value}))} placeholder="DD" min={1} max={31}/>
                <input className="form-input" type="number" value={partnerBirth.month||1} onChange={e=>setPartnerBirth(p=>({...p,month:+e.target.value}))} placeholder="MM" min={1} max={12}/>
                <input className="form-input" type="number" value={partnerBirth.year||1970} onChange={e=>setPartnerBirth(p=>({...p,year:+e.target.value}))} placeholder="YYYY"/>
              </div>
            </div>
          </div>
          <div className="grid-2" style={{gap:8,marginBottom:8}}>
            <div>
              <label className="form-label">Time (H : M)</label>
              <div className="grid-2">
                <input className="form-input" type="number" value={partnerBirth.hour||0} onChange={e=>setPartnerBirth(p=>({...p,hour:+e.target.value}))} placeholder="HH"/>
                <input className="form-input" type="number" value={partnerBirth.minute||0} onChange={e=>setPartnerBirth(p=>({...p,minute:+e.target.value}))} placeholder="MM"/>
              </div>
            </div>
            <div>
              <label className="form-label">Lat / Lon</label>
              <div className="grid-2">
                <input className="form-input" type="number" step="0.01" value={partnerBirth.latitude||13.08} onChange={e=>setPartnerBirth(p=>({...p,latitude:+e.target.value}))} placeholder="Lat"/>
                <input className="form-input" type="number" step="0.01" value={partnerBirth.longitude||80.27} onChange={e=>setPartnerBirth(p=>({...p,longitude:+e.target.value}))} placeholder="Lon"/>
              </div>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label className="form-label">Timezone</label>
            <input className="form-input" type="number" step="0.5" value={partnerBirth.timezone||5.5} onChange={e=>setPartnerBirth(p=>({...p,timezone:+e.target.value}))}/>
          </div>
          <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} disabled={decisionalLoading}
            onClick={()=>fetchDecisional("match",{partnerBirth:{...partnerBirth,second:0,gender:"female",ayanamsa:birth.ayanamsa||"lahiri"}})}>
            {decisionalLoading?"⏳ Computing…":"💞 Compute Compatibility"}
          </button>
        </div>
        {ma&&(
          <div>
            <div style={{background:"var(--deep)",border:`2px solid ${gradeCol(ma.grade)}`,borderRadius:10,padding:18,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:48,fontWeight:700,color:gradeCol(ma.grade)}}>{ma.totalPoints}<span style={{fontSize:22,color:"var(--text3)"}}>/36</span></div>
              <div style={{fontSize:18,fontWeight:700,color:gradeCol(ma.grade)}}>{ma.grade} — {ma.percentage}%</div>
              <div style={{fontSize:12,color:"var(--text2)",marginTop:6}}>{ma.summary}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>UEDP Field Harmony: {ma.uedpHarmony}</div>
            </div>
            <div className="card">
              <div className="card-title">Ashtakoot — 8 Koot Scores</div>
              <div className="scroll-x">
                <table className="data-table">
                  <thead><tr><th>Koot</th><th>Score</th><th>Max</th><th>%</th><th>Result</th></tr></thead>
                  <tbody>
                    {(ma.ashtakoot||[]).map((k:any)=>{
                      const pct=Math.round(k.score/k.maxScore*100);
                      return (
                        <tr key={k.koot}>
                          <td style={{fontWeight:700}}>{k.koot}</td>
                          <td style={{fontFamily:"monospace",color:scoreColor(pct),fontWeight:700}}>{k.score}</td>
                          <td style={{fontFamily:"monospace",color:"var(--text3)"}}>{k.maxScore}</td>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:60,height:5,background:"var(--deep)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:scoreColor(pct)}}/></div>
                              <span style={{fontSize:10,color:scoreColor(pct)}}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{fontSize:11,color:k.result.includes("Dosha")||k.result.includes("Poor")||k.result.includes("Incompat")?"var(--crimson2)":k.result.includes("Excell")||k.result.includes("Perfect")?"var(--jade2)":"var(--text2)"}}>{k.result}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid-2">
              <div className="card">
                <div className="card-title">Mangal Dosha</div>
                {[["Native",ma.mangalDosha?.native?"⚠ Present":"✓ None"],["Partner",ma.mangalDosha?.partner?"⚠ Present":"✓ None"],["Cancels",ma.mangalDosha?.cancels?"✓ Yes — mutual cancel":"✗ No"],["Effect",ma.mangalDosha?.effect]].map(([k,v])=>(
                  <div key={String(k)} className="data-row"><span className="lbl">{k}</span><span className="val" style={{color:String(v).includes("⚠")?"var(--crimson2)":String(v).includes("✓")?"var(--jade2)":"var(--text2)",fontSize:11}}>{v}</span></div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Nadi Dosha</div>
                {[["Present",ma.nadiDosha?.present?"⚠ YES":"✓ None"],["Severity",ma.nadiDosha?.severity]].map(([k,v])=>(
                  <div key={String(k)} className="data-row"><span className="lbl">{k}</span><span className="val" style={{color:String(v).includes("⚠")||v==="High"?"var(--crimson2)":"var(--jade2)",fontSize:11}}>{v}</span></div>
                ))}
                {ma.nadiDosha?.remedy&&<div style={{fontSize:10,color:"var(--gold2)",marginTop:6,lineHeight:1.6}}>Remedy: {ma.nadiDosha.remedy}</div>}
              </div>
            </div>
            {ma.pariharas?.length>0&&(
              <div className="card">
                <div className="card-title">Compatibility Pariharas</div>
                {ma.pariharas.map((r:string)=><div key={r} className="remedy-line">✦ {r}</div>)}
              </div>
            )}
            <div className="card" style={{background:"rgba(58,184,122,0.05)",border:"1px solid var(--jade)"}}>
              <div className="card-title">Recommendation</div>
              <div style={{fontSize:13,color:"var(--text)",lineHeight:1.7}}>{ma.recommendation}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGandas() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const gd = decisional?.gandas;
    const sevCol = (s:string) => s==="high"?"var(--crimson2)":s==="medium"?"#e08030":"var(--gold2)";
    return (
      <div>
        {!gd?(
          <div className="card" style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Detect all Gandanta, Kaal Sarp, Graha Yuddha, Vish Yoga, Maraka periods, Kemdrum and other danger periods.</div>
            <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} onClick={()=>fetchDecisional("gandas")} disabled={decisionalLoading}>{decisionalLoading?"⏳ Computing…":"⚠️ Load Ganda Analysis"}</button>
          </div>
        ):(
          <div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
              <div style={{background:"var(--deep)",border:`2px solid ${gd.totalRiskScore>50?"var(--crimson2)":gd.totalRiskScore>25?"#e08030":"var(--jade)"}`,borderRadius:8,padding:"12px 20px",textAlign:"center",minWidth:130}}>
                <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace",marginBottom:2}}>TOTAL RISK SCORE</div>
                <div style={{fontSize:36,fontWeight:700,color:gd.totalRiskScore>50?"var(--crimson2)":gd.totalRiskScore>25?"#e08030":"var(--jade2)"}}>{gd.totalRiskScore}</div>
              </div>
              <div style={{background:"var(--deep)",border:`1px solid ${gd.kaalSarpa?.present?"var(--crimson2)":"var(--border)"}`,borderRadius:8,padding:"12px 20px",minWidth:200}}>
                <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace",marginBottom:2}}>KAAL SARP YOGA</div>
                <div style={{fontSize:14,fontWeight:700,color:gd.kaalSarpa?.present?"var(--crimson2)":"var(--jade2)"}}>{gd.kaalSarpa?.present?"PRESENT":"Not Present"}</div>
                {gd.kaalSarpa?.present&&<div style={{fontSize:10,color:"var(--text2)",marginTop:2}}>{gd.kaalSarpa.type}</div>}
              </div>
            </div>

            {gd.kaalSarpa?.present&&(
              <div className="card" style={{border:"1px solid var(--crimson2)"}}>
                <div className="card-title" style={{color:"var(--crimson2)"}}>Kaal Sarp Yoga — {gd.kaalSarpa.type}</div>
                <div style={{fontSize:11,color:"var(--text2)",marginBottom:8}}>{gd.kaalSarpa.severity}</div>
                <div className="remedy-line">✦ {gd.kaalSarpa.remedy}</div>
              </div>
            )}

            {gd.activeNow?.length>0&&(
              <div className="card" style={{border:"1px solid var(--crimson2)"}}>
                <div className="card-title" style={{color:"var(--crimson2)"}}>⚠ Currently Active Dangers ({gd.activeNow.length})</div>
                {gd.activeNow.map((g:any,i:number)=>(
                  <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <strong style={{color:sevCol(g.severity)}}>{g.name}</strong>
                      <span style={{fontSize:9,color:sevCol(g.severity),border:`1px solid ${sevCol(g.severity)}`,borderRadius:3,padding:"0 4px"}}>{g.severity.toUpperCase()}</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>{g.effect}</div>
                    <div className="remedy-line" style={{fontSize:10}}>✦ {g.remedy}</div>
                  </div>
                ))}
              </div>
            )}

            {gd.natalGandas?.length>0&&(
              <div className="card">
                <div className="card-title">Natal Chart Dangers — Permanent Factors</div>
                {gd.natalGandas.map((g:any,i:number)=>(
                  <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <strong style={{color:sevCol(g.severity)}}>{g.name}</strong>
                      <span style={{fontSize:9,color:sevCol(g.severity),border:`1px solid ${sevCol(g.severity)}`,borderRadius:3,padding:"0 4px"}}>{g.severity.toUpperCase()}</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>{g.effect}</div>
                    <div className="remedy-line" style={{fontSize:10}}>✦ {g.remedy}</div>
                  </div>
                ))}
              </div>
            )}

            {gd.lifeGandas?.length>0&&(
              <div className="card">
                <div className="card-title">Maraka & Danger Dasha Periods</div>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Severity</th><th>From</th><th>To</th><th>Effect</th></tr></thead>
                  <tbody>
                    {gd.lifeGandas.map((g:any,i:number)=>(
                      <tr key={i} style={{background:g.isActive?"rgba(232,96,96,0.08)":""}}>
                        <td style={{fontWeight:700,color:sevCol(g.severity)}}>{g.name}{g.isActive?" ◄ ACTIVE":""}</td>
                        <td><span style={{fontSize:9,color:sevCol(g.severity),border:`1px solid ${sevCol(g.severity)}`,borderRadius:3,padding:"0 4px"}}>{g.severity}</span></td>
                        <td style={{fontFamily:"monospace",fontSize:11,color:"var(--text3)"}}>{g.startDate}</td>
                        <td style={{fontFamily:"monospace",fontSize:11,color:"var(--text3)"}}>{g.endDate}</td>
                        <td style={{fontSize:11,color:"var(--text2)"}}>{g.effect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderLocation() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const loc = decisional?.location;
    const DOMAINS = ["career","education","business","marriage","money","spiritual","assets","political","investment","children","medical","foreign"];
    return (
      <div>
        {!loc?(
          <div className="card" style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:8}}>Score 8 major Indian cities for this native across 12 life domains using Vastu directional analysis.</div>
            <div style={{fontSize:11,color:"var(--text3)",marginBottom:16}}>Cities: Delhi, Mumbai, Chennai, Bengaluru, Kolkata, Hyderabad, Nagpur, Pune</div>
            <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} onClick={()=>fetchDecisional("location",{locations:locationList})} disabled={decisionalLoading}>{decisionalLoading?"⏳ Computing…":"📍 Score All Locations"}</button>
          </div>
        ):(
          <div>
            <div className="card" style={{background:"rgba(58,184,122,0.05)",border:"1px solid var(--jade)"}}>
              <div className="card-title">Best City Overall</div>
              <div style={{fontSize:28,fontWeight:700,color:"var(--jade2)"}}>{loc.bestCity}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>Native birthplace: {loc.nativeCity}</div>
            </div>
            <div className="card">
              <div className="card-title">Domain→Best City Matrix</div>
              <div className="grid-3" style={{gap:6}}>
                {DOMAINS.map(d=>(
                  <div key={d} style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:5,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"var(--text2)"}}>{d}</span>
                    <span style={{fontSize:11,fontWeight:700,color:"var(--gold2)"}}>{loc.bestForPurpose?.[d]||"—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">City Scores — Overall + All Domains</div>
              <div className="scroll-x">
                <table className="data-table">
                  <thead><tr><th>City</th><th>Dir</th><th>Overall</th>{DOMAINS.map(d=><th key={d} style={{fontSize:9}}>{d.slice(0,5)}</th>)}<th>Best For</th></tr></thead>
                  <tbody>
                    {(loc.scores||[]).map((s:any,i:number)=>(
                      <tr key={i} style={{background:i===0?"rgba(58,184,122,0.07)":""}}>
                        <td style={{fontWeight:700,color:i===0?"var(--jade2)":"var(--text)"}}>{s.city}{i===0?" ★":""}</td>
                        <td style={{fontSize:10,color:"var(--sapphire2)"}}>{s.direction}</td>
                        <td style={{fontFamily:"monospace",fontWeight:700,color:scoreColor(s.overallScore)}}>{s.overallScore}</td>
                        {DOMAINS.map(d=><td key={d} style={{fontFamily:"monospace",fontSize:10,color:scoreColor(s.domainScores?.[d]||50)}}>{s.domainScores?.[d]||"—"}</td>)}
                        <td style={{fontSize:10,color:"var(--jade2)"}}>{(s.bestFor||[]).slice(0,2).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFullTimeline() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const tl = decisional?.timeline;
    const clsCol: Record<string,string> = {PEAK:"var(--jade2)",STABLE:"var(--gold2)",CAUTION:"#e08030",TROUGH:"var(--crimson2)",CRITICAL:"#ff3333"};
    return (
      <div>
        {!tl?(
          <div className="card" style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Full decisional life arc — past, present, and future periods classified by UEDP Ω + Dasha + Ganda.</div>
            <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} onClick={()=>fetchDecisional("timeline")} disabled={decisionalLoading}>{decisionalLoading?"⏳ Computing…":"🗓️ Load Full Life Arc"}</button>
          </div>
        ):(
          <div>
            <div className="grid-2" style={{marginBottom:14}}>
              <div className="card">
                <div className="card-title" style={{color:"var(--jade2)"}}>Peak Years</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{(tl.peakYears||[]).map((y:string)=><span key={y} style={{background:"rgba(58,184,122,0.12)",border:"1px solid var(--jade)",color:"var(--jade2)",borderRadius:4,padding:"2px 8px",fontFamily:"monospace",fontSize:12}}>{y}</span>)}</div>
              </div>
              <div className="card">
                <div className="card-title" style={{color:"var(--crimson2)"}}>Trough Years — Caution</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{(tl.troughYears||[]).map((y:string)=><span key={y} style={{background:"rgba(232,96,96,0.12)",border:"1px solid var(--crimson)",color:"var(--crimson2)",borderRadius:4,padding:"2px 8px",fontFamily:"monospace",fontSize:12}}>{y}</span>)}</div>
              </div>
            </div>

            {(tl.lifeChapters||[]).map((ch:any,i:number)=>(
              <div key={i} style={{background:"var(--deep)",border:"1px solid var(--border)",borderRadius:7,padding:12,marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--gold2)",marginBottom:3}}>{ch.title}</div>
                <div style={{fontSize:10,fontFamily:"monospace",color:"var(--text3)",marginBottom:4}}>{ch.start} → {ch.end}</div>
                <div style={{fontSize:11,color:"var(--text2)"}}>{ch.summary}</div>
              </div>
            ))}

            {tl.currentPeriod&&(
              <div className="card" style={{border:`2px solid ${clsCol[tl.currentPeriod.classification]}`}}>
                <div className="card-title">◄ Current Period — {tl.currentPeriod.dashaActive}</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  <div style={{fontSize:36,fontWeight:700,color:clsCol[tl.currentPeriod.classification]}}>{tl.currentPeriod.classification}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>{tl.currentPeriod.period}</div>
                    <div style={{fontSize:11,color:omegaColor(tl.currentPeriod.uedpOmega),fontFamily:"monospace"}}>Ω = {r4(tl.currentPeriod.uedpOmega)}</div>
                    <div style={{fontSize:11,color:"var(--text2)",marginTop:4}}>{(tl.currentPeriod.domains||[]).join(", ")}</div>
                    {(tl.currentPeriod.events||[]).map((e:string,i:number)=><div key={i} style={{fontSize:10,color:"var(--text3)",marginTop:2}}>• {e}</div>)}
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-title">Full Dasha Timeline — Past · Present · Future</div>
              <div className="scroll-x" style={{maxHeight:450,overflowY:"auto"}}>
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Dasha</th><th>Class</th><th>Ω</th><th>Score</th><th>Domains</th><th>Events</th></tr></thead>
                  <tbody>
                    {[...(tl.pastPeriods||[]),...(tl.currentPeriod?[tl.currentPeriod]:[]),...(tl.futurePeriods||[])].map((e:any,i:number)=>(
                      <tr key={i} style={{background:e.isCurrentPeriod?"rgba(200,150,42,0.1)":e.startDate>new Date().toISOString().slice(0,10)?"rgba(58,80,130,0.05)":""}}>
                        <td style={{fontFamily:"monospace",fontSize:10,color:e.isCurrentPeriod?"var(--gold2)":"var(--text3)"}}>{e.period}{e.isCurrentPeriod?" ◄":""}</td>
                        <td style={{fontWeight:700,color:"var(--gold2)"}}>{e.dashaActive}</td>
                        <td><span style={{fontSize:9,color:clsCol[e.classification],border:`1px solid ${clsCol[e.classification]}`,borderRadius:3,padding:"0 4px"}}>{e.classification}</span></td>
                        <td style={{fontFamily:"monospace",color:omegaColor(e.uedpOmega)}}>{r4(e.uedpOmega)}</td>
                        <td style={{fontFamily:"monospace",color:scoreColor(e.score)}}>{e.score}</td>
                        <td style={{fontSize:10,color:"var(--text2)"}}>{(e.domains||[]).slice(0,2).join(", ")}</td>
                        <td style={{fontSize:10,color:"var(--text3)"}}>{(e.events||[]).slice(0,1).join("")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPariharas() {
    if (!chart) return <div className="status-err">Compute a chart first.</div>;
    const pf = decisional?.doshasFull;
    return (
      <div>
        {!pf?(
          <div className="card" style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Full Parihara & extended Dosha analysis — Kaal Sarp, Gandanta, Graha Yuddha, Vish Yoga, Nadi details, and complete classical remedy vidhi.</div>
            <button className="compute-btn" style={{width:"auto",padding:"10px 28px"}} onClick={()=>fetchDecisional("doshas_full")} disabled={decisionalLoading}>{decisionalLoading?"⏳ Computing…":"🪔 Load Full Pariharas"}</button>
          </div>
        ):(
          <div>
            {(pf.pariharas||[]).map((p:any)=>(
              <div key={p.dosha} className="card" style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"var(--gold2)"}}>{p.dosha}</div>
                    <div style={{fontSize:11,color:"var(--text3)",fontFamily:"monospace"}}>{p.source}</div>
                  </div>
                </div>
                <div className="grid-2" style={{gap:12}}>
                  <div>
                    {[["Remedy",p.remedy],["Ritual (Vidhi)",p.ritual],["Deity",p.deity]].map(([k,v])=>(
                      <div key={String(k)} style={{marginBottom:8}}>
                        <div style={{fontSize:9,color:"var(--gold3)",fontFamily:"monospace",marginBottom:2}}>{k}</div>
                        <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:6,padding:10,border:"1px solid var(--border)",marginBottom:8}}>
                      <div style={{fontSize:9,color:"var(--text3)",fontFamily:"monospace",marginBottom:3}}>MANTRA</div>
                      <div style={{fontSize:12,color:"var(--jade2)",lineHeight:1.7}}>{p.mantra}</div>
                    </div>
                    {[["Daan (Donation)",p.daan],["Timing",p.timing]].map(([k,v])=>(
                      <div key={String(k)} style={{marginBottom:6}}>
                        <div style={{fontSize:9,color:"var(--gold3)",fontFamily:"monospace",marginBottom:2}}>{k}</div>
                        <div style={{fontSize:11,color:"var(--text2)"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {p.karmaBarrier&&(
                  <div style={{marginTop:8,background:"rgba(232,96,96,0.08)",border:"1px solid rgba(232,96,96,0.3)",borderRadius:5,padding:8}}>
                    <div style={{fontSize:9,color:"var(--crimson2)",fontFamily:"monospace",marginBottom:3}}>⚠ KARMA BARRIER — WHY REMEDY MAY NOT WORK</div>
                    <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.6}}>{p.karmaBarrier}</div>
                  </div>
                )}
                {p.karmaOverride&&(
                  <div style={{marginTop:6,background:"rgba(58,184,122,0.06)",border:"1px solid rgba(58,184,122,0.25)",borderRadius:5,padding:8}}>
                    <div style={{fontSize:9,color:"var(--jade2)",fontFamily:"monospace",marginBottom:3}}>✦ HOW TO OVERRIDE KARMA</div>
                    <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.6}}>{p.karmaOverride}</div>
                  </div>
                )}
              </div>
            ))}
            {(pf.gandaReport||[]).length>0&&(
              <div className="card">
                <div className="card-title">Extended Natal Danger Analysis</div>
                {pf.gandaReport.map((g:any,i:number)=>(
                  <div key={i} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid var(--border)"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#e08030",marginBottom:2}}>{g.name}</div>
                    <div style={{fontSize:11,color:"var(--text2)",marginBottom:4}}>{g.effect}</div>
                    <div className="remedy-line" style={{fontSize:10}}>✦ {g.remedy}</div>
                  </div>
                ))}
              </div>
            )}
            {pf.kaalSarpa&&pf.kaalSarpa.present&&(
              <div className="card" style={{border:"1px solid var(--crimson2)"}}>
                <div className="card-title" style={{color:"var(--crimson2)"}}>Kaal Sarp Yoga</div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:8}}>{pf.kaalSarpa.type} · {pf.kaalSarpa.axis}</div>
                <div className="remedy-line">✦ {pf.kaalSarpa.remedy}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════
  const renderTab = () => {
    switch(tab) {
      case "chart":        return renderChart();
      case "uedp":         return renderUEDP();
      case "timeline":     return renderTimeline();
      case "hora":         return renderHora();
      case "panchang":     return renderPanchang();
      case "planets":      return renderPlanets();
      case "shadbala":     return renderShadbala();
      case "dasha":        return renderDasha();
      case "doshas":       return renderDoshas();
      case "yogas":        return renderYogas();
      case "medical":      return renderMedical();
      case "political":    return renderPolitical();
      case "vargas":       return renderVargas();
      case "marriage":     return renderMarriage();
      case "children":     return renderChildren();
      case "directions":   return renderDirections();
      case "predictions":  return renderPredictions();
      case "remedies":     return renderRemedies();
      case "ayanamsa":     return renderAyanamsa();
      case "transits":     return renderTransits();
      case "scenario":     return renderScenario();
      case "muhurta":      return renderMuhurta();
      case "match":        return renderMatch();
      case "gandas":       return renderGandas();
      case "location":     return renderLocation();
      case "fullTimeline": return renderFullTimeline();
      case "pariharas":    return renderPariharas();
      default:             return null;
    }
  };

  const AYANAMSA_LABELS_SI: Record<string,string> = {lahiri:"Lahiri (IAU)",raman:"B.V.Raman",kp:"KP (Krishnamurti)",yukteshwar:"Yukteshwar",true_chitrapaksha:"True Chitra",jn_bhasin:"J.N.Bhasin"};

  return (
    <>
      <Head>
        <title>UEDP V5 — Jyotisha Intelligence Engine</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
      </Head>
      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="app-logo">⊕ UEDP <span>V5</span></div>
          <div className="app-subtitle">G S Ramesh Kumar · Jyotisha Intelligence</div>

          <div className="form-section-title">Birth Details</div>
          <label className="form-label">Full Name</label>
          <input className="form-input" value={birth.name} onChange={e=>set("name",e.target.value)} placeholder="Name"/>

          <label className="form-label">Birth Date</label>
          <div className="grid-3">
            <input className="form-input" type="number" value={birth.day}   onChange={e=>set("day",+e.target.value)}   placeholder="DD" min={1} max={31}/>
            <input className="form-input" type="number" value={birth.month} onChange={e=>set("month",+e.target.value)} placeholder="MM" min={1} max={12}/>
            <input className="form-input" type="number" value={birth.year}  onChange={e=>set("year",+e.target.value)}  placeholder="YYYY"/>
          </div>

          <label className="form-label">Birth Time</label>
          <div className="grid-3">
            <input className="form-input" type="number" value={birth.hour}   onChange={e=>set("hour",+e.target.value)}   placeholder="HH" min={0} max={23}/>
            <input className="form-input" type="number" value={birth.minute} onChange={e=>set("minute",+e.target.value)} placeholder="MM" min={0} max={59}/>
            <input className="form-input" type="number" value={birth.second} onChange={e=>set("second",+e.target.value)} placeholder="SS" min={0} max={59}/>
          </div>

          <label className="form-label">Place</label>
          <input className="form-input" value={birth.place||""} onChange={e=>set("place",e.target.value)} placeholder="City, Country"/>

          <label className="form-label">Latitude / Longitude</label>
          <div className="grid-2">
            <input className="form-input" type="number" step="0.0001" value={birth.latitude}  onChange={e=>set("latitude",+e.target.value)}  placeholder="Lat"/>
            <input className="form-input" type="number" step="0.0001" value={birth.longitude} onChange={e=>set("longitude",+e.target.value)} placeholder="Lon"/>
          </div>

          <label className="form-label">Timezone (IST = 5.5)</label>
          <input className="form-input" type="number" step="0.5" value={birth.timezone} onChange={e=>set("timezone",+e.target.value)}/>

          <div className="form-section-title" style={{marginTop:10}}>Quick Cities</div>
          <div className="grid-2">
            {CITIES.map(c=>(
              <button key={c.name} className="city-btn" onClick={()=>setBirth(b=>({...b,latitude:c.lat,longitude:c.lon,place:c.name}))}>
                {c.name}
              </button>
            ))}
          </div>

          <div className="form-section-title" style={{marginTop:10}}>Ayanamsa</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
            {Object.entries(AYANAMSA_LABELS_SI).map(([k,v])=>(
              <button key={k} className={`ayan-btn ${birth.ayanamsa===k?"active":""}`} onClick={()=>set("ayanamsa",k)}>
                {v.split(" ")[0]}
              </button>
            ))}
          </div>

          <button className="compute-btn" onClick={compute} disabled={loading}>
            {loading ? "⏳ Computing…" : "⊕ Compute Chart"}
          </button>

          {chart&&(
            <div className="sidebar-info">
              <div><span style={{color:"var(--text3)"}}>Lagna: </span><strong style={{color:"var(--gold)"}}>{chart.lagna.rashi}</strong></div>
              <div><span style={{color:"var(--text3)"}}>Nakshatra: </span>{chart.panchang.nakshatra}</div>
              <div><span style={{color:"var(--text3)"}}>Mahadasha: </span><strong style={{color:"var(--gold2)"}}>{chart.dasha?.current?.mahadasha}</strong></div>
              <div><span style={{color:"var(--text3)"}}>Ω: </span><span style={{color:omegaColor(chart.uedp.omega),fontFamily:"monospace"}}>{r4(chart.uedp.omega)}</span></div>
              {decisionalLoading&&<div style={{color:"var(--gold)",fontSize:10,fontFamily:"monospace",marginTop:4}}>⏳ Decisional engine running…</div>}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="main-content">
          <div className="tab-bar">
            {TABS.map(t=>(
              <button key={t.id} className={`tab-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="content-area">
            {error && <div className="status-err">⚠ {error}</div>}
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner"/>
                <div style={{color:"var(--gold)",fontFamily:"monospace",marginTop:12}}>⏳ Computing chart — VSOP87 corrected + UEDP v5…</div>
              </div>
            )}
            {!loading && !chart && !error && (
              <div className="empty-state">
                <div style={{fontSize:48,marginBottom:16}}>⊕</div>
                <div style={{fontSize:20,color:"var(--gold)",marginBottom:8}}>UEDP V5 Jyotisha Intelligence Engine</div>
                <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.8,maxWidth:500}}>
                  G S Ramesh Kumar — Universal Dynamics Emergence Protocol v5<br/>
                  Enter birth details and click <strong style={{color:"var(--gold)"}}>Compute Chart</strong>.<br/>
                  All {TABS.length} analytical tabs populate with complete Vedic + Decisional data.<br/>
                  <span style={{fontSize:11,color:"var(--text3)"}}>Surya Siddhanta · BPHS · Phaladeepika · Muhurta Chintamani · Atharva Veda · UEDP v5</span>
                </div>
              </div>
            )}
            {!loading && chart && renderTab()}
          </div>
        </main>
      </div>
    </>
  );
}
