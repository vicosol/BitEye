// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, AlertCircle } from 'lucide-react';

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
  market_cap_rank: number;
}

export default function BitEyeScanner() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const thresholds = {
    '1h': 5,
    '24h': 15,
    '7d': 40
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch Page 1 (1–250)
      const page1 = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
            price_change_percentage: '1h,24h,7d',
            sparkline: false,
            locale: 'en'
          },
          timeout: 10000
        }
      );

      // Fetch Page 2 (251–500)
      const page2 = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: 2,
            price_change_percentage: '1h,24h,7d',
            sparkline: false,
            locale: 'en'
          },
          timeout: 10000
        }
      );

      // Combine and sort by market cap rank
      const allCoins = [...page1.data, ...page2.data]
        .sort((a: Coin, b: Coin) => a.market_cap_rank - b.market_cap_rank);

      setCoins(allCoins);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err: any) {
      setError('Failed to fetch data. Retrying...');
      setLoading(false);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const getChangeClass = (change: number | null, timeframe: '1h' | '24h' | '7d') => {
    if (!change) return 'text-gray-400';
    const threshold = thresholds[timeframe];
    const abs = Math.abs(change);
    if (abs >= threshold) {
      return change > 0 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-100 text-red-800 font-bold';
    }
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">BitEye Scanner</h1>
                <p className="text-gray-600 mt-1">Real-time crypto momentum tracker</p>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdate && (
                  <div className="text-sm text-gray-500">
                    Last update: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">1h %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">24h %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">7d %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Loading 500 coins...
                        </div>
                      </td>
                    </tr>
                  ) : (
                    coins.map((coin) => (
                      <tr key={coin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{coin.market_cap_rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-200 border-2 border-dashed rounded-full" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{coin.name}</div>
                              <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {formatPrice(coin.current_price)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${getChangeClass(coin.price_change_percentage_1h_in_currency, '1h')}`}>
                          {coin.price_change_percentage_1h_in_currency?.toFixed(2) ?? '-'}%
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${getChangeClass(coin.price_change_percentage_24h_in_currency, '24h')}`}>
                          {coin.price_change_percentage_24h_in_currency?.toFixed(2) ?? '-'}%
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${getChangeClass(coin.price_change_percentage_7d_in_currency, '7d')}`}>
                          {coin.price_change_percentage_7d_in_currency?.toFixed(2) ?? '-'}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {formatMarketCap(coin.market_cap)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {formatMarketCap(coin.total_volume)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            Data from CoinGecko • Updates every 60 seconds • Top 500 by market cap
          </div>
        </div>
      </div>
    </>
  );
}