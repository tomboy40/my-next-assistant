import { NextRequest, NextResponse } from 'next/server';
import db, { schema } from '@/lib/db';
import { ConfluenceLoaderTool, ConfluenceSearchTool } from '@/lib/agent/tools/confluence';
import { DeepSeekClient } from '@/lib/agent/deepseek';
import { AgentLogger } from '@/lib/agent/core';

// Initialize DeepSeek client
const deepseek = new DeepSeekClient({
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
});

const confluenceLoader = new ConfluenceLoaderTool(deepseek);
const confluenceSearch = new ConfluenceSearchTool(deepseek);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, query, limit } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const logger = new AgentLogger({});

    switch (action) {
      case 'load': {
        if (!url) {
          return NextResponse.json(
            { success: false, error: 'URL is required for load action' },
            { status: 400 }
          );
        }

        const result = await confluenceLoader.execute({ url }, { 
          missionId: '',
          planId: '',
          tools: new Map(),
          cache: new Map(),
          logger,
        });

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case 'search': {
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'Query is required for search action' },
            { status: 400 }
          );
        }

        const result = await confluenceSearch.execute({ query, limit }, {
          missionId: '',
          planId: '',
          tools: new Map(),
          cache: new Map(),
          logger,
        });

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Confluence API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all indexed Confluence content
    const content = await db.select({
      id: schema.knowledgeBase.id,
      title: schema.knowledgeBase.title,
      summary: schema.knowledgeBase.summary,
      sourceUrl: schema.knowledgeBase.sourceUrl,
      tags: schema.knowledgeBase.tags,
      lastIndexed: schema.knowledgeBase.lastIndexed,
    }).from(schema.knowledgeBase)
      .where(eq(schema.knowledgeBase.sourceType, 'confluence'))
      .orderBy(schema.knowledgeBase.lastIndexed);

    return NextResponse.json({
      success: true,
      data: content.map(item => ({
        ...item,
        lastIndexed: item.lastIndexed.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch Confluence content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// Import eq from drizzle-orm
import { eq } from 'drizzle-orm';
