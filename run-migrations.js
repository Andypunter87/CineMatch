// Simple script to run database migrations
import { addAdminField } from './server/migrations/add-admin-field.js';
import { createAnalyticsTable } from './server/migrations/create-analytics-table.js';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Run admin field migration
    console.log('Adding admin field to users table...');
    const adminFieldResult = await addAdminField();
    console.log('Admin field migration result:', adminFieldResult);
    
    // Run analytics table migration
    console.log('Creating analytics table if needed...');
    const analyticsTableResult = await createAnalyticsTable();
    console.log('Analytics table migration result:', analyticsTableResult);
    
    console.log('All migrations completed!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();