import axios from 'axios';
import { Stock, HistoricalData } from '@shared/types';
import { pool } from '../config/database';

const STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
  'ORCL', 'INTC', 'AMD', 'PYPL', 'UBER', 'LYFT', 'SNAP', 'TWTR', 'ZOOM', 'SHOP',
  'SQ', 'ROKU', 'PINS', 'DOCU', 'ZM', 'CRWD', 'OKTA', 'SNOW', 'PLTR', 'COIN',
  'GME', 'AMC', 'BB', 'NOK', 'SPCE', 'PLTR', 'NIO', 'XPEV', 'LI', 'BABA',
  'JD', 'PDD', 'TME', 'BILI', 'IQ', 'VIPS', 'WB', 'DIDI', 'SE', 'GRAB',
  'V', 'MA', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC',
  'KO', 'PEP', 'WMT', 'PG', 'JNJ', 'UNH', 'CVX', 'XOM', 'HD', 'MCD',
  'DIS', 'BA', 'CAT', 'MMM', 'IBM', 'GE', 'F', 'GM', 'T', 'VZ',
  'COST', 'TGT', 'LOW', 'SBUX', 'NKE', 'LULU', 'ZM', 'CZR', 'MGM', 'LVS',
  'MRNA', 'PFE', 'ABBV', 'BMY', 'LLY', 'MRK', 'GILD', 'AMGN', 'BIIB', 'REGN'
];

export class StockService {
  private readonly FMP_API_KEY = process.env.FMP_API_KEY || 'dummy_fmp_api_key';
  private readonly POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'dummy_polygon_api_key';

  async updateStockPrices(): Promise<void> {
    try {
      // Single API call for all 100 stocks
      await this.updateBatchPrices(STOCKS);
      console.log('Stock prices updated successfully');
    } catch (error) {
      console.error('Error updating stock prices:', error);
    }
  }

  private async updateBatchPrices(symbols: string[]): Promise<void> {
    try {
      const stockSymbols = symbols.join(',');
      
      // Single API call with all 100 stock symbols
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/quote/${stockSymbols}?apikey=${this.FMP_API_KEY}`,
        {
          timeout: 15000, // Increased timeout for larger request
          headers: {
            'User-Agent': 'TradingSimulator/1.0'
          }
        }
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from FMP API');
      }

      const stockData = response.data;
      
      // This loop now processes all 100 stocks instead of 10
      for (const stock of stockData) {
        if (!stock.symbol || typeof stock.price !== 'number') {
          console.warn(`Invalid stock data received for ${stock.symbol}`);
          continue;
        }

        await pool.query(
          `INSERT INTO stocks (symbol, name, price, change, change_percent, last_updated)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (symbol)
           DO UPDATE SET
             price = $3,
             change = $4,
             change_percent = $5,
             last_updated = NOW()`,
          [
            stock.symbol,
            stock.name || `${stock.symbol} Inc.`,
            stock.price,
            stock.change || 0,
            stock.changesPercentage || 0
          ]
        );
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.error('Rate limit exceeded, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        } else if (error.response?.status === 401) {
          console.error('Invalid API key for Financial Modeling Prep');
        } else {
          console.error('FMP API error:', error.response?.data || error.message);
        }
      } else {
        console.error('Network error updating batch prices:', error);
      }
      throw error;
    }
  }

  async getAllStocks(): Promise<Stock[]> {
    const result = await pool.query('SELECT * FROM stocks ORDER BY symbol');
    return result.rows.map(row => ({
      ...row,
      price: Number(row.price),
      change: Number(row.change),
      change_percent: Number(row.change_percent)
    }));
  }

  async getStock(symbol: string): Promise<Stock | null> {
    const result = await pool.query('SELECT * FROM stocks WHERE symbol = $1', [symbol]);
    if (result.rows.length === 0) return null;
    
    const stock = result.rows[0];
    return {
      ...stock,
      price: Number(stock.price),
      change: Number(stock.change),
      change_percent: Number(stock.change_percent)
    };
  }

  async getHistoricalData(symbol: string, timeframe: string = '2year'): Promise<HistoricalData[]> {
    try {
      const { startDate, endDate } = this.getDateRange(timeframe);
      
      // Polygon.io API call for historical data
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=5000&apiKey=${this.POLYGON_API_KEY}`,
        {
          timeout: 15000, // 15 second timeout
          headers: {
            'User-Agent': 'TradingSimulator/1.0'
          }
        }
      );

      if (!response.data || response.data.status !== 'OK') {
        throw new Error(`Polygon API error: ${response.data?.status || 'Unknown error'}`);
      }

      if (!response.data.results || !Array.isArray(response.data.results)) {
        console.warn(`No historical data available for ${symbol}`);
        return [];
      }

      return response.data.results.map((item: any) => ({
        date: new Date(item.t).toISOString().split('T')[0],
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v
      }));

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.error('Polygon API rate limit exceeded');
        } else if (error.response?.status === 401) {
          console.error('Invalid API key for Polygon.io');
        } else if (error.response?.status === 403) {
          console.error('Polygon API access forbidden - check subscription tier');
        } else {
          console.error('Polygon API error:', error.response?.data || error.message);
        }
      } else {
        console.error('Network error fetching historical data:', error);
      }
      
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  private getDateRange(timeframe: string): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '1day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '1week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '6month':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'ytd':
        startDate.setMonth(0, 1); // January 1st of current year
        break;
      default: // 2year
        startDate.setFullYear(endDate.getFullYear() - 2);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
}
