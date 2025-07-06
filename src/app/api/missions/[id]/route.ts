import { NextRequest, NextResponse } from 'next/server';
import db, { schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const missionId = params.id;

    // Get mission details
    const mission = await db.select().from(schema.missions)
      .where(eq(schema.missions.id, missionId))
      .limit(1);

    if (mission.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    // Get associated plans
    const plans = await db.select().from(schema.plans)
      .where(eq(schema.plans.missionId, missionId));

    // Get tasks for all plans
    const tasks = plans.length > 0 ? await db.select().from(schema.tasks)
      .where(eq(schema.tasks.planId, plans[0].id)) : [];

    // Get execution logs
    const logs = await db.select().from(schema.executionLogs)
      .where(eq(schema.executionLogs.missionId, missionId))
      .orderBy(schema.executionLogs.timestamp);

    // Get reflections
    const reflections = await db.select().from(schema.reflections)
      .where(eq(schema.reflections.missionId, missionId))
      .orderBy(schema.reflections.createdAt);

    return NextResponse.json({
      success: true,
      data: {
        mission: {
          ...mission[0],
          createdAt: mission[0].createdAt.toISOString(),
          updatedAt: mission[0].updatedAt.toISOString(),
          completedAt: mission[0].completedAt?.toISOString(),
        },
        plans: plans.map(plan => ({
          ...plan,
          createdAt: plan.createdAt.toISOString(),
          updatedAt: plan.updatedAt.toISOString(),
        })),
        tasks: tasks.map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          startedAt: task.startedAt?.toISOString(),
          completedAt: task.completedAt?.toISOString(),
        })),
        logs: logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString(),
        })),
        reflections: reflections.map(reflection => ({
          ...reflection,
          createdAt: reflection.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch mission details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mission details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const missionId = params.id;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'pause':
        await db.update(schema.missions)
          .set({ status: 'pending' })
          .where(eq(schema.missions.id, missionId));
        break;

      case 'resume':
        await db.update(schema.missions)
          .set({ status: 'executing' })
          .where(eq(schema.missions.id, missionId));
        break;

      case 'cancel':
        await db.update(schema.missions)
          .set({ status: 'failed' })
          .where(eq(schema.missions.id, missionId));
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update mission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update mission' },
      { status: 500 }
    );
  }
}
