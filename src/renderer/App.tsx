import { useState } from 'react';
import Sidebar from './components/Sidebar';
import PaceConverter from './components/PaceConverter/PaceConverter';
import CalorieLibrary from './components/CalorieLibrary/CalorieLibrary';
import DailyTracker from './components/DailyTracker/DailyTracker';
import TrainingLog from './components/TrainingLog/TrainingLog';

const TOOLS = [
  { id: 1, name: '配速转换器', nameEn: 'Pace Converter' },
  { id: 2, name: '热量参考库', nameEn: 'Calorie Library' },
  { id: 3, name: '每日热量追踪', nameEn: 'Daily Tracker' },
  { id: 4, name: '训练日志 + AI教练', nameEn: 'Training Log' },
];

export default function App() {
  const [activeTool, setActiveTool] = useState(1);

  const renderContent = () => {
    switch (activeTool) {
      case 1:
        return <PaceConverter />;
      case 2:
        return <CalorieLibrary />;
      case 3:
        return <DailyTracker />;
      case 4:
        return <TrainingLog />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar tools={TOOLS} activeTool={activeTool} onToolChange={setActiveTool} />
      <main style={{ flex: 1, overflow: 'auto', padding: 32 }}>{renderContent()}</main>
    </div>
  );
}
