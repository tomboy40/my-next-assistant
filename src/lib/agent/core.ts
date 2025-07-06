import {
  ServiceManagementAgent,
  PlanningCapability,
  ToolUseCapability,
  AutonomousCapability,
  ReflectiveCapability,
  GoalOrientedCapability,
  Mission,
  Plan,
  Task,
  ExecutionContext,
  ExecutionResult,
  PlanningResult,
  ReflectionResult,
  ToolResult,
  Tool,
  AgentConfig,
  Logger,
} from './types';
import { DeepSeekClient } from './deepseek';
import { ToolRegistry } from './tools/base';
import { ConfluenceLoaderTool, ConfluenceSearchTool } from './tools/confluence';
import db, { schema } from '../db';
import { eq, and } from 'drizzle-orm';
import NodeCache from 'node-cache';

export class AgentLogger implements Logger {
  constructor(private context: { missionId?: string; planId?: string; taskId?: string }) {}

  private async log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
    console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    
    // Store in database
    try {
      await db.insert(schema.executionLogs).values({
        missionId: this.context.missionId,
        planId: this.context.planId,
        taskId: this.context.taskId,
        level,
        message,
        data,
      });
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  debug(message: string, data?: any) { this.log('debug', message, data); }
  info(message: string, data?: any) { this.log('info', message, data); }
  warn(message: string, data?: any) { this.log('warn', message, data); }
  error(message: string, data?: any) { this.log('error', message, data); }
}

export class PlanningEngine implements PlanningCapability {
  constructor(private deepseek: DeepSeekClient) {}

  async createPlan(mission: Mission, context: ExecutionContext): Promise<PlanningResult> {
    context.logger.info(`Creating plan for mission: ${mission.title}`);

    try {
      const planResponse = await this.deepseek.generatePlan(
        `${mission.title}\n\n${mission.description}`,
        `Priority: ${mission.priority}`
      );

      const planData = JSON.parse(planResponse);
      
      // Create plan in database
      const [newPlan] = await db.insert(schema.plans).values({
        missionId: mission.id,
        title: planData.title,
        description: planData.description,
        estimatedDuration: planData.estimatedDuration,
        status: 'draft',
      }).returning();

      // Create tasks
      const tasks: Task[] = [];
      for (const taskData of planData.tasks) {
        const [newTask] = await db.insert(schema.tasks).values({
          planId: newPlan.id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          toolName: taskData.toolName,
          toolParams: taskData.toolParams,
          dependencies: taskData.dependencies,
          estimatedDuration: taskData.estimatedDuration,
        }).returning();

        tasks.push({
          ...newTask,
          createdAt: new Date(newTask.createdAt),
          updatedAt: new Date(newTask.updatedAt),
        });
      }

      const plan: Plan = {
        ...newPlan,
        tasks,
        createdAt: new Date(newPlan.createdAt),
        updatedAt: new Date(newPlan.updatedAt),
      };

      return {
        plan,
        reasoning: planData.reasoning,
        confidence: planData.confidence,
      };

    } catch (error) {
      context.logger.error(`Failed to create plan: ${error}`);
      throw error;
    }
  }

  async updatePlan(plan: Plan, feedback: string, context: ExecutionContext): Promise<PlanningResult> {
    context.logger.info(`Updating plan: ${plan.title}`);

    try {
      const updateResponse = await this.deepseek.generatePlan(
        `Update this plan based on feedback:\n\nOriginal Plan: ${JSON.stringify(plan, null, 2)}\n\nFeedback: ${feedback}`
      );

      const updatedData = JSON.parse(updateResponse);
      
      // Update plan in database
      await db.update(schema.plans)
        .set({
          title: updatedData.title,
          description: updatedData.description,
          estimatedDuration: updatedData.estimatedDuration,
          version: plan.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(schema.plans.id, plan.id));

      // Update tasks (simplified - in production, you'd handle this more carefully)
      await db.delete(schema.tasks).where(eq(schema.tasks.planId, plan.id));
      
      const tasks: Task[] = [];
      for (const taskData of updatedData.tasks) {
        const [newTask] = await db.insert(schema.tasks).values({
          planId: plan.id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          toolName: taskData.toolName,
          toolParams: taskData.toolParams,
          dependencies: taskData.dependencies,
          estimatedDuration: taskData.estimatedDuration,
        }).returning();

        tasks.push({
          ...newTask,
          createdAt: new Date(newTask.createdAt),
          updatedAt: new Date(newTask.updatedAt),
        });
      }

      const updatedPlan: Plan = {
        ...plan,
        title: updatedData.title,
        description: updatedData.description,
        estimatedDuration: updatedData.estimatedDuration,
        version: plan.version + 1,
        tasks,
        updatedAt: new Date(),
      };

      return {
        plan: updatedPlan,
        reasoning: updatedData.reasoning,
        confidence: updatedData.confidence,
      };

    } catch (error) {
      context.logger.error(`Failed to update plan: ${error}`);
      throw error;
    }
  }

  async decomposeTasks(task: Task, context: ExecutionContext): Promise<Task[]> {
    context.logger.info(`Decomposing task: ${task.title}`);

    try {
      const decompositionResponse = await this.deepseek.generatePlan(
        `Decompose this task into smaller subtasks:\n\n${JSON.stringify(task, null, 2)}`
      );

      const decompositionData = JSON.parse(decompositionResponse);
      
      const subtasks: Task[] = [];
      for (const subtaskData of decompositionData.tasks) {
        const [newSubtask] = await db.insert(schema.tasks).values({
          planId: task.planId,
          parentTaskId: task.id,
          title: subtaskData.title,
          description: subtaskData.description,
          priority: subtaskData.priority,
          toolName: subtaskData.toolName,
          toolParams: subtaskData.toolParams,
          dependencies: subtaskData.dependencies,
          estimatedDuration: subtaskData.estimatedDuration,
        }).returning();

        subtasks.push({
          ...newSubtask,
          createdAt: new Date(newSubtask.createdAt),
          updatedAt: new Date(newSubtask.updatedAt),
        });
      }

      return subtasks;

    } catch (error) {
      context.logger.error(`Failed to decompose task: ${error}`);
      throw error;
    }
  }
}

export class ToolUseEngine implements ToolUseCapability {
  constructor(
    private deepseek: DeepSeekClient,
    private toolRegistry: ToolRegistry
  ) {}

  getAvailableTools(): Tool[] {
    return this.toolRegistry.getAll();
  }

  async selectTool(task: Task, context: ExecutionContext): Promise<Tool | null> {
    if (task.toolName) {
      return this.toolRegistry.get(task.toolName) || null;
    }

    try {
      const selectionResponse = await this.deepseek.selectTool(
        task,
        this.toolRegistry.getNames()
      );

      const selectionData = JSON.parse(selectionResponse);
      return this.toolRegistry.get(selectionData.selectedTool) || null;

    } catch (error) {
      context.logger.error(`Failed to select tool: ${error}`);
      return null;
    }
  }

  async executeTool(tool: Tool, params: Record<string, any>, context: ExecutionContext): Promise<ToolResult> {
    context.logger.info(`Executing tool: ${tool.name}`);

    const startTime = Date.now();
    try {
      const result = await tool.execute(params, context);
      const duration = Date.now() - startTime;

      // Log tool usage
      await db.insert(schema.toolUsage).values({
        taskId: context.taskId,
        toolName: tool.name,
        parameters: params,
        result: result.data,
        success: result.success,
        duration,
        errorMessage: result.error,
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      await db.insert(schema.toolUsage).values({
        taskId: context.taskId,
        toolName: tool.name,
        parameters: params,
        result: null,
        success: false,
        duration,
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  }
}

export class AutonomousEngine implements AutonomousCapability {
  constructor(
    private toolUse: ToolUseEngine,
    private deepseek: DeepSeekClient
  ) {}

  async executeTask(task: Task, context: ExecutionContext): Promise<ToolResult> {
    context.logger.info(`Executing task: ${task.title}`);

    try {
      // Update task status to in_progress
      await db.update(schema.tasks)
        .set({ status: 'in_progress', startedAt: new Date() })
        .where(eq(schema.tasks.id, task.id));

      // Select appropriate tool
      const tool = await this.toolUse.selectTool(task, context);
      if (!tool) {
        throw new Error(`No suitable tool found for task: ${task.title}`);
      }

      // Execute the tool
      const result = await this.toolUse.executeTool(
        tool,
        task.toolParams || {},
        { ...context, taskId: task.id }
      );

      // Update task status based on result
      const status = result.success ? 'completed' : 'failed';
      await db.update(schema.tasks)
        .set({
          status,
          completedAt: new Date(),
          result: result.data,
        })
        .where(eq(schema.tasks.id, task.id));

      return result;

    } catch (error) {
      context.logger.error(`Task execution failed: ${error}`);

      await db.update(schema.tasks)
        .set({
          status: 'failed',
          completedAt: new Date(),
          result: { error: (error as Error).message },
        })
        .where(eq(schema.tasks.id, task.id));

      throw error;
    }
  }

  async executePlan(plan: Plan, context: ExecutionContext): Promise<ExecutionResult> {
    context.logger.info(`Executing plan: ${plan.title}`);

    const completedTasks: Task[] = [];
    const failedTasks: Task[] = [];
    const reflections: any[] = [];

    try {
      // Update plan status to active
      await db.update(schema.plans)
        .set({ status: 'active' })
        .where(eq(schema.plans.id, plan.id));

      // Execute tasks in priority order, respecting dependencies
      const sortedTasks = this.sortTasksByPriorityAndDependencies(plan.tasks);

      for (const task of sortedTasks) {
        try {
          // Check if dependencies are completed
          if (task.dependencies && task.dependencies.length > 0) {
            const dependencyStatuses = await db.select()
              .from(schema.tasks)
              .where(and(
                eq(schema.tasks.planId, plan.id),
                // Note: In production, you'd use a proper IN clause
              ));

            const incompleteDeps = task.dependencies.filter(depId =>
              !dependencyStatuses.find(t => t.id === depId && t.status === 'completed')
            );

            if (incompleteDeps.length > 0) {
              context.logger.warn(`Skipping task ${task.title} due to incomplete dependencies`);
              continue;
            }
          }

          const result = await this.executeTask(task, context);
          if (result.success) {
            completedTasks.push(task);
          } else {
            failedTasks.push(task);
          }

        } catch (error) {
          context.logger.error(`Task failed: ${task.title}`, error);
          failedTasks.push(task);
        }
      }

      // Update plan status
      const finalStatus = failedTasks.length === 0 ? 'completed' : 'failed';
      await db.update(schema.plans)
        .set({ status: finalStatus })
        .where(eq(schema.plans.id, plan.id));

      return {
        success: failedTasks.length === 0,
        completedTasks,
        failedTasks,
        reflections,
      };

    } catch (error) {
      context.logger.error(`Plan execution failed: ${error}`);

      await db.update(schema.plans)
        .set({ status: 'failed' })
        .where(eq(schema.plans.id, plan.id));

      return {
        success: false,
        completedTasks,
        failedTasks,
        reflections,
        error: (error as Error).message,
      };
    }
  }

  async handleError(error: Error, context: ExecutionContext): Promise<void> {
    context.logger.error(`Handling error: ${error.message}`);

    // Store error analysis
    await db.insert(schema.reflections).values({
      missionId: context.missionId,
      planId: context.planId,
      taskId: context.taskId,
      type: 'error_analysis',
      content: error.message,
      insights: [`Error occurred: ${error.message}`],
      recommendations: ['Review task parameters', 'Check tool availability'],
      confidence: 0.8,
    });
  }

  private sortTasksByPriorityAndDependencies(tasks: Task[]): Task[] {
    // Simple topological sort with priority consideration
    const sorted: Task[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (task: Task) => {
      if (visiting.has(task.id)) {
        throw new Error(`Circular dependency detected involving task: ${task.title}`);
      }
      if (visited.has(task.id)) return;

      visiting.add(task.id);

      // Visit dependencies first
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const depTask = tasks.find(t => t.id === depId);
          if (depTask) {
            visit(depTask);
          }
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };

    // Sort by priority first, then visit
    const prioritySorted = [...tasks].sort((a, b) => a.priority - b.priority);
    for (const task of prioritySorted) {
      visit(task);
    }

    return sorted;
  }
}

export class ReflectiveEngine implements ReflectiveCapability {
  constructor(private deepseek: DeepSeekClient) {}

  async assessProgress(plan: Plan, context: ExecutionContext): Promise<ReflectionResult> {
    context.logger.info(`Assessing progress for plan: ${plan.title}`);

    try {
      // Get current task statuses
      const tasks = await db.select().from(schema.tasks)
        .where(eq(schema.tasks.planId, plan.id));

      const completedTasks = tasks.filter(t => t.status === 'completed');
      const failedTasks = tasks.filter(t => t.status === 'failed');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

      const progressData = {
        plan,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        failedTasks: failedTasks.length,
        inProgressTasks: inProgressTasks.length,
        progressPercentage: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      };

      const reflectionResponse = await this.deepseek.reflect('progress_assessment', progressData);
      const reflectionData = JSON.parse(reflectionResponse);

      // Store reflection
      await db.insert(schema.reflections).values({
        missionId: context.missionId,
        planId: context.planId,
        type: 'progress_assessment',
        content: reflectionData.reasoning,
        insights: reflectionData.insights,
        recommendations: reflectionData.recommendations,
        confidence: reflectionData.confidence,
      });

      return {
        insights: reflectionData.insights,
        recommendations: reflectionData.recommendations,
        confidence: reflectionData.confidence,
      };

    } catch (error) {
      context.logger.error(`Failed to assess progress: ${error}`);
      throw error;
    }
  }

  async analyzeFailure(task: Task, error: string, context: ExecutionContext): Promise<ReflectionResult> {
    context.logger.info(`Analyzing failure for task: ${task.title}`);

    try {
      const failureData = { task, error };
      const reflectionResponse = await this.deepseek.reflect('error_analysis', failureData);
      const reflectionData = JSON.parse(reflectionResponse);

      // Store reflection
      await db.insert(schema.reflections).values({
        missionId: context.missionId,
        planId: context.planId,
        taskId: task.id,
        type: 'error_analysis',
        content: reflectionData.reasoning,
        insights: reflectionData.insights,
        recommendations: reflectionData.recommendations,
        confidence: reflectionData.confidence,
      });

      return {
        insights: reflectionData.insights,
        recommendations: reflectionData.recommendations,
        confidence: reflectionData.confidence,
      };

    } catch (error) {
      context.logger.error(`Failed to analyze failure: ${error}`);
      throw error;
    }
  }

  async optimizePlan(plan: Plan, context: ExecutionContext): Promise<ReflectionResult> {
    context.logger.info(`Optimizing plan: ${plan.title}`);

    try {
      // Get execution history and performance data
      const tasks = await db.select().from(schema.tasks)
        .where(eq(schema.tasks.planId, plan.id));

      const toolUsage = await db.select().from(schema.toolUsage)
        .where(eq(schema.toolUsage.taskId, tasks[0]?.id || ''));

      const optimizationData = { plan, tasks, toolUsage };
      const reflectionResponse = await this.deepseek.reflect('plan_optimization', optimizationData);
      const reflectionData = JSON.parse(reflectionResponse);

      // Store reflection
      await db.insert(schema.reflections).values({
        missionId: context.missionId,
        planId: context.planId,
        type: 'plan_optimization',
        content: reflectionData.reasoning,
        insights: reflectionData.insights,
        recommendations: reflectionData.recommendations,
        confidence: reflectionData.confidence,
      });

      return {
        insights: reflectionData.insights,
        recommendations: reflectionData.recommendations,
        confidence: reflectionData.confidence,
      };

    } catch (error) {
      context.logger.error(`Failed to optimize plan: ${error}`);
      throw error;
    }
  }
}

export class GoalOrientedEngine implements GoalOrientedCapability {
  constructor(private deepseek: DeepSeekClient) {}

  async trackProgress(mission: Mission, context: ExecutionContext): Promise<number> {
    context.logger.info(`Tracking progress for mission: ${mission.title}`);

    try {
      // Get all plans for this mission
      const plans = await db.select().from(schema.plans)
        .where(eq(schema.plans.missionId, mission.id));

      if (plans.length === 0) return 0;

      // Get all tasks for all plans
      const allTasks = await db.select().from(schema.tasks)
        .where(eq(schema.tasks.planId, plans[0].id)); // Simplified for demo

      const completedTasks = allTasks.filter(t => t.status === 'completed');
      const progress = allTasks.length > 0 ? completedTasks.length / allTasks.length : 0;

      return Math.min(progress, 1.0);

    } catch (error) {
      context.logger.error(`Failed to track progress: ${error}`);
      return 0;
    }
  }

  async validateCompletion(mission: Mission, result: any, context: ExecutionContext): Promise<boolean> {
    context.logger.info(`Validating completion for mission: ${mission.title}`);

    try {
      const assessmentResponse = await this.deepseek.assessCompletion(mission, result);
      const assessmentData = JSON.parse(assessmentResponse);

      return assessmentData.completed && assessmentData.completionPercentage >= 0.9;

    } catch (error) {
      context.logger.error(`Failed to validate completion: ${error}`);
      return false;
    }
  }

  async adjustStrategy(mission: Mission, plan: Plan, context: ExecutionContext): Promise<Plan> {
    context.logger.info(`Adjusting strategy for mission: ${mission.title}`);

    try {
      // Get current progress and performance data
      const progress = await this.trackProgress(mission, context);

      if (progress < 0.5) {
        // If progress is low, consider plan adjustments
        const adjustmentData = { mission, plan, progress };
        const adjustmentResponse = await this.deepseek.generatePlan(
          `Adjust this plan to improve progress:\n\n${JSON.stringify(adjustmentData, null, 2)}`
        );

        const adjustmentPlan = JSON.parse(adjustmentResponse);

        // Create new plan version
        const [newPlan] = await db.insert(schema.plans).values({
          missionId: mission.id,
          version: plan.version + 1,
          title: adjustmentPlan.title,
          description: adjustmentPlan.description,
          estimatedDuration: adjustmentPlan.estimatedDuration,
          status: 'draft',
        }).returning();

        // Mark old plan as superseded
        await db.update(schema.plans)
          .set({ status: 'superseded' })
          .where(eq(schema.plans.id, plan.id));

        return {
          ...newPlan,
          tasks: [], // Tasks would be created separately
          createdAt: new Date(newPlan.createdAt),
          updatedAt: new Date(newPlan.updatedAt),
        };
      }

      return plan; // No adjustment needed

    } catch (error) {
      context.logger.error(`Failed to adjust strategy: ${error}`);
      return plan;
    }
  }
}

export class ServiceManagementAgentImpl implements ServiceManagementAgent {
  public planning: PlanningCapability;
  public toolUse: ToolUseCapability;
  public autonomous: AutonomousCapability;
  public reflective: ReflectiveCapability;
  public goalOriented: GoalOrientedCapability;

  private deepseek: DeepSeekClient;
  private toolRegistry: ToolRegistry;
  private cache: NodeCache;

  constructor(config: AgentConfig) {
    this.deepseek = new DeepSeekClient(config);
    this.toolRegistry = new ToolRegistry();
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

    // Initialize capabilities
    this.planning = new PlanningEngine(this.deepseek);
    this.toolUse = new ToolUseEngine(this.deepseek, this.toolRegistry);
    this.autonomous = new AutonomousEngine(this.toolUse as ToolUseEngine, this.deepseek);
    this.reflective = new ReflectiveEngine(this.deepseek);
    this.goalOriented = new GoalOrientedEngine(this.deepseek);

    // Register default tools
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    this.toolRegistry.register(new ConfluenceLoaderTool(this.deepseek));
    this.toolRegistry.register(new ConfluenceSearchTool(this.deepseek));
  }

  async executeMission(mission: Mission): Promise<ExecutionResult> {
    const logger = new AgentLogger({ missionId: mission.id });
    logger.info(`Starting mission execution: ${mission.title}`);

    try {
      // Update mission status
      await db.update(schema.missions)
        .set({ status: 'planning' })
        .where(eq(schema.missions.id, mission.id));

      // Create execution context
      const context: ExecutionContext = {
        missionId: mission.id,
        planId: '',
        tools: new Map(this.toolRegistry.getAll().map(tool => [tool.name, tool])),
        cache: this.cache,
        logger,
      };

      // Create initial plan
      const planningResult = await this.planning.createPlan(mission, context);
      context.planId = planningResult.plan.id;

      // Update mission status to executing
      await db.update(schema.missions)
        .set({ status: 'executing' })
        .where(eq(schema.missions.id, mission.id));

      // Execute the plan
      const executionResult = await this.autonomous.executePlan(planningResult.plan, context);

      // Assess final completion
      const isCompleted = await this.goalOriented.validateCompletion(
        mission,
        executionResult,
        context
      );

      // Update mission status
      const finalStatus = isCompleted ? 'completed' : 'failed';
      await db.update(schema.missions)
        .set({
          status: finalStatus,
          completedAt: isCompleted ? new Date() : undefined,
        })
        .where(eq(schema.missions.id, mission.id));

      logger.info(`Mission ${isCompleted ? 'completed' : 'failed'}: ${mission.title}`);

      return {
        ...executionResult,
        success: isCompleted,
      };

    } catch (error) {
      logger.error(`Mission execution failed: ${error}`);

      await db.update(schema.missions)
        .set({ status: 'failed' })
        .where(eq(schema.missions.id, mission.id));

      return {
        success: false,
        completedTasks: [],
        failedTasks: [],
        reflections: [],
        error: (error as Error).message,
      };
    }
  }

  async pauseMission(missionId: string): Promise<void> {
    // Implementation for pausing mission
    await db.update(schema.missions)
      .set({ status: 'pending' })
      .where(eq(schema.missions.id, missionId));
  }

  async resumeMission(missionId: string): Promise<void> {
    // Implementation for resuming mission
    const mission = await db.select().from(schema.missions)
      .where(eq(schema.missions.id, missionId))
      .limit(1);

    if (mission.length > 0) {
      await this.executeMission({
        ...mission[0],
        createdAt: new Date(mission[0].createdAt),
        updatedAt: new Date(mission[0].updatedAt),
        completedAt: mission[0].completedAt ? new Date(mission[0].completedAt) : undefined,
      });
    }
  }

  async cancelMission(missionId: string): Promise<void> {
    // Implementation for canceling mission
    await db.update(schema.missions)
      .set({ status: 'failed' })
      .where(eq(schema.missions.id, missionId));
  }
}
