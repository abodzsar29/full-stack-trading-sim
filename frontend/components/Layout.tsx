import React from 'react';
import { Home, TrendingUp, BarChart, History } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const navItems = [
    { id: 1, icon: Home, label: 'Portfolio' },
    { id: 2, icon: TrendingUp, label: 'Markets' },
    { id: 3, icon: BarChart, label: 'Stock Detail' },
    { id: 4, icon: History, label: 'Transactions' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <div className="w-full max-w-md lg:max-w-7xl mx-auto bg-white shadow-lg min-h-screen">
        {children}
        
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md lg:max-w-7xl bg-white border-t border-gray-200">
          <div className="flex">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex-1 py-3 px-2 text-center transition-colors ${
                    currentPage === item.id 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
