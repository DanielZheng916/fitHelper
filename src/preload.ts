/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  converter: {
    convert: (value: string, fromUnit: 'mph' | 'min_km') =>
      ipcRenderer.invoke('converter:convert', { value, fromUnit }),
    getHistory: () => ipcRenderer.invoke('converter:getHistory'),
  },
  calorie: {
    getAll: () => ipcRenderer.invoke('calorie:getAll'),
    create: (item: Record<string, unknown>) => ipcRenderer.invoke('calorie:create', item),
    update: (item: Record<string, unknown>) => ipcRenderer.invoke('calorie:update', item),
    delete: (id: number) => ipcRenderer.invoke('calorie:delete', { id }),
  },
  daily: {
    getTarget: (date: string) => ipcRenderer.invoke('daily:getTarget', { date }),
    setTarget: (date: string, targetCalories: number) =>
      ipcRenderer.invoke('daily:setTarget', { date, targetCalories }),
    getItems: (date: string) => ipcRenderer.invoke('daily:getItems', { date }),
    addItem: (item: Record<string, unknown>) => ipcRenderer.invoke('daily:addItem', item),
    updateItem: (item: Record<string, unknown>) => ipcRenderer.invoke('daily:updateItem', item),
    deleteItem: (id: number) => ipcRenderer.invoke('daily:deleteItem', { id }),
    reorder: (ids: number[]) => ipcRenderer.invoke('daily:reorder', { ids }),
    suggest: (date: string) => ipcRenderer.invoke('daily:suggest', { date }),
  },
  training: {
    getGoal: () => ipcRenderer.invoke('training:getGoal'),
    saveGoal: (content: string) => ipcRenderer.invoke('training:saveGoal', { content }),
    getRecords: () => ipcRenderer.invoke('training:getRecords'),
    saveRecords: (content: string) => ipcRenderer.invoke('training:saveRecords', { content }),
    getPlan: () => ipcRenderer.invoke('training:getPlan'),
    savePlan: (content: string) => ipcRenderer.invoke('training:savePlan', { content }),
    getCoachSuggestion: (force: boolean) =>
      ipcRenderer.invoke('training:getCoachSuggestion', { force }),
  },
  settings: {
    getApiKeyStatus: () => ipcRenderer.invoke('settings:getApiKeyStatus'),
    setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', { key }),
    clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),
    testApiKey: (key: string) => ipcRenderer.invoke('settings:testApiKey', { key }),
    testSavedKey: () => ipcRenderer.invoke('settings:testSavedKey'),
    openKeyManagement: () => ipcRenderer.invoke('settings:openKeyManagement'),
  },
});
