// Core agent types and interfaces

export interface AgentConfig {
  deepseekApiKey: string;
  deepseekBaseUrl?: string;
  maxRetries?: number;
  timeout?: number;
  debug?: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'planning' | 'executing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Plan {
  id: string;
  missionId: string;
  version: number;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'failed' | 'superseded';
  estimatedDuration?: number;
  actualDuration?: number;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  planId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  priority: number;
  toolName?: string;
  toolParams?: Record<string, any>;
  dependencies?: string[];
  estimatedDuration?: number;
  actualDuration?: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: Record<string, any>;
  subtasks?: Task[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionContext {
  missionId: string;
  planId: string;
  taskId?: string;
  tools: Map<string, Tool>;
  cache: Map<string, any>;
  logger: Logger;
}

export interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

export interface Reflection {
  id: string;
  missionId?: string;
  planId?: string;
  taskId?: string;
  type: 'progress_assessment' | 'plan_optimization' | 'error_analysis' | 'success_analysis';
  content: string;
  insights?: string[];
  recommendations?: string[];
  confidence?: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface PlanningResult {
  plan: Plan;
  reasoning: string;
  confidence: number;
  alternatives?: Plan[];
}

export interface ExecutionResult {
  success: boolean;
  completedTasks: Task[];
  failedTasks: Task[];
  reflections: Reflection[];
  finalResult?: any;
  error?: string;
}

export interface ReflectionResult {
  insights: string[];
  recommendations: string[];
  planUpdates?: Partial<Plan>;
  taskUpdates?: Partial<Task>[];
  confidence: number;
}

// Agent capability interfaces
export interface PlanningCapability {
  createPlan(mission: Mission, context: ExecutionContext): Promise<PlanningResult>;
  updatePlan(plan: Plan, feedback: string, context: ExecutionContext): Promise<PlanningResult>;
  decomposeTasks(task: Task, context: ExecutionContext): Promise<Task[]>;
}

export interface ToolUseCapability {
  getAvailableTools(): Tool[];
  selectTool(task: Task, context: ExecutionContext): Promise<Tool | null>;
  executeTool(tool: Tool, params: Record<string, any>, context: ExecutionContext): Promise<ToolResult>;
}

export interface AutonomousCapability {
  executeTask(task: Task, context: ExecutionContext): Promise<ToolResult>;
  executePlan(plan: Plan, context: ExecutionContext): Promise<ExecutionResult>;
  handleError(error: Error, context: ExecutionContext): Promise<void>;
}

export interface ReflectiveCapability {
  assessProgress(plan: Plan, context: ExecutionContext): Promise<ReflectionResult>;
  analyzeFailure(task: Task, error: string, context: ExecutionContext): Promise<ReflectionResult>;
  optimizePlan(plan: Plan, context: ExecutionContext): Promise<ReflectionResult>;
}

export interface GoalOrientedCapability {
  trackProgress(mission: Mission, context: ExecutionContext): Promise<number>; // 0-1 progress
  validateCompletion(mission: Mission, result: any, context: ExecutionContext): Promise<boolean>;
  adjustStrategy(mission: Mission, plan: Plan, context: ExecutionContext): Promise<Plan>;
}

// Main agent interface
export interface ServiceManagementAgent {
  planning: PlanningCapability;
  toolUse: ToolUseCapability;
  autonomous: AutonomousCapability;
  reflective: ReflectiveCapability;
  goalOriented: GoalOrientedCapability;
  
  // Main execution methods
  executeMission(mission: Mission): Promise<ExecutionResult>;
  pauseMission(missionId: string): Promise<void>;
  resumeMission(missionId: string): Promise<void>;
  cancelMission(missionId: string): Promise<void>;
}
