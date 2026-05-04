/* eslint-disable react/prop-types, react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Target, Zap, Calculator, ArrowDownUp } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";

// Per-currency sensible defaults — rates are approximate USDT mid-market values
// for early 2026. Margin / fees scaled so each profile resembles a realistic LP setup.
const CURRENCIES = {
  NGN: { name: "Nigerian Naira",   flag: "🇳🇬", rate: 1487.84, margin: 20,   constantFee: 45,  aggFee: 0.5, pspFee: 0.3, pspFixed: 30   },
  KES: { name: "Kenyan Shilling",  flag: "🇰🇪", rate: 130.00,  margin: 1.75, constantFee: 4,   aggFee: 0.5, pspFee: 0.3, pspFixed: 2.5  },
  UGX: { name: "Ugandan Shilling", flag: "🇺🇬", rate: 3800,    margin: 50,   constantFee: 110, aggFee: 0.5, pspFee: 0.3, pspFixed: 75   },
  TZS: { name: "Tanzanian Shilling",flag:"🇹🇿", rate: 2700,    margin: 36,   constantFee: 80,  aggFee: 0.5, pspFee: 0.3, pspFixed: 55   },
  MWK: { name: "Malawian Kwacha",  flag: "🇲🇼", rate: 1750,    margin: 23,   constantFee: 50,  aggFee: 0.5, pspFee: 0.3, pspFixed: 35   },
  BRL: { name: "Brazilian Real",   flag: "🇧🇷", rate: 5.20,    margin: 0.07, constantFee: 0.15,aggFee: 0.5, pspFee: 0.3, pspFixed: 0.10 },
};

export default function LiquidityAdvisor() {
  const [currency, setCurrency] = useState("NGN");
  const [direction, setDirection] = useState("sell"); // "sell" = LP buys USDT, pays fiat; "buy" = LP sells USDT, receives fiat
  const [margin, setMargin] = useState(CURRENCIES.NGN.margin);
  const [rate, setRate] = useState(CURRENCIES.NGN.rate);
  const [constantFee, setConstantFee] = useState(CURRENCIES.NGN.constantFee);
  const [aggFee, setAggFee] = useState(CURRENCIES.NGN.aggFee);
  const [pspFee, setPspFee] = useState(CURRENCIES.NGN.pspFee);
  const [pspFixed, setPspFixed] = useState(CURRENCIES.NGN.pspFixed);
  const [testAmount, setTestAmount] = useState(100);

  // Reset all parameters when currency changes
  useEffect(() => {
    const c = CURRENCIES[currency];
    setRate(c.rate);
    setMargin(c.margin);
    setConstantFee(c.constantFee);
    setAggFee(c.aggFee);
    setPspFee(c.pspFee);
    setPspFixed(c.pspFixed);
  }, [currency]);

  const totalPercentFee = aggFee + pspFee;
  const totalFixedFee = constantFee + pspFixed;
  const isSell = direction === "sell";
  const rateLabel = isSell ? "Buy rate" : "Sell rate";
  const rateHint = isSell ? "What you pay to acquire USDT" : "What you charge to release USDT";
  const impliedLabel = isSell ? "Implied sell rate" : "Implied buy rate";
  const impliedRate = isSell ? rate + margin : rate - margin;
  const flowLabel = isSell ? `USDT → ${currency}` : `${currency} → USDT`;

  // Profit = (USDT × Margin) − ConstantFee − PSPFixedFee − (Rate × USDT × (AggFee + PSPFee)/100)
  const calcProfit = (usdt) => {
    const gross = usdt * margin;
    const fees = totalFixedFee + (rate * usdt * totalPercentFee / 100);
    return gross - fees;
  };

  const calcNetMarginPct = (usdt) => {
    if (usdt === 0) return 0;
    const profit = calcProfit(usdt);
    const revenue = usdt * rate;
    return (profit / revenue) * 100;
  };

  // Break-even: USDT × (margin − rate × totalPct/100) = totalFixed
  const breakEven = useMemo(() => {
    const denominator = margin - (rate * totalPercentFee / 100);
    if (denominator <= 0) return Infinity;
    return totalFixedFee / denominator;
  }, [margin, rate, totalPercentFee, totalFixedFee]);

  const recommendedMin = useMemo(() => {
    if (!isFinite(breakEven)) return null;
    const buffered = breakEven * 1.4;
    if (buffered < 5) return 5;
    if (buffered < 10) return 10;
    if (buffered < 25) return 25;
    return Math.ceil(buffered / 5) * 5;
  }, [breakEven]);

  const safeMin = useMemo(() => {
    if (!isFinite(breakEven)) return null;
    return Math.ceil(breakEven * 1.1);
  }, [breakEven]);

  const sweetSpot = useMemo(() => {
    if (!isFinite(breakEven)) return 100;
    const asymptoteNetPct = (margin / rate) * 100 - totalPercentFee;
    const target = asymptoteNetPct * 0.95;
    let lo = breakEven, hi = 10000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (calcNetMarginPct(mid) < target) lo = mid;
      else hi = mid;
    }
    return Math.round(hi / 5) * 5;
  }, [margin, rate, totalPercentFee, totalFixedFee]);

  const chartData = useMemo(() => {
    const points = [0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 25, 35, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
    return points.map((u) => ({
      usdt: u,
      profit: parseFloat(calcProfit(u).toFixed(4)),
      netMargin: parseFloat(calcNetMarginPct(u).toFixed(3)),
    }));
  }, [margin, rate, constantFee, pspFixed, aggFee, pspFee]);

  const tiers = useMemo(() => {
    const buckets = [
      { label: "Small",  range: "5–25 USDT",       samples: [5, 10, 25] },
      { label: "Medium", range: "50–250 USDT",     samples: [50, 100, 250] },
      { label: "Large",  range: "500–1,500 USDT",  samples: [500, 1000, 1500] },
    ];
    return buckets.map((b) => ({
      ...b,
      minProfit: Math.min(...b.samples.map(calcProfit)),
      maxProfit: Math.max(...b.samples.map(calcProfit)),
      avgMargin: b.samples.reduce((s, u) => s + calcNetMarginPct(u), 0) / b.samples.length,
    }));
  }, [margin, rate, constantFee, pspFixed, aggFee, pspFee]);

  const testProfit = calcProfit(testAmount);
  const testNetMargin = calcNetMarginPct(testAmount);
  const testProfitable = testProfit > 0;

  // BRL has tiny per-USDT values; show 4 decimals. Others use 2.
  const decimals = currency === "BRL" ? 4 : 2;
  const fmt = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 2 }).format(n);
  const fmtCompact = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);

  // Adapt input step to currency magnitude
  const stepRate    = currency === "BRL" ? 0.01 : currency === "KES" ? 0.05 : 0.01;
  const stepMargin  = currency === "BRL" ? 0.005 : currency === "KES" ? 0.05 : 0.5;
  const stepFixed   = currency === "BRL" ? 0.05 : currency === "KES" ? 0.5  : 1;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-royal-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">P</div>
            <div className="leading-tight">
              <div className="text-xs font-medium text-gray-500">Paycrest · LP Earnings</div>
              <div className="text-base font-semibold text-gray-900">Profitability Calculator</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CurrencySelect value={currency} onChange={setCurrency} />
            <DirectionToggle value={direction} onChange={setDirection} />
            <span className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-medium tabular text-gray-700">
              <span className="w-1.5 h-1.5 rounded-2xl bg-royal-500"></span>
              {flowLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-6">

        {/* LEFT — Inputs */}
        <aside className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs font-medium text-gray-400 mb-1">Step 01</div>
                <h2 className="text-xl font-semibold text-gray-900">Your parameters</h2>
              </div>
              <div className="w-9 h-9 rounded-md bg-royal-50 text-royal-500 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rate &amp; spread</div>
                <div className="space-y-4">
                  <ParamInput label="Margin per USDT" unit={currency} value={margin} onChange={setMargin} step={stepMargin} hint="Your spread: sell rate minus buy rate" />
                  <ParamInput label={rateLabel} unit={`${currency}/USDT`} value={rate} onChange={setRate} step={stepRate} hint={rateHint} />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fees</div>
                <div className="space-y-4">
                  <ParamInput label="Constant fee" unit={currency} value={constantFee} onChange={setConstantFee} step={stepFixed} hint="Fixed processing cost per transaction" />
                  <ParamInput label="Aggregator fee" unit="%" value={aggFee} onChange={setAggFee} step={0.05} hint="Variable fee charged by the aggregator" />
                  <ParamInput label="PSP percentage fee" unit="%" value={pspFee} onChange={setPspFee} step={0.05} hint="Variable fee charged by your payment service provider" />
                  <ParamInput label="PSP fixed fee" unit={currency} value={pspFixed} onChange={setPspFixed} step={stepFixed} hint="Flat per-transaction PSP cost" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-1">{impliedLabel}</div>
              <div className="text-2xl font-semibold tabular text-gray-900">
                {fmt(impliedRate)}
                <span className="text-sm font-normal text-gray-500 ml-1.5">{currency}/USDT</span>
              </div>
            </div>
          </div>

          {/* Test calculator */}
          <div className="bg-gray-900 text-white rounded-lg shadow-md p-6">
            <div className="text-xs font-medium text-gray-400 mb-1">Step 02</div>
            <h2 className="text-xl font-semibold mb-4">Test a transaction</h2>
            <div className="flex items-stretch gap-2 mb-5">
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                aria-label="Transaction size in USDT"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2.5 text-base font-medium tabular text-white placeholder-gray-500 focus-visible:outline-none focus-visible:border-royal-400 focus-visible:shadow-focus-royal transition-shadow"
              />
              <span className="inline-flex items-center px-3 rounded-md bg-gray-800 text-xs font-medium text-gray-400">USDT</span>
            </div>
            <div className="space-y-2 text-sm tabular">
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Gross revenue</span>
                <span className="font-medium">{fmt(testAmount * margin)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">− Constant fee</span>
                <span className="font-medium">{fmt(constantFee)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">− PSP fixed fee</span>
                <span className="font-medium">{fmt(pspFixed)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">− Aggregator {aggFee}% fee</span>
                <span className="font-medium">{fmt(rate * testAmount * aggFee / 100)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">− PSP {pspFee}% fee</span>
                <span className="font-medium">{fmt(rate * testAmount * pspFee / 100)}</span>
              </div>
              <div className={`flex justify-between items-baseline pt-3 mt-2 border-t border-gray-700 ${testProfitable ? 'text-royal-300' : 'text-danger-400'}`}>
                <span className="text-sm font-medium">Net profit</span>
                <span className="text-lg font-semibold">{testProfit >= 0 ? '+' : ''}{fmt(testProfit)} {currency}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Net margin</span>
                <span className="font-medium">{testNetMargin.toFixed(3)}%</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — Recommendations & Chart */}
        <main className="col-span-12 lg:col-span-8 space-y-5">

          {/* Hero recommendation card */}
          <div className="relative overflow-hidden rounded-lg shadow-md p-8 lg:p-10 bg-royal-500 text-white">
            <div aria-hidden="true" className="absolute -top-10 -right-10 w-64 h-64 rounded-3xl bg-royal-400 opacity-30 blur-3xl pointer-events-none"></div>
            <div className="absolute top-6 right-6 hidden md:block text-[140px] leading-none font-bold text-white/10 select-none pointer-events-none tabular">
              {isFinite(breakEven) ? breakEven.toFixed(1) : '∞'}
            </div>
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/15 text-xs font-medium mb-5">
                <Target className="w-3.5 h-3.5" /> Primary recommendation · {isSell ? "Sell direction" : "Buy direction"}
              </div>
              <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-4">
                Set your minimum payout at <span className="tabular">{recommendedMin ?? '—'}</span> USDT.
              </h1>
              <p className="text-base text-royal-50/95 leading-relaxed">
                Break-even sits at <span className="font-semibold tabular">{isFinite(breakEven) ? breakEven.toFixed(2) : '—'} USDT</span> for {currency}. We&rsquo;ve added a safety buffer so every accepted order clears costs and delivers meaningful profit — not just a technical positive.
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
              caption="Break-even — losses occur below this line"
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
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="text-xs font-medium text-gray-500">Profit curve</div>
                <h3 className="text-xl font-semibold text-gray-900">Where your money lives</h3>
              </div>
              <div className="text-xs text-gray-500">{currency} profit vs. transaction size</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0065F5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0065F5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EBEBEF" />
                  <XAxis
                    dataKey="usdt"
                    scale="log"
                    domain={[0.5, 2000]}
                    type="number"
                    ticks={[1, 5, 10, 50, 100, 500, 1000]}
                    stroke="#8A8AA3"
                    style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                    label={{ value: 'USDT (log scale)', position: 'insideBottom', offset: -10, fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#6C6C89' }}
                  />
                  <YAxis stroke="#8A8AA3" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 12, border: '1px solid #EBEBEF', borderRadius: 8, background: '#fff', boxShadow: '0 4px 6px rgba(18,18,23,0.05), 0 10px 15px rgba(18,18,23,0.08)' }}
                    formatter={(v) => [`${fmt(v)} ${currency}`, 'Profit']}
                    labelFormatter={(v) => `${v} USDT`}
                  />
                  <ReferenceLine y={0} stroke="#F53D6B" strokeDasharray="4 4" strokeWidth={1.5} />
                  {isFinite(breakEven) && <ReferenceLine x={breakEven} stroke="#F53D6B" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'break-even', fontSize: 10, fill: '#F53D6B', fontFamily: 'Inter, sans-serif' }} />}
                  <Area type="monotone" dataKey="profit" stroke="#0065F5" strokeWidth={2.5} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier table */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="text-xs font-medium text-gray-500">Transaction tiers</div>
                <h3 className="text-xl font-semibold text-gray-900">Where the profit pools</h3>
              </div>
            </div>
            <div className="space-y-1">
              {tiers.map((t, i) => (
                <div key={t.label} className="grid grid-cols-12 gap-4 items-center py-4 border-b border-gray-100 last:border-0">
                  <div className="col-span-12 md:col-span-3">
                    <div className="text-xs font-medium tabular text-gray-400">0{i+1}</div>
                    <div className="text-lg font-semibold text-gray-900">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.range}</div>
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <div className="text-xs font-medium text-gray-500 mb-1">Profit range</div>
                    <div className="text-sm font-medium tabular text-gray-900">{fmt(t.minProfit)} → {fmt(t.maxProfit)} <span className="text-gray-400 font-normal">{currency}</span></div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Avg. margin</div>
                    <div className="text-sm font-medium tabular text-gray-900">{t.avgMargin.toFixed(3)}%</div>
                  </div>
                  <div className="col-span-12 md:col-span-2 flex justify-end">
                    <div className="h-2 w-full rounded-2xl bg-gray-100 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-2xl bg-royal-500" style={{ width: `${Math.min(100, (t.avgMargin / 1) * 100)}%` }}></div>
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
              body={`Accepting sub-${fmtCompact(Math.ceil(breakEven))} USDT trades costs you real money. Every transaction below break-even erases profit from a larger trade you've already completed.`}
            />
            <AdvisoryCard
              number="02"
              title="Volume beats optimization"
              body={`Net margin plateaus near ${((margin/rate)*100 - totalPercentFee).toFixed(3)}%. Past the sweet spot, chasing bigger trades pays more than fine-tuning your spread.`}
            />
            <AdvisoryCard
              number="03"
              title="Stack the percentage fees"
              body={`Aggregator + PSP percentage fees combine to ${totalPercentFee.toFixed(2)}% of trade value — that's ${(rate * totalPercentFee / 100).toFixed(2)} ${currency} drained per USDT. Negotiate whichever is higher first.`}
            />
            <AdvisoryCard
              number="04"
              title="Fixed fees punish small trades"
              body={`Constant + PSP fixed fees total ${fmt(totalFixedFee)} ${currency}. On a break-even trade that's ${((totalFixedFee/(margin*breakEven))*100).toFixed(0)}% of gross revenue. Worth the conversation with both providers.`}
            />
          </div>

          <footer className="pt-5 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap gap-2 justify-between">
            <span>Formula: <span className="tabular text-gray-700">Profit = (USDT × Margin) − FixedFees − (Rate × USDT × TotalPct%)</span></span>
            <span className="tabular text-gray-400">v1.1 · {currency}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function CurrencySelect({ value, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Fiat currency</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-md pl-3 pr-9 py-2 text-sm font-medium text-gray-900 hover:border-gray-300 focus-visible:outline-none focus-visible:border-royal-500 focus-visible:shadow-focus-royal transition-shadow cursor-pointer"
      >
        {Object.entries(CURRENCIES).map(([code, c]) => (
          <option key={code} value={code}>{c.flag} {code} · {c.name}</option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 text-gray-400 text-xs">▾</span>
    </label>
  );
}

function DirectionToggle({ value, onChange }) {
  const opts = [
    { id: "sell", label: "Sell" },
    { id: "buy",  label: "Buy"  },
  ];
  return (
    <div role="radiogroup" aria-label="Trade direction" className="inline-flex items-center bg-gray-100 rounded-md p-1">
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:shadow-focus-royal ${
              active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {o.id === "sell" && <ArrowDownUp className="w-3 h-3" />}
            {o.label} USDT
          </button>
        );
      })}
    </div>
  );
}

function ParamInput({ label, unit, value, onChange, step, hint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs font-medium text-gray-400">{unit}</span>
      </div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-base font-medium tabular text-gray-900 hover:border-gray-300 focus-visible:outline-none focus-visible:border-royal-500 focus-visible:shadow-focus-royal transition-shadow"
      />
      <div className="text-xs text-gray-500 mt-1.5">{hint}</div>
    </div>
  );
}

function RecTile({ icon, label, value, unit, caption, tone }) {
  const tones = {
    danger: {
      card: "bg-white border border-danger-100",
      iconWrap: "bg-danger-50 text-danger-600",
      label: "text-gray-500",
      value: "text-gray-900",
      unit: "text-gray-400",
      caption: "text-gray-500",
    },
    neutral: {
      card: "bg-white border border-gray-100",
      iconWrap: "bg-gray-50 text-gray-700",
      label: "text-gray-500",
      value: "text-gray-900",
      unit: "text-gray-400",
      caption: "text-gray-500",
    },
    success: {
      card: "bg-royal-500 border border-royal-500",
      iconWrap: "bg-white/15 text-white",
      label: "text-royal-100",
      value: "text-white",
      unit: "text-royal-200",
      caption: "text-royal-50/90",
    },
  };
  const t = tones[tone];
  return (
    <div className={`rounded-lg shadow-sm p-5 ${t.card}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-7 h-7 rounded-md flex items-center justify-center ${t.iconWrap}`}>{icon}</span>
        <span className={`text-xs font-medium ${t.label}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-semibold tracking-tight tabular ${t.value}`}>{value}</span>
        <span className={`text-xs font-medium ${t.unit}`}>{unit}</span>
      </div>
      <div className={`text-xs mt-2 leading-snug ${t.caption}`}>{caption}</div>
    </div>
  );
}

function AdvisoryCard({ number, title, body }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-5">
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-royal-50 text-royal-600 text-xs font-semibold tabular mb-3">{number}</div>
      <h4 className="text-base font-semibold text-gray-900 mb-1.5 leading-tight">{title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}
