import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true); // Enable promise-based API

export const openDatabase = () => {
  return SQLite.openDatabase(
    {name: 'app.db', location: 'default'},
    () => {},
    error => console.log(error),
  );
};
// sqliteUtils.ts
export const initializeDatabase = async () => {
  const db = await openDatabase();
  db.transaction(tx => {
    console.log('created');
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, hasCompletedOnboarding BOOLEAN)',
      [],
      () => {},
      error => console.log(error),
    );
  });
};

// Check if onboarding has been completed
export const checkOnboardingStatus = async () => {
  const db = await openDatabase();
  return new Promise<boolean>((resolve, reject) => {
    db.transaction(tx => {
      console.log('checked');
      tx.executeSql(
        'SELECT * FROM user LIMIT 1',
        [],
        (_, {rows}) => {
          if (rows.length > 0) {
            const status = rows.item(0).hasCompletedOnboarding;
            resolve(status === 1); // Convert to true/false
          } else {
            resolve(false);
          }
        },
        error => reject(error),
      );
    });
  });
};

// Set onboarding status to true
export const setOnboardingCompleted = async () => {
  console.log('called first time');
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      console.log('setted');
      tx.executeSql(
        'INSERT INTO user (hasCompletedOnboarding) VALUES (?)',
        [1], // Explicitly use 1 for true
        () => {
          resolve();
        },
        error => reject(error),
      );
    });
  });
};
