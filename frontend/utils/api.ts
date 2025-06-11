import axios from 'axios';
import { Stock, Portfolio, Holding, Transaction, HistoricalData, PortfolioHistory, TradeResponse } from '@shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'user-id': 'default-user'
  }
});

export const stockApi = {
  getAll: (): Promise<Stock[]> => api.get('/stocks').then(res => res.data),
  getOne: (symbol: string): Promise<Stock> => api.get(`/stocks/${symbol}`).then(res => res.data),
  getHistory: (symbol: string, timeframe: string = '2year'): Promise<HistoricalData[]> => 
    api.get(`/stocks/${symbol}/history?timeframe=${timeframe}`).then(res => res.data)
};

export const portfolioApi = {
  get: (): Promise<Portfolio> => api.get('/portfolio').then(res => res.data),
  getHoldings: (): Promise<Holding[]> => api.get('/portfolio/holdings').then(res => res.data),
  getTransactions: (): Promise<Transaction[]> => api.get('/portfolio/transactions').then(res => res.data),
  getHistory: (): Promise<PortfolioHistory[]> => api.get('/portfolio/history').then(res => res.data),
  executeTrade: (symbol: string, type: 'BUY' | 'SELL', quantity: number, price: number): Promise<TradeResponse> =>
    api.post('/portfolio/trade', { symbol, type, quantity, price }).then(res => res.data)
};
