import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoricalData } from '@shared/types';

interface StockChartProps {
  data: HistoricalData[];
  timeframe: string;
}

const StockChart: React.FC<StockChartProps> = ({ data, timeframe }) => {
  const formatData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    price: item.close
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              if (timeframe === '1day' || timeframe === '1week') {
                return value.split('/')[0] + '/' + value.split('/')[1];
              }
              return value.split('/')[0] + '/' + value.split('/')[2];
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip 
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#16a34a" 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
