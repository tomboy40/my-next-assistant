import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

// Missions table - stores user missions/goals
export const missions = sqliteTable('missions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['pending', 'planning', 'executing', 'completed', 'failed'] }).notNull().default('pending'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Plans table - stores decomposed plans for missions
export const plans = sqliteTable('plans', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  missionId: text('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'active', 'completed', 'failed', 'superseded'] }).notNull().default('draft'),
  estimatedDuration: integer('estimated_duration'), // in minutes
  actualDuration: integer('actual_duration'), // in minutes
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Tasks table - stores individual tasks within plans
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  planId: text('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  parentTaskId: text('parent_task_id').references(() => tasks.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'] }).notNull().default('pending'),
  priority: integer('priority').notNull().default(0), // 0 = highest priority
  toolName: text('tool_name'), // which tool to use for this task
  toolParams: text('tool_params', { mode: 'json' }).$type<Record<string, any>>(),
  dependencies: text('dependencies', { mode: 'json' }).$type<string[]>(), // task IDs this depends on
  estimatedDuration: integer('estimated_duration'), // in minutes
  actualDuration: integer('actual_duration'), // in minutes
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  result: text('result', { mode: 'json' }).$type<Record<string, any>>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Execution logs table - stores detailed execution history
export const executionLogs = sqliteTable('execution_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  missionId: text('mission_id').references(() => missions.id, { onDelete: 'cascade' }),
  planId: text('plan_id').references(() => plans.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  level: text('level', { enum: ['debug', 'info', 'warn', 'error'] }).notNull().default('info'),
  message: text('message').notNull(),
  data: text('data', { mode: 'json' }).$type<Record<string, any>>(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Reflections table - stores agent reflections and learnings
export const reflections = sqliteTable('reflections', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  missionId: text('mission_id').references(() => missions.id, { onDelete: 'cascade' }),
  planId: text('plan_id').references(() => plans.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['progress_assessment', 'plan_optimization', 'error_analysis', 'success_analysis'] }).notNull(),
  content: text('content').notNull(),
  insights: text('insights', { mode: 'json' }).$type<string[]>(),
  recommendations: text('recommendations', { mode: 'json' }).$type<string[]>(),
  confidence: real('confidence'), // 0.0 to 1.0
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Knowledge base table - stores indexed content from Confluence and other sources
export const knowledgeBase = sqliteTable('knowledge_base', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  sourceType: text('source_type', { enum: ['confluence', 'web', 'document', 'manual'] }).notNull(),
  sourceUrl: text('source_url'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(), // vector embedding
  lastIndexed: integer('last_indexed', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Tool usage tracking
export const toolUsage = sqliteTable('tool_usage', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  toolName: text('tool_name').notNull(),
  parameters: text('parameters', { mode: 'json' }).$type<Record<string, any>>(),
  result: text('result', { mode: 'json' }).$type<Record<string, any>>(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  duration: integer('duration'), // in milliseconds
  errorMessage: text('error_message'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
export type Reflection = typeof reflections.$inferSelect;
export type NewReflection = typeof reflections.$inferInsert;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert;
export type ToolUsage = typeof toolUsage.$inferSelect;
export type NewToolUsage = typeof toolUsage.$inferInsert;
