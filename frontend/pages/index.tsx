import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import PortfolioChart from '../components/PortfolioChart';
import StockChart from '../components/StockChart';
import { portfolioApi, stockApi } from '../utils/api';
import { Portfolio, Stock, Holding, Transaction, PortfolioHistory, HistoricalData } from '@shared/types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [scrollPositions, setScrollPositions] = useState<{[key: number]: number}>({});
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistory[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('2year');
  const [loading, setLoading] = useState(true);

  const handlePageChange = (page: number) => {
    setScrollPositions(prev => ({
      ...prev,
      [currentPage]: window.scrollY
    }));
    setCurrentPage(page);
  };

  useEffect(() => {
    const position = scrollPositions[currentPage] || 0;
    window.scrollTo(0, position);
  }, [currentPage, scrollPositions]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [portfolioData, stocksData, holdingsData, transactionsData, historyData] = await Promise.all([
          portfolioApi.get(),
          stockApi.getAll(),
          portfolioApi.getHoldings(),
          portfolioApi.getTransactions(),
          portfolioApi.getHistory()
        ]);

        setPortfolio(portfolioData);
        setStocks(stocksData);
        setHoldings(holdingsData);
        setTransactions(transactionsData);
        setPortfolioHistory(historyData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const stocksData = await stockApi.getAll();
        setStocks(stocksData);
      } catch (error) {
        console.error('Error refreshing stocks:', error);
      }
    }, 6 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStockClick = async (stock: Stock) => {
    setSelectedStock(stock);
    setCurrentPage(3);
    
    try {
      const data = await stockApi.getHistory(stock.symbol, selectedTimeframe);
      setHistoricalData(data);
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  };

  const handleTimeframeChange = async (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    
    if (selectedStock) {
      try {
        const data = await stockApi.getHistory(selectedStock.symbol, timeframe);
        setHistoricalData(data);
      } catch (error) {
        console.error('Error loading historical data:', error);
      }
    }
  };

  const handleTrade = async (type: 'BUY' | 'SELL', quantity: number) => {
    if (!selectedStock) return;

    try {
      const result = await portfolioApi.executeTrade(selectedStock.symbol, type, quantity, selectedStock.price);
      
      if (result.success) {
        const [portfolioData, holdingsData, transactionsData] = await Promise.all([
          portfolioApi.get(),
          portfolioApi.getHoldings(),
          portfolioApi.getTransactions()
        ]);

        setPortfolio(portfolioData);
        setHoldings(holdingsData);
        setTransactions(transactionsData);
        
        alert('Trade executed successfully!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Trade error:', error);
      alert('Trade failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Portfolio Page
  const PortfolioPage = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Portfolio</h1>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-800">Available Cash</h2>
            <p className="text-2xl font-bold text-blue-900">
              ${portfolio?.cash_balance?.toLocaleString() || '0.00'}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800">Total Portfolio Value</h2>
            <p className="text-2xl font-bold text-green-900">
              ${portfolio?.total_value?.toLocaleString() || '0.00'}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${portfolio && portfolio.total_pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <h2 className={`text-lg font-semibold ${portfolio && portfolio.total_pnl >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              Total P&L
            </h2>
            <p className={`text-2xl font-bold ${portfolio && portfolio.total_pnl >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {portfolio && portfolio.total_pnl >= 0 ? '+' : ''}${portfolio?.total_pnl?.toLocaleString() || '0.00'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Portfolio Performance</h2>
          {portfolioHistory.length > 0 ? (
            <PortfolioChart data={portfolioHistory} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>No portfolio history data available yet</p>
            </div>
          )}
        </div>

        {holdings.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Current Holdings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holdings.map((holding) => (
                <div key={holding.symbol} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <h3 className="font-semibold">{holding.symbol}</h3>
                    <p className="text-sm text-gray-600">{holding.quantity} shares @ ${holding.average_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${holding.current_value.toFixed(2)}</p>
                    <p className={`text-sm ${holding.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {holding.unrealized_pnl >= 0 ? '+' : ''}${holding.unrealized_pnl.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Stock List Page
  const StockListPage = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Markets</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => handleStockClick(stock)}
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{stock.symbol}</h3>
              <p className="font-semibold text-lg">${stock.price?.toFixed(2)}</p>
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{stock.name}</p>
            <div className="flex justify-end">
              <p className={`text-sm font-medium ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)} ({stock.change_percent?.toFixed(2)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Stock Detail Page
  const StockDetailPage = () => {
    const [tradeQuantity, setTradeQuantity] = useState(1);
    const holding = holdings.find(h => h.symbol === selectedStock?.symbol);

    if (!selectedStock) {
      return (
        <div className="p-6">
          <p>Select a stock from the markets page</p>
        </div>
      );
    }

    const timeframes = [
      { key: '1day', label: '1D' },
      { key: '1week', label: '1W' },
      { key: '1month', label: '1M' },
      { key: '6month', label: '6M' },
      { key: '1year', label: '1Y' },
      { key: 'ytd', label: 'YTD' },
      { key: '2year', label: '2Y' }
    ];

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setCurrentPage(2)}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">{selectedStock.symbol}</h1>
          <div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-semibold mb-2">{selectedStock.name}</h2>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">${selectedStock.price?.toFixed(2)}</span>
                <span className={`text-lg ${selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change?.toFixed(2)} ({selectedStock.change_percent?.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex flex-wrap gap-2">
                {timeframes.map(tf => (
                  <button
                    key={tf.key}
                    onClick={() => handleTimeframeChange(tf.key)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedTimeframe === tf.key 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Price Chart</h3>
              {historicalData.length > 0 ? (
                <StockChart data={historicalData} timeframe={selectedTimeframe} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <p>No chart data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {holding && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Your Position</h3>
                <p>Shares: {holding.quantity}</p>
                <p>Avg Cost: ${holding.average_price?.toFixed(2)}</p>
                <p className={holding.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                  P&L: {holding.unrealized_pnl >= 0 ? '+' : ''}${holding.unrealized_pnl?.toFixed(2)}
                </p>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Trade</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(parseInt(e.target.value) || 1)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleTrade('BUY', tradeQuantity)}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Buy ${(selectedStock.price * tradeQuantity).toFixed(2)}
                </button>
                <button
                  onClick={() => handleTrade('SELL', tradeQuantity)}
                  disabled={!holding || holding.quantity < tradeQuantity}
                  className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  Sell ${(selectedStock.price * tradeQuantity).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Transactions Page
  const TransactionsPage = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No activity yet. Trades will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">
                  {transaction.type} {transaction.symbol}
                </h3>
                <p className={`font-semibold ${transaction.type === 'BUY' ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.type === 'BUY' ? '-' : '+'}${transaction.total?.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {transaction.quantity} shares @ ${transaction.price?.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(transaction.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 1: return <PortfolioPage />;
      case 2: return <StockListPage />;
      case 3: return <StockDetailPage />;
      case 4: return <TransactionsPage />;
      default: return <PortfolioPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderCurrentPage()}
    </Layout>
  );
};

export default App;
