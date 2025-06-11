import { Request, Response } from 'express';
import { StockService } from '../services/stockService';

const stockService = new StockService();

export const getStocks = async (req: Request, res: Response) => {
  try {
    const stocks = await stockService.getAllStocks();
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
};

export const getStock = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const stock = await stockService.getStock(symbol.toUpperCase());
    
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
};

export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '2year' } = req.query;
    
    const data = await stockService.getHistoricalData(symbol.toUpperCase(), timeframe as string);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
};
