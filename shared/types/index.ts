export interface Stock {
  id: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  last_updated: string;
}

export interface Portfolio {
  id: number;
  user_id: string;
  cash_balance: number;
  total_value: number;
  total_pnl: number;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: number;
  user_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_value: number;
  unrealized_pnl: number;
  stock_name: string;
  current_price: number;
}

export interface Transaction {
  id: number;
  user_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioHistory {
  date: string;
  total_value: number;
  cash_balance: number;
  holdings_value: number;
}

export interface TradeResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  error: string;
  status?: number;
}
