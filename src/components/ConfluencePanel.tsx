'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Search, ExternalLink, Plus, Loader2 } from 'lucide-react';

interface ConfluenceContent {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  tags: string[];
  lastIndexed: string;
}

interface SearchResult {
  id: string;
  title: string;
  summary: string;
  url: string;
  similarity: number;
  tags: string[];
}

export function ConfluencePanel() {
  const [confluenceUrl, setConfluenceUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [indexedContent, setIndexedContent] = useState<ConfluenceContent[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchIndexedContent();
  }, []);

  const fetchIndexedContent = async () => {
    try {
      const response = await fetch('/api/confluence');
      const result = await response.json();
      if (result.success) {
        setIndexedContent(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch indexed content:', error);
    }
  };

  const handleLoadConfluence = async () => {
    if (!confluenceUrl.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/confluence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'load',
          url: confluenceUrl.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setConfluenceUrl('');
        await fetchIndexedContent();
      } else {
        alert('Failed to load Confluence page: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to load Confluence page:', error);
      alert('Failed to load Confluence page');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch('/api/confluence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: searchQuery.trim(),
          limit: 5,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data.results || []);
      } else {
        alert('Search failed: ' + result.error);
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Confluence Integration</span>
        </CardTitle>
        <CardDescription>
          Load and search Confluence content for your missions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Load Confluence Page */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Load Confluence Page</h3>
          <div className="space-y-2">
            <Input
              value={confluenceUrl}
              onChange={(e) => setConfluenceUrl(e.target.value)}
              placeholder="https://your-company.atlassian.net/wiki/spaces/..."
            />
            <Button
              onClick={handleLoadConfluence}
              disabled={!confluenceUrl.trim() || loading}
              className="w-full"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Load & Index
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Search */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Search Content</h3>
          <div className="space-y-2">
            <Textarea
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question or describe what you're looking for..."
              rows={3}
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searching}
              className="w-full"
              size="sm"
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Search Results</h3>
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div key={result.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{result.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{result.summary}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                        {result.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(result.url, '_blank')}
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Indexed Content */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Indexed Content ({indexedContent.length})
          </h3>
          {indexedContent.length === 0 ? (
            <p className="text-xs text-gray-500">No content indexed yet</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {indexedContent.map((content) => (
                <div key={content.id} className="p-2 border rounded text-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{content.title}</h4>
                      <p className="text-gray-600 mt-1">{content.summary}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {content.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(content.sourceUrl, '_blank')}
                      className="h-5 w-5 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
