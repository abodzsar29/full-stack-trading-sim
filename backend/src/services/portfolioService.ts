import { pool } from '../config/database';
import { Portfolio, Holding, Transaction, PortfolioHistory, TradeResponse } from '@shared/types';

export class PortfolioService {
  async getPortfolio(userId: string): Promise<Portfolio> {
    let result = await pool.query('SELECT * FROM portfolios WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO portfolios (user_id, cash_balance, total_value, total_pnl) VALUES ($1, $2, $2, $3)',
        [userId, 10000, 10000, 0]
      );
      result = await pool.query('SELECT * FROM portfolios WHERE user_id = $1', [userId]);
    }

    const portfolio = result.rows[0];
    return {
      ...portfolio,
      cash_balance: Number(portfolio.cash_balance),
      total_value: Number(portfolio.total_value),
      total_pnl: Number(portfolio.total_pnl)
    };
  }

  async getHoldings(userId: string): Promise<Holding[]> {
    const result = await pool.query(`
      SELECT h.*, s.price as current_price, s.name as stock_name
      FROM holdings h
      JOIN stocks s ON h.symbol = s.symbol
      WHERE h.user_id = $1 AND h.quantity > 0
    `, [userId]);

    return result.rows.map(row => ({
      ...row,
      quantity: Number(row.quantity),
      average_price: Number(row.average_price),
      current_price: Number(row.current_price),
      currentValue: Number(row.quantity) * Number(row.current_price),
      unrealizedPnL: (Number(row.current_price) - Number(row.average_price)) * Number(row.quantity)
    }));
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    const result = await pool.query(`
      SELECT * FROM transactions 
      WHERE user_id = $1 
      ORDER BY timestamp DESC
    `, [userId]);

    return result.rows.map(row => ({
      ...row,
      quantity: Number(row.quantity),
      price: Number(row.price),
      total: Number(row.total)
    }));
  }

  async executeTrade(
    userId: string,
    symbol: string,
    type: 'BUY' | 'SELL',
    quantity: number,
    price: number
  ): Promise<TradeResponse> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const portfolio = await this.getPortfolio(userId);
      const totalCost = quantity * price;

      if (type === 'BUY') {
        if (portfolio.cash_balance < totalCost) {
          return { success: false, message: 'Insufficient funds' };
        }

        await client.query(
          'UPDATE portfolios SET cash_balance = cash_balance - $1 WHERE user_id = $2',
          [totalCost, userId]
        );

        const existingHolding = await client.query(
          'SELECT * FROM holdings WHERE user_id = $1 AND symbol = $2',
          [userId, symbol]
        );

        if (existingHolding.rows.length > 0) {
          const holding = existingHolding.rows[0];
          const newQuantity = holding.quantity + quantity;
          const newAveragePrice = (holding.average_price * holding.quantity + totalCost) / newQuantity;

          await client.query(
            'UPDATE holdings SET quantity = $1, average_price = $2 WHERE user_id = $3 AND symbol = $4',
            [newQuantity, newAveragePrice, userId, symbol]
          );
        } else {
          await client.query(
            'INSERT INTO holdings (user_id, symbol, quantity, average_price) VALUES ($1, $2, $3, $4)',
            [userId, symbol, quantity, price]
          );
        }

      } else {
        const holding = await client.query(
          'SELECT * FROM holdings WHERE user_id = $1 AND symbol = $2',
          [userId, symbol]
        );

        if (holding.rows.length === 0 || holding.rows[0].quantity < quantity) {
          return { success: false, message: 'Insufficient shares' };
        }

        await client.query(
          'UPDATE portfolios SET cash_balance = cash_balance + $1 WHERE user_id = $2',
          [totalCost, userId]
        );

        const newQuantity = holding.rows[0].quantity - quantity;
        if (newQuantity > 0) {
          await client.query(
            'UPDATE holdings SET quantity = $1 WHERE user_id = $2 AND symbol = $3',
            [newQuantity, userId, symbol]
          );
        } else {
          await client.query(
            'DELETE FROM holdings WHERE user_id = $1 AND symbol = $2',
            [userId, symbol]
          );
        }
      }

      await client.query(
        'INSERT INTO transactions (user_id, symbol, type, quantity, price, total) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, symbol, type, quantity, price, totalCost]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Trade executed successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Trade execution error:', error);
      return { success: false, message: 'Trade execution failed' };
    } finally {
      client.release();
    }
  }

  async updatePortfolioValue(userId: string): Promise<void> {
    const holdings = await this.getHoldings(userId);
    const portfolio = await this.getPortfolio(userId);
    
    const holdingsValue = holdings.reduce((sum, holding) => sum + holding.current_value, 0);
    const totalValue = portfolio.cash_balance + holdingsValue;
    const totalPnL = totalValue - 10000;

    await pool.query(
      'UPDATE portfolios SET total_value = $1, total_pnl = $2 WHERE user_id = $3',
      [totalValue, totalPnL, userId]
    );

    await pool.query(
      'INSERT INTO portfolio_history (user_id, total_value, cash_balance, holdings_value) VALUES ($1, $2, $3, $4)',
      [userId, totalValue, portfolio.cash_balance, holdingsValue]
    );
  }

  async getPortfolioHistory(userId: string): Promise<PortfolioHistory[]> {
    const result = await pool.query(`
      SELECT DATE(date) as date, total_value, cash_balance, holdings_value
      FROM portfolio_history 
      WHERE user_id = $1 
      ORDER BY date DESC 
      LIMIT 365
    `, [userId]);

    return result.rows.map(row => ({
      ...row,
      total_value: Number(row.total_value),
      cash_balance: Number(row.cash_balance),
      holdings_value: Number(row.holdings_value)
    }));
  }
}
