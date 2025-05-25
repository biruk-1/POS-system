import { deleteDB } from 'idb';

export const resetDatabase = async () => {
  try {
    await deleteDB('pos-system-db');
    console.log('Database reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
}; 