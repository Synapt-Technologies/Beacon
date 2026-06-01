import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import type { ProducerConfig } from '../tally/types/ProducerTypes';

export const producers = sqliteTable('producers', {
  id:      text('producer_id').primaryKey(),
  type:    text('type').notNull(),
  config:  text('config').$type<ProducerConfig>().notNull(),  // JSON blob
  enabled: integer('enabled').notNull().default(1),
});

// TODO: config:  jsonColumn(ProducerConfigSchema)('config').notNull(), // validated on read

export const producerInfo = sqliteTable('producer_info', {
  id:   text('producer_id').primaryKey(),
  info: text('info').notNull(),        // JSON blob
});

export const consumerDevices = sqliteTable('consumer_devices', {
  id:         text('device_id').notNull(),
  consumerId: text('consumer_id').notNull(),
  data:       text('data').notNull(),  // JSON blob
},
  (table) => [
    primaryKey({
      name: 'consumer_device_pk',
      columns: [table.consumerId, table.id],
    })
]);

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),      // JSON blob
});

