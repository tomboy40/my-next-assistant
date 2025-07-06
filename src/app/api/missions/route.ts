import { NextRequest, NextResponse } from 'next/server';
import db, { schema } from '@/lib/db';
import { ServiceManagementAgentImpl } from '@/lib/agent/core';
import { eq } from 'drizzle-orm';

// Initialize agent (in production, this would be a singleton)
const agent = new ServiceManagementAgentImpl({
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  debug: process.env.NODE_ENV === 'development',
});

export async function GET() {
  try {
    const missions = await db.select().from(schema.missions)
      .orderBy(schema.missions.createdAt);

    return NextResponse.json({
      success: true,
      data: missions.map(mission => ({
        ...mission,
        createdAt: mission.createdAt.toISOString(),
        updatedAt: mission.updatedAt.toISOString(),
        completedAt: mission.completedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch missions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch missions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority = 'medium' } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Create mission in database
    const [mission] = await db.insert(schema.missions).values({
      title,
      description,
      priority,
      status: 'pending',
    }).returning();

    // Start mission execution asynchronously
    const missionData = {
      ...mission,
      createdAt: new Date(mission.createdAt),
      updatedAt: new Date(mission.updatedAt),
      completedAt: mission.completedAt ? new Date(mission.completedAt) : undefined,
    };

    // Execute mission in background
    agent.executeMission(missionData).catch(error => {
      console.error(`Mission execution failed for ${mission.id}:`, error);
    });

    return NextResponse.json({
      success: true,
      data: {
        ...mission,
        createdAt: mission.createdAt.toISOString(),
        updatedAt: mission.updatedAt.toISOString(),
        completedAt: mission.completedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create mission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create mission' },
      { status: 500 }
    );
  }
}
