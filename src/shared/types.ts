export interface ConversionRecord {
  id: number;
  inputValue: string;
  inputUnit: 'mph' | 'min_km';
  outputValue: string;
  outputUnit: 'mph' | 'min_km';
  createdAt: string;
}

export interface CalorieItem {
  id: number;
  name: string;
  calories: string;
  category: '主食' | '小食' | '酒';
  sortOrder: number;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTarget {
  id: number;
  date: string;
  targetCalories: number;
}

export interface DailyItem {
  id: number;
  date: string;
  name: string;
  calories: number;
  isEaten: boolean;
  sortOrder: number;
  calorieItemId: number | null;
  createdAt: string;
}

export interface CoachSuggestion {
  next_training_day: {
    plan: string;
    reason: string;
  };
  next_training_week: {
    plan: string;
    reason: string;
  };
}

export interface ElectronAPI {
  converter: {
    convert: (
      value: string,
      fromUnit: 'mph' | 'min_km'
    ) => Promise<{ result: string; toUnit: string }>;
    getHistory: () => Promise<ConversionRecord[]>;
  };
  calorie: {
    getAll: () => Promise<CalorieItem[]>;
    create: (item: Omit<CalorieItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalorieItem>;
    update: (item: CalorieItem) => Promise<CalorieItem>;
    delete: (id: number) => Promise<void>;
  };
  daily: {
    getTarget: (date: string) => Promise<DailyTarget | null>;
    setTarget: (date: string, targetCalories: number) => Promise<void>;
    getItems: (date: string) => Promise<DailyItem[]>;
    addItem: (item: Omit<DailyItem, 'id' | 'createdAt'>) => Promise<DailyItem>;
    updateItem: (item: DailyItem) => Promise<void>;
    deleteItem: (id: number) => Promise<void>;
    reorder: (ids: number[]) => Promise<void>;
    suggest: (date: string) => Promise<CalorieItem | null>;
  };
  training: {
    getGoal: () => Promise<string>;
    saveGoal: (content: string) => Promise<void>;
    getRecords: () => Promise<string>;
    saveRecords: (content: string) => Promise<void>;
    getPlan: () => Promise<string>;
    savePlan: (content: string) => Promise<void>;
    getCoachSuggestion: (force: boolean) => Promise<CoachSuggestion | string>;
  };
  settings: {
    getApiKeyStatus: () => Promise<{ configured: boolean }>;
    setApiKey: (key: string) => Promise<void>;
    clearApiKey: () => Promise<void>;
    testApiKey: (key: string) => Promise<{ valid: boolean; error?: string }>;
    testSavedKey: () => Promise<{ valid: boolean; error?: string }>;
    openKeyManagement: () => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
