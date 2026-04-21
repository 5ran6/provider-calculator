/* eslint-disable react/prop-types, react-hooks/exhaustive-deps */
import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Target, Zap, Calculator } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";

export default function LiquidityAdvisor() {
  const [margin, setMargin] = useState(20);
  const [buyRate, setBuyRate] = useState(1487.84);
  const [constantFee, setConstantFee] = useState(45);
  const [percentFee, setPercentFee] = useState(0.5);
  const [testAmount, setTestAmount] = useState(100);

  // Core profit formula: Profit = (USDT × Margin) − ConstantFee − (BuyRate × USDT × PercentFee)
  const calcProfit = (usdt) => {
    const gross = usdt * margin;
    const fees = constantFee + (buyRate * usdt * percentFee / 100);
    return gross - fees;
  };

  const calcNetMarginPct = (usdt) => {
    if (usdt === 0) return 0;
    const profit = calcProfit(usdt);
    const revenue = usdt * buyRate;
    return (profit / revenue) * 100;
  };

  // Break-even: solve (USDT × margin) − constantFee − (buyRate × USDT × percentFee/100) = 0
  // USDT × (margin − buyRate × percentFee/100) = constantFee
  const breakEven = useMemo(() => {
    const denominator = margin - (buyRate * percentFee / 100);
    if (denominator <= 0) return Infinity;
    return constantFee / denominator;
  }, [margin, buyRate, percentFee, constantFee]);

  // Recommended minimum payout — padded above break-even for buffer
  const recommendedMin = useMemo(() => {
    if (!isFinite(breakEven)) return null;
    // Add 40% buffer above break-even to ensure meaningful profit, rounded up to clean number
    const buffered = breakEven * 1.4;
    if (buffered < 5) return 5;
    if (buffered < 10) return 10;
    if (buffered < 25) return 25;
    return Math.ceil(buffered / 5) * 5;
  }, [breakEven]);

  // Safe minimum (small positive profit guaranteed)
  const safeMin = useMemo(() => {
    if (!isFinite(breakEven)) return null;
    return Math.ceil(breakEven * 1.1);
  }, [breakEven]);

  // Sweet spot — where net margin flattens (returns diminishing)
  const sweetSpot = useMemo(() => {
    if (!isFinite(breakEven)) return 100;
    // Net margin approaches asymptote at (margin/buyRate - percentFee/100). Find USDT where we hit 95% of asymptote.
    const asymptoteNetPct = (margin / buyRate) * 100 - percentFee;
    const target = asymptoteNetPct * 0.95;
    // Binary search
    let lo = breakEven, hi = 10000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (calcNetMarginPct(mid) < target) lo = mid;
      else hi = mid;
    }
    return Math.round(hi / 5) * 5;
  }, [margin, buyRate, percentFee, constantFee]);

  // Chart data across a spectrum of transaction sizes
  const chartData = useMemo(() => {
    const points = [0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 25, 35, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
    return points.map((u) => ({
      usdt: u,
      profit: parseFloat(calcProfit(u).toFixed(2)),
      netMargin: parseFloat(calcNetMarginPct(u).toFixed(3)),
    }));
  }, [margin, buyRate, constantFee, percentFee]);

  // Tier breakdown
  const tiers = useMemo(() => {
    const buckets = [
      { label: "Small", range: "5–25 USDT", samples: [5, 10, 25] },
      { label: "Medium", range: "50–250 USDT", samples: [50, 100, 250] },
      { label: "Large", range: "500–1,500 USDT", samples: [500, 1000, 1500] },
    ];
    return buckets.map((b) => ({
      ...b,
      minProfit: Math.min(...b.samples.map(calcProfit)),
      maxProfit: Math.max(...b.samples.map(calcProfit)),
      avgMargin: b.samples.reduce((s, u) => s + calcNetMarginPct(u), 0) / b.samples.length,
    }));
  }, [margin, buyRate, constantFee, percentFee]);

  const testProfit = calcProfit(testAmount);
  const testNetMargin = calcNetMarginPct(testAmount);
  const testProfitable = testProfit > 0;

  const fmt = (n) => new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: "'Instrument Serif', 'Georgia', serif" }}>
      <style>{`
        .mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; }
        .sans { font-family: 'Inter', sans-serif; }
        .serif { font-family: 'Instrument Serif', Georgia, serif; }
        .grain { position: relative; }
        .grain::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.5;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-stone-900 bg-stone-50 grain">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-stone-900 text-amber-300 flex items-center justify-center mono text-sm font-bold">LP</div>
            <div>
              <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-500">Liquidity Provider Desk</div>
              <div className="serif text-xl leading-none">Profitability Advisor</div>
            </div>
          </div>
          <div className="sans text-xs text-stone-600 flex items-center gap-4">
            <span className="mono">USDT → NGN</span>
            <span className="w-px h-4 bg-stone-300"></span>
            <span>Live Model</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-6">
        
        {/* LEFT — Inputs */}
        <aside className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-white border border-stone-900 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Step 01</div>
                <h2 className="serif text-2xl">Your Parameters</h2>
              </div>
              <Calculator className="w-5 h-5 text-stone-400" />
            </div>

            <div className="space-y-4">
              <ParamInput label="Margin per USDT" unit="NGN" value={margin} onChange={setMargin} step={0.5} hint="Your spread: sell rate − buy rate" />
              <ParamInput label="Buy Rate" unit="NGN/USDT" value={buyRate} onChange={setBuyRate} step={0.01} hint="What you pay to acquire USDT" />
              <ParamInput label="Constant Fee" unit="NGN" value={constantFee} onChange={setConstantFee} step={1} hint="Fixed processing cost per transaction" />
              <ParamInput label="Percentage Fee" unit="%" value={percentFee} onChange={setPercentFee} step={0.05} hint="Variable fee on transaction value" />
            </div>

            <div className="mt-5 pt-5 border-t border-stone-200">
              <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-2">Implied sell rate</div>
              <div className="mono text-2xl">{fmt(buyRate + margin)} <span className="text-sm text-stone-500">NGN/USDT</span></div>
            </div>
          </div>

          {/* Test calculator */}
          <div className="bg-stone-900 text-stone-100 p-6">
            <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-1">Step 02</div>
            <h2 className="serif text-2xl mb-4">Test a Transaction</h2>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-transparent border border-stone-700 px-3 py-2 mono text-lg focus:outline-none focus:border-amber-300"
              />
              <span className="mono text-xs text-stone-400">USDT</span>
            </div>
            <div className="space-y-2 mono text-sm">
              <div className="flex justify-between py-1">
                <span className="text-stone-400">Gross revenue</span>
                <span>{fmt(testAmount * margin)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-400">− Constant fee</span>
                <span>{fmt(constantFee)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-400">− {percentFee}% fee</span>
                <span>{fmt(buyRate * testAmount * percentFee / 100)}</span>
              </div>
              <div className={`flex justify-between pt-3 mt-2 border-t border-stone-700 text-lg ${testProfitable ? 'text-amber-300' : 'text-red-400'}`}>
                <span className="serif italic">Net profit</span>
                <span>{testProfit >= 0 ? '+' : ''}{fmt(testProfit)} NGN</span>
              </div>
              <div className="flex justify-between text-xs text-stone-400">
                <span>Net margin</span>
                <span>{testNetMargin.toFixed(3)}%</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — Recommendations & Chart */}
        <main className="col-span-12 lg:col-span-8 space-y-5">
          
          {/* Hero recommendation card */}
          <div className="bg-amber-300 border border-stone-900 p-8 relative overflow-hidden grain">
            <div className="absolute top-0 right-0 mono text-[140px] leading-none text-stone-900/5 select-none pointer-events-none">
              {isFinite(breakEven) ? breakEven.toFixed(1) : '∞'}
            </div>
            <div className="relative">
              <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-800 mb-2 flex items-center gap-2">
                <Target className="w-3 h-3" /> Primary Recommendation
              </div>
              <h1 className="serif text-5xl lg:text-6xl leading-[0.95] mb-4">
                Set your minimum<br/>
                payout at <em className="italic">{recommendedMin ?? '—'} USDT</em>
              </h1>
              <p className="sans text-sm text-stone-800 max-w-xl leading-relaxed">
                Break-even sits at <span className="mono font-semibold">{isFinite(breakEven) ? breakEven.toFixed(2) : '—'} USDT</span>. We&rsquo;ve added a safety buffer so every accepted order clears costs and delivers meaningful profit — not just a technical positive.
              </p>
            </div>
          </div>

          {/* Three recommendation tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RecTile
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Do not accept below"
              value={isFinite(breakEven) ? `${breakEven.toFixed(2)}` : '∞'}
              unit="USDT"
              caption="Break-even — losses below this line"
              tone="danger"
            />
            <RecTile
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Safe minimum"
              value={safeMin ?? '—'}
              unit="USDT"
              caption="10% buffer — thin but reliable profit"
              tone="neutral"
            />
            <RecTile
              icon={<Zap className="w-4 h-4" />}
              label="Sweet spot"
              value={`≥${sweetSpot}`}
              unit="USDT"
              caption="Net margin reaches ~95% of its ceiling"
              tone="success"
            />
          </div>

          {/* Profit curve chart */}
          <div className="bg-white border border-stone-900 p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-500">Profit Curve</div>
                <h3 className="serif text-2xl">Where your money lives</h3>
              </div>
              <div className="sans text-xs text-stone-500">NGN profit vs. transaction size</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c1917" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#1c1917" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#e7e5e4" />
                  <XAxis
                    dataKey="usdt"
                    scale="log"
                    domain={[0.5, 2000]}
                    type="number"
                    ticks={[1, 5, 10, 50, 100, 500, 1000]}
                    stroke="#78716c"
                    style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    label={{ value: 'USDT (log scale)', position: 'insideBottom', offset: -10, fontSize: 11, fontFamily: 'Inter' }}
                  />
                  <YAxis stroke="#78716c" style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'JetBrains Mono', fontSize: 12, border: '1px solid #1c1917', borderRadius: 0, background: '#fff' }}
                    formatter={(v) => [`${fmt(v)} NGN`, 'Profit']}
                    labelFormatter={(v) => `${v} USDT`}
                  />
                  <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
                  {isFinite(breakEven) && <ReferenceLine x={breakEven} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'break-even', fontSize: 10, fill: '#dc2626', fontFamily: 'Inter' }} />}
                  <Area type="monotone" dataKey="profit" stroke="#1c1917" strokeWidth={2} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier table */}
          <div className="bg-white border border-stone-900 p-6">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="sans text-[10px] uppercase tracking-[0.2em] text-stone-500">Transaction Tiers</div>
                <h3 className="serif text-2xl">Where the profit pools</h3>
              </div>
            </div>
            <div className="space-y-3">
              {tiers.map((t, i) => (
                <div key={t.label} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-stone-200 last:border-0">
                  <div className="col-span-3">
                    <div className="mono text-[10px] text-stone-400">0{i+1}</div>
                    <div className="serif text-xl">{t.label}</div>
                    <div className="sans text-xs text-stone-500">{t.range}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="sans text-[10px] uppercase tracking-wider text-stone-500 mb-1">Profit range</div>
                    <div className="mono text-sm">{fmt(t.minProfit)} → {fmt(t.maxProfit)} <span className="text-stone-400">NGN</span></div>
                  </div>
                  <div className="col-span-3">
                    <div className="sans text-[10px] uppercase tracking-wider text-stone-500 mb-1">Avg. margin</div>
                    <div className="mono text-sm">{t.avgMargin.toFixed(3)}%</div>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <div className="h-2 w-full bg-stone-100 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-stone-900" style={{ width: `${Math.min(100, (t.avgMargin / 1) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advisory notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdvisoryCard
              number="01"
              title="Raise your floor, not your ceiling"
              body={`Accepting sub-${Math.ceil(breakEven)} USDT trades costs you real money. Every transaction below break-even erases profit from a larger trade you&apos;ve already done.`}
            />
            <AdvisoryCard
              number="02"
              title="Volume beats optimization"
              body={`Net margin plateaus near ${((margin/buyRate)*100 - percentFee).toFixed(3)}%. Past the sweet spot, chasing bigger trades pays more than fine-tuning your spread.`}
            />
            <AdvisoryCard
              number="03"
              title="Your margin is the lever"
              body={`Every 1 NGN added to margin raises your asymptotic net by ~${(100/buyRate).toFixed(4)}%. Model rate competitors before adjusting.`}
            />
            <AdvisoryCard
              number="04"
              title="Fixed fees punish small trades"
              body={`The ${constantFee} NGN constant fee is ${((constantFee/(margin*breakEven))*100).toFixed(0)}% of gross on a break-even trade. Negotiate this down before raising minimums further.`}
            />
          </div>

          <footer className="pt-4 border-t border-stone-300 sans text-xs text-stone-500 flex justify-between">
            <span>Formula: <span className="mono">Profit = (USDT × Margin) − ConstantFee − (BuyRate × USDT × PercentFee%)</span></span>
            <span className="mono">v1.0</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ParamInput({ label, unit, value, onChange, step, hint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="sans text-xs font-medium text-stone-700">{label}</label>
        <span className="mono text-[10px] text-stone-400 uppercase">{unit}</span>
      </div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-stone-50 border border-stone-300 px-3 py-2 mono text-base focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
      />
      <div className="sans text-[10px] text-stone-500 mt-1">{hint}</div>
    </div>
  );
}

function RecTile({ icon, label, value, unit, caption, tone }) {
  const tones = {
    danger: "bg-white border-red-600",
    neutral: "bg-white border-stone-900",
    success: "bg-stone-900 text-stone-100 border-stone-900",
  };
  const labelColor = tone === 'success' ? 'text-stone-400' : 'text-stone-500';
  const captionColor = tone === 'success' ? 'text-stone-400' : 'text-stone-600';
  return (
    <div className={`border p-5 ${tones[tone]}`}>
      <div className={`flex items-center gap-2 sans text-[10px] uppercase tracking-[0.15em] ${labelColor} mb-3`}>
        {icon} {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="serif text-4xl leading-none">{value}</span>
        <span className="mono text-xs opacity-60">{unit}</span>
      </div>
      <div className={`sans text-xs mt-2 leading-snug ${captionColor}`}>{caption}</div>
    </div>
  );
}

function AdvisoryCard({ number, title, body }) {
  return (
    <div className="bg-white border border-stone-300 p-5">
      <div className="mono text-xs text-stone-400 mb-2">{number}</div>
      <h4 className="serif text-xl mb-2 leading-tight">{title}</h4>
      <p className="sans text-xs text-stone-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: body }}></p>
    </div>
  );
}
