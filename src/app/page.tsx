// src/app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, AlertCircle, Volume2, VolumeX, Moon, Sun, ArrowUpDown } from 'lucide-react';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  sparkline_in_7d?: { price: number[] };
  price_change_15m: number | null;   // ← changed to null
  price_change_4h: number | null;    // ← changed to null
  market_cap_rank: number;
}

type SortKey = 'rank' | 'price' | '15m' | '1h' | '4h' | '24h' | '7d' | 'market_cap' | 'volume';
type SortOrder = 'asc' | 'desc';

export default function BitEyeScanner() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const defaultThresholds = { '15m': 3, '1h': 5, '4h': 10, '24h': 15, '7d': 40 };
  const [userThresholds, setUserThresholds] = useState(defaultThresholds);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [page1, page2] = await Promise.all([
        axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
            price_change_percentage: '1h,24h,7d',
            sparkline: true,
          },
          timeout: 15000,
        }),
        axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: 2,
            price_change_percentage: '1h,24h,7d',
            sparkline: true,
          },
          timeout: 15000,
        }),
      ]);

      const allCoins = [...page1.data, ...page2.data]
        .sort((a: any, b: any) => a.market_cap_rank - b.market_cap_rank)
        .map((coin: any) => {
          const prices = coin.sparkline_in_7d?.price || [];
          const nowPrice = coin.current_price;

          const price15mAgo = prices[prices.length - 15] || nowPrice;
          const price4hAgo = prices[prices.length - 34] || prices[prices.length - 30] || nowPrice;

          const change15m = price15mAgo > 0 ? ((nowPrice - price15mAgo) / price15mAgo) * 100 : null;
          const change4h = price4hAgo > 0 ? ((nowPrice - price4hAgo) / price4hAgo) * 100 : null;

          return {
            ...coin,
            price_change_15m: change15m !== null ? Number(change15m.toFixed(4)) : null,
            price_change_4h: change4h !== null ? Number(change4h.toFixed(4)) : null,
          };
        });

      setCoins(allCoins);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError('Failed to load data — retrying...');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedCoins = useMemo(() => {
    return [...coins].sort((a, b) => {
      let aVal: any = 0, bVal: any = 0;
      switch (sortKey) {
        case 'rank':       aVal = a.market_cap_rank; bVal = b.market_cap_rank; break;
        case 'price':      aVal = a.current_price; bVal = b.current_price; break;
        case '15m':        aVal = a.price_change_15m ?? -Infinity; bVal = b.price_change_15m ?? -Infinity; break;
        case '1h':         aVal = a.price_change_percentage_1h_in_currency ?? -Infinity; bVal = b.price_change_percentage_1h_in_currency ?? -Infinity; break;
        case '4h':         aVal = a.price_change_4h ?? -Infinity; bVal = b.price_change_4h ?? -Infinity; break;
        case '24h':        aVal = a.price_change_percentage_24h_in_currency ?? -Infinity; bVal = b.price_change_percentage_24h_in_currency ?? -Infinity; break;
        case '7d':         aVal = a.price_change_percentage_7d_in_currency ?? -Infinity; bVal = b.price_change_percentage_7d_in_currency ?? -Infinity; break;
        case 'market_cap': aVal = a.market_cap; bVal = b.market_cap; break;
        case 'volume':     aVal = a.total_volume; bVal = b.total_volume; break;
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [coins, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('desc'); }
  };

  const playAlert = () => {
    if (soundEnabled) {
      const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      audio.play().catch(() => {});
    }
  };

  useEffect(() => {
    const bigMove = coins.some(c =>
      (c.price_change_15m !== null && Math.abs(c.price_change_15m) >= userThresholds['15m']) ||
      (c.price_change_percentage_1h_in_currency !== null && Math.abs(c.price_change_percentage_1h_in_currency) >= userThresholds['1h']) ||
      (c.price_change_4h !== null && Math.abs(c.price_change_4h) >= userThresholds['4h'])
    );
    if (bigMove) playAlert();
  }, [coins, userThresholds, soundEnabled]);

  const formatPrice = (p: number) => p >= 1 ? `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${p.toFixed(p >= 0.01 ? 4 : 8)}`;
  const formatMarketCap = (c: number) => c >= 1e12 ? `$${(c / 1e12).toFixed(2)}T` : c >= 1e9 ? `$${(c / 1e9).toFixed(2)}B` : c >= 1e6 ? `$${(c / 1e6).toFixed(2)}M` : `$${c.toLocaleString()}`;

  const getChangeClass = (val: number | null, tf: keyof typeof defaultThresholds) => {
    if (val === null) return 'text-gray-400';
    const abs = Math.abs(val);
    const thresh = userThresholds[tf];
    if (abs >= thresh) return val > 0 ? 'bg-green-100 text-green-800 font-bold animate-pulse' : 'bg-red-100 text-red-800 font-bold animate-pulse';
    return val > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <>
      <div className={`min-h-screen p-4 transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-7xl mx-auto ${darkMode ? 'text-white' : 'text-black'}`}>
          <div className={`rounded-lg shadow-sm p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">BitEye Scanner</h1>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Pro momentum tracker — Sweden</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {lastUpdate && <div className="text-sm">Updated: {lastUpdate.toLocaleTimeString('sv-SE')}</div>}
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {(['15m', '1h', '4h', '24h', '7d'] as const).map(tf => (
                <div key={tf} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <label className="block font-medium">{tf} ≥</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={userThresholds[tf]}
                    onChange={e => setUserThresholds(p => ({ ...p, [tf]: +e.target.value }))}
                    className="w-full h-2 mt-1 rounded"
                  />
                  <span className="block text-center font-bold">{userThresholds[tf]}%</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 mb-6 rounded-lg bg-yellow-100 border border-yellow-300 dark:bg-yellow-900 dark:border-yellow-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          <div className={`rounded-lg shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b`}>
                  <tr>
                    {[
                      {key:'rank',label:'#'},{key:'name',label:'Coin'},{key:'price',label:'Price'},
                      {key:'15m',label:'15m %'},{key:'1h',label:'1h %'},{key:'4h',label:'4h %'},
                      {key:'24h',label:'24h %'},{key:'7d',label:'7d %'},{key:'market_cap',label:'MCap'},{key:'volume',label:'Vol'}
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.key !== 'name' && handleSort(col.key as SortKey)}
                        className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${col.key !== 'name' ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 select-none' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.key !== 'name' && sortKey === col.key && <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-16 text-center"><div className="flex items-center justify-center gap-2"><RefreshCw className="w-6 h-6 animate-spin" /> Loading 500 coins...</div></td></tr>
                  ) : (
                    sortedCoins.map(coin => (
                      <tr key={coin.id} className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                        <td className="px-4 py-3 text-sm font-medium">{coin.market_cap_rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-dashed" />
                            <div>
                              <div className="font-semibold">{coin.name}</div>
                              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{formatPrice(coin.current_price)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeClass(coin.price_change_15m, '15m')}`}>
                          {coin.price_change_15m !== null ? coin.price_change_15m.toFixed(2) : '-'}%
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeClass(coin.price_change_percentage_1h_in_currency, '1h')}`}>
                          {coin.price_change_percentage_1h_in_currency?.toFixed(2) ?? '-'}%
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeClass(coin.price_change_4h, '4h')}`}>
                          {coin.price_change_4h !== null ? coin.price_change_4h.toFixed(2) : '-'}%
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeClass(coin.price_change_percentage_24h_in_currency, '24h')}`}>
                          {coin.price_change_percentage_24h_in_currency?.toFixed(2) ?? '-'}%
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeClass(coin.price_change_percentage_7d_in_currency, '7d')}`}>
                          {coin.price_change_percentage_7d_in_currency?.toFixed(2) ?? '-'}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatMarketCap(coin.market_cap)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatMarketCap(coin.total_volume)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Data: CoinGecko • 15m & 4h live • Instant • Sweden
          </div>
        </div>
      </div>
    </>
  );
}