import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { getCoachSuggestion } from '../services/openai';

export function registerTrainingHandlers(db: Database.Database): void {
  ipcMain.handle('training:getRecords', async () => {
    const row = db.prepare('SELECT content FROM training_records LIMIT 1').get() as
      | { content: string }
      | undefined;
    return row?.content ?? '';
  });

  ipcMain.handle('training:saveRecords', async (_event, args: { content: string }) => {
    db.prepare('UPDATE training_records SET content = ?, updated_at = CURRENT_TIMESTAMP').run(
      args.content
    );
  });

  ipcMain.handle('training:getPlan', async () => {
    const row = db.prepare('SELECT content FROM training_plan LIMIT 1').get() as
      | { content: string }
      | undefined;
    return row?.content ?? '';
  });

  ipcMain.handle('training:savePlan', async (_event, args: { content: string }) => {
    db.prepare('UPDATE training_plan SET content = ?, updated_at = CURRENT_TIMESTAMP').run(
      args.content
    );
  });

  ipcMain.handle('training:getCoachSuggestion', async (_event, args: { force: boolean }) => {
    const records = (
      db.prepare('SELECT content FROM training_records LIMIT 1').get() as { content: string } | undefined
    )?.content ?? '';
    const plan = (
      db.prepare('SELECT content FROM training_plan LIMIT 1').get() as { content: string } | undefined
    )?.content ?? '';
    return getCoachSuggestion(db, plan, records, args.force);
  });
}
