import Database from 'better-sqlite3';

const PRESET_ITEMS: { name: string; calories: string; category: '主食' | '小食' | '酒' }[] = [
  { name: '鸡蛋*1', calories: '75', category: '主食' },
  { name: '鸡蛋*5', calories: '375', category: '主食' },
  { name: '咖喱块*1餐', calories: '300', category: '主食' },
  { name: '鸡肉*1磅', calories: '600', category: '主食' },
  { name: '洋葱', calories: '40', category: '主食' },
  { name: '咖喱正餐', calories: '940', category: '主食' },
  { name: '咖喱小餐', calories: '630', category: '主食' },
  { name: '炸鸡（breast）', calories: '400', category: '主食' },
  { name: '炸鸡（thigh）', calories: '300', category: '主食' },
  { name: '炸鸡（leg）', calories: '180', category: '主食' },
  { name: '小排骨汤', calories: '600', category: '主食' },
  { name: '排骨汤*1磅', calories: '900', category: '主食' },
  { name: '煎干贝', calories: '220', category: '主食' },
  { name: '泡面', calories: '380/440', category: '主食' },
  { name: '拿铁', calories: '100', category: '小食' },
  { name: '牛奶', calories: '100', category: '小食' },
  { name: '橙汁', calories: '100', category: '小食' },
  { name: '腰果*6', calories: '50', category: '小食' },
  { name: '椰子水', calories: '60', category: '小食' },
  { name: '酥饼', calories: '180', category: '小食' },
  { name: '威士忌1.5oz', calories: '100', category: '酒' },
  { name: '朗姆1.5oz', calories: '100', category: '酒' },
  { name: '啤酒*1罐', calories: '142', category: '酒' },
  { name: '葡萄酒*半瓶', calories: '315', category: '酒' },
];

export function seedData(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO calorie_items (name, calories, category, sort_order, is_preset)
    VALUES (?, ?, ?, ?, 1)
  `);

  const categoryOrder: Record<string, number> = {};

  const insertMany = db.transaction(() => {
    for (const item of PRESET_ITEMS) {
      if (!(item.category in categoryOrder)) {
        categoryOrder[item.category] = 0;
      }
      categoryOrder[item.category]++;
      insert.run(item.name, item.calories, item.category, categoryOrder[item.category]);
    }
  });
  insertMany();

  const trainingRecordsCount = db
    .prepare('SELECT COUNT(*) as count FROM training_records')
    .get() as { count: number };
  if (trainingRecordsCount.count === 0) {
    db.prepare('INSERT INTO training_records (content) VALUES (?)').run('');
  }

  const trainingPlanCount = db
    .prepare('SELECT COUNT(*) as count FROM training_plan')
    .get() as { count: number };
  if (trainingPlanCount.count === 0) {
    db.prepare('INSERT INTO training_plan (content) VALUES (?)').run('');
  }
}
