import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolioService';

const portfolioService = new PortfolioService();

export const getPortfolio = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user';
    const portfolio = await portfolioService.getPortfolio(userId);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
};

export const getHoldings = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user';
    const holdings = await portfolioService.getHoldings(userId);
    res.json(holdings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user';
    const transactions = await portfolioService.getTransactions(userId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const executeTrade = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user';
    const { symbol, type, quantity, price } = req.body;

    const result = await portfolioService.executeTrade(userId, symbol, type, quantity, price);
    
    if (result.success) {
      await portfolioService.updatePortfolioValue(userId);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute trade' });
  }
};

export const getPortfolioHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user';
    const history = await portfolioService.getPortfolioHistory(userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio history' });
  }
};
