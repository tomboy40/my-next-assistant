import { BaseTool } from './base';
import { ToolResult, ExecutionContext } from '../types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { DeepSeekClient } from '../deepseek';
import db, { schema } from '../../db';

export interface ConfluenceConfig {
  baseUrl?: string;
  username?: string;
  apiToken?: string;
}

export class ConfluenceLoaderTool extends BaseTool {
  name = 'confluence_loader';
  description = 'Load and index content from Confluence pages';
  parameters = {
    url: { type: 'string', required: true, description: 'Confluence page URL' },
    includeAttachments: { type: 'boolean', required: false, description: 'Whether to include attachments' },
  };

  private deepseek: DeepSeekClient;
  private config: ConfluenceConfig;

  constructor(deepseek: DeepSeekClient, config: ConfluenceConfig = {}) {
    super();
    this.deepseek = deepseek;
    this.config = config;
  }

  async execute(params: Record<string, any>, context?: ExecutionContext): Promise<ToolResult> {
    try {
      this.validateParams(params, ['url']);
      
      const { url, includeAttachments = false } = params;
      
      context?.logger.info(`Loading Confluence page: ${url}`);

      // Extract content from the page
      const content = await this.extractPageContent(url);
      
      // Generate embedding for the content
      const embedding = await this.deepseek.generateEmbedding(content.text);
      
      // Store in knowledge base
      const knowledgeEntry = await db.insert(schema.knowledgeBase).values({
        sourceType: 'confluence',
        sourceUrl: url,
        title: content.title,
        content: content.text,
        summary: content.summary,
        tags: content.tags,
        embedding,
        metadata: {
          includeAttachments,
          wordCount: content.text.split(' ').length,
          extractedAt: new Date().toISOString(),
        },
      }).returning();

      context?.logger.info(`Successfully indexed Confluence page: ${content.title}`);

      return this.createResult(true, {
        id: knowledgeEntry[0].id,
        title: content.title,
        wordCount: content.text.split(' ').length,
        url,
      });

    } catch (error) {
      context?.logger.error(`Failed to load Confluence page: ${error}`);
      return this.createResult(false, null, (error as Error).message);
    }
  }

  private async extractPageContent(url: string): Promise<{
    title: string;
    text: string;
    summary: string;
    tags: string[];
  }> {
    try {
      // For demo purposes, we'll use web scraping
      // In production, you'd use the Confluence REST API
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ServiceAgent/1.0)',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
      
      // Extract main content
      let text = '';
      
      // Try common Confluence content selectors
      const contentSelectors = [
        '#main-content',
        '.wiki-content',
        '.page-content',
        'main',
        '.content',
        'article',
      ];

      for (const selector of contentSelectors) {
        const content = $(selector);
        if (content.length > 0) {
          // Remove script and style elements
          content.find('script, style, nav, header, footer').remove();
          text = content.text().trim();
          break;
        }
      }

      // Fallback to body content if no specific content area found
      if (!text) {
        $('script, style, nav, header, footer').remove();
        text = $('body').text().trim();
      }

      // Clean up the text
      text = text.replace(/\s+/g, ' ').trim();

      // Generate summary (first 200 words)
      const words = text.split(' ');
      const summary = words.slice(0, 200).join(' ') + (words.length > 200 ? '...' : '');

      // Extract potential tags from headings and meta tags
      const tags: string[] = [];
      
      // From headings
      $('h1, h2, h3').each((_, el) => {
        const heading = $(el).text().trim();
        if (heading && heading.length < 50) {
          tags.push(heading.toLowerCase());
        }
      });

      // From meta keywords
      const metaKeywords = $('meta[name="keywords"]').attr('content');
      if (metaKeywords) {
        tags.push(...metaKeywords.split(',').map(tag => tag.trim().toLowerCase()));
      }

      // Remove duplicates and limit to 10 tags
      const uniqueTags = [...new Set(tags)].slice(0, 10);

      return {
        title,
        text,
        summary,
        tags: uniqueTags,
      };

    } catch (error) {
      throw new Error(`Failed to extract content from ${url}: ${(error as Error).message}`);
    }
  }
}

export class ConfluenceSearchTool extends BaseTool {
  name = 'confluence_search';
  description = 'Search indexed Confluence content using natural language';
  parameters = {
    query: { type: 'string', required: true, description: 'Natural language search query' },
    limit: { type: 'number', required: false, description: 'Maximum number of results to return' },
  };

  private deepseek: DeepSeekClient;

  constructor(deepseek: DeepSeekClient) {
    super();
    this.deepseek = deepseek;
  }

  async execute(params: Record<string, any>, context?: ExecutionContext): Promise<ToolResult> {
    try {
      this.validateParams(params, ['query']);
      
      const { query, limit = 5 } = params;
      
      context?.logger.info(`Searching Confluence content for: ${query}`);

      // Generate embedding for the search query
      const queryEmbedding = await this.deepseek.generateEmbedding(query);

      // Search for similar content using vector similarity
      // Note: This is a simplified implementation. In production, you'd use a proper vector database
      const allContent = await db.select().from(schema.knowledgeBase)
        .where(eq(schema.knowledgeBase.sourceType, 'confluence'));

      // Calculate cosine similarity for each document
      const results = allContent
        .map(doc => ({
          ...doc,
          similarity: this.cosineSimilarity(queryEmbedding, doc.embedding || []),
        }))
        .filter(doc => doc.similarity > 0.3) // Minimum similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      context?.logger.info(`Found ${results.length} relevant documents`);

      return this.createResult(true, {
        query,
        results: results.map(doc => ({
          id: doc.id,
          title: doc.title,
          summary: doc.summary,
          url: doc.sourceUrl,
          similarity: doc.similarity,
          tags: doc.tags,
        })),
        totalFound: results.length,
      });

    } catch (error) {
      context?.logger.error(`Failed to search Confluence content: ${error}`);
      return this.createResult(false, null, (error as Error).message);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Import eq from drizzle-orm
import { eq } from 'drizzle-orm';
