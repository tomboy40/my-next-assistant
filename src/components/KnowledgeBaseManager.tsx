"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  RefreshCw,
  Trash2,
  Eye,
  Calendar,
  Hash,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Upload,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface KnowledgeItem {
  id: string
  title: string
  url: string
  lastIndexed: Date
  status: "indexed" | "failed" | "pending"
  wordCount: number
  tags: string[]
  content?: string
}

interface KnowledgeBaseManagerProps {
  className?: string
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ className }) => {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([
    {
      id: "1",
      title: "API Documentation - Authentication",
      url: "https://confluence.company.com/api/auth",
      lastIndexed: new Date(Date.now() - 86400000),
      status: "indexed",
      wordCount: 1250,
      tags: ["API", "Authentication", "Security"]
    },
    {
      id: "2",
      title: "Service Deployment Guide",
      url: "https://confluence.company.com/deployment/guide",
      lastIndexed: new Date(Date.now() - 172800000),
      status: "indexed",
      wordCount: 2100,
      tags: ["Deployment", "DevOps", "Guide"]
    },
    {
      id: "3",
      title: "Database Schema Documentation",
      url: "https://confluence.company.com/db/schema",
      lastIndexed: new Date(Date.now() - 259200000),
      status: "failed",
      wordCount: 0,
      tags: ["Database", "Schema"]
    }
  ])

  const [newUrls, setNewUrls] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isIndexing, setIsIndexing] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleAddUrls = async () => {
    const urls = newUrls.split('\n').filter(url => url.trim())
    if (urls.length === 0) return

    setIsIndexing(true)

    urls.forEach((url, index) => {
      const newItem: KnowledgeItem = {
        id: `new-${Date.now()}-${index}`,
        title: "Loading...",
        url: url.trim(),
        lastIndexed: new Date(),
        status: "pending",
        wordCount: 0,
        tags: []
      }

      setKnowledgeItems(prev => [newItem, ...prev])
    })

    setNewUrls("")
    setIsAddDialogOpen(false)

    // Simulate indexing process
    setTimeout(() => {
      setKnowledgeItems(prev =>
        prev.map(item =>
          item.status === "pending"
            ? { ...item, title: `Knowledge Item ${Math.floor(Math.random() * 1000)}`, status: "indexed" as const, wordCount: Math.floor(Math.random() * 2000) + 500, tags: ["New"] }
            : item
        )
      )
      setIsIndexing(false)
    }, 2000)
  }

  const handleReindex = (id: string) => {
    setKnowledgeItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "pending" as const, lastIndexed: new Date() } : item
      )
    )

    // Simulate reindexing
    setTimeout(() => {
      setKnowledgeItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status: "indexed" as const, wordCount: Math.floor(Math.random() * 2000) + 500 } : item
        )
      )
    }, 1500)
  }

  const handleDelete = (id: string) => {
    setKnowledgeItems(prev => prev.filter(item => item.id !== id))
    setSelectedItems(prev => prev.filter(itemId => itemId !== id))
  }

  const handleBulkDelete = () => {
    setKnowledgeItems(prev => prev.filter(item => !selectedItems.includes(item.id)))
    setSelectedItems([])
  }

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "indexed": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "indexed": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Indexed</Badge>
      case "failed": return <Badge variant="destructive">Failed</Badge>
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  const filteredItems = knowledgeItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  return (
    <div className={cn("w-full h-full p-6 overflow-y-auto", className)}>
      {/* Action Button */}
      <div className="flex justify-end mb-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Knowledge Content</DialogTitle>
              <DialogDescription>
                Add Confluence URLs to your knowledge base. Enter one URL per line for multiple imports.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="https://confluence.company.com/page1&#10;https://confluence.company.com/page2&#10;https://confluence.company.com/page3"
                value={newUrls}
                onChange={(e) => setNewUrls(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {newUrls.split('\n').filter(url => url.trim()).length} URLs ready to import
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUrls} disabled={!newUrls.trim() || isIndexing}>
                    {isIndexing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Indexing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Add URLs
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Total: {knowledgeItems.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Indexed: {knowledgeItems.filter(item => item.status === "indexed").length}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span>Failed: {knowledgeItems.filter(item => item.status === "failed").length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span>Pending: {knowledgeItems.filter(item => item.status === "pending").length}</span>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, URL, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedItems.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reindex Selected ({selectedItems.length})
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedItems.length})
            </Button>
          </div>
        )}
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Content List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery ? "No items match your search" : "No knowledge base items found. Add some content to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* Pagination Info */}
            <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            {paginatedItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <h4 className="font-medium">{item.title}</h4>
                            {getStatusBadge(item.status)}
                          </div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {item.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleReindex(item.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.lastIndexed.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {item.wordCount.toLocaleString()} words
                        </div>
                      </div>

                      {item.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default KnowledgeBaseManager
