"use client"

import * as React from "react"
import { useState, FormEvent } from "react"
import { Paperclip, Mic, CornerDownLeft, MessageSquare, Plus, Settings, User, History, Search, FileText, Database, MoreVertical, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatInput, ChatMessageList, Message, Mission } from "@/components/ui/chat-interface"
import KnowledgeBaseManager from "@/components/KnowledgeBaseManager"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Main Chat Interface Component
const ChatGPTInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hello! I'm your AI assistant. How can I help you with your mission today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ])

  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 1,
      title: "Data Analysis Project",
      timestamp: new Date(Date.now() - 86400000),
      status: "completed",
    },
    {
      id: 2,
      title: "Market Research",
      timestamp: new Date(Date.now() - 172800000),
      status: "completed",
    },
    {
      id: 3,
      title: "Content Strategy",
      timestamp: new Date(Date.now() - 259200000),
      status: "in-progress",
    },
  ])

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<"chat" | "knowledge">("chat")
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessage: Message = {
      id: messages.length + 1,
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        content: "I understand your request. Let me help you with that mission. I'll analyze the requirements and provide you with a comprehensive solution.",
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const startNewMission = () => {
    const newMission: Mission = {
      id: missions.length + 1,
      title: "New Mission",
      timestamp: new Date(),
      status: "in-progress",
    }
    setMissions((prev) => [newMission, ...prev])
    setSelectedMissionId(newMission.id)
    setCurrentView("chat")
    setMessages([
      {
        id: 1,
        content: "Hello! I'm ready to help you with your new mission. What would you like to accomplish?",
        sender: "ai",
        timestamp: new Date(),
      },
    ])
  }

  const selectMission = (missionId: number) => {
    setSelectedMissionId(missionId)
    setCurrentView("chat")
    // Load mission-specific messages here
    setMessages([
      {
        id: 1,
        content: `Loaded mission ${missionId}. How can I help you continue with this mission?`,
        sender: "ai",
        timestamp: new Date(),
      },
    ])
  }

  const selectKnowledgeBase = () => {
    setCurrentView("knowledge")
    setSelectedMissionId(null) // Clear mission selection when switching to knowledge base
  }

  const renameMission = (missionId: number, newTitle: string) => {
    setMissions(prev =>
      prev.map(mission =>
        mission.id === missionId ? { ...mission, title: newTitle } : mission
      )
    )
  }

  const deleteMission = (missionId: number) => {
    setMissions(prev => prev.filter(mission => mission.id !== missionId))
    if (selectedMissionId === missionId) {
      setSelectedMissionId(null)
      setCurrentView("chat")
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col bg-muted/30 border-r border-border transition-all duration-300",
        sidebarOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn("text-lg font-semibold", !sidebarOpen && "sr-only")}>Mission Control</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          <div className={cn("space-y-2", !sidebarOpen && "flex flex-col items-center")}>
            <Button
              onClick={startNewMission}
              className={cn(
                "gap-2",
                sidebarOpen ? "w-full" : "w-10 h-10 p-0"
              )}
              variant="default"
              title={!sidebarOpen ? "New Mission" : undefined}
            >
              <Plus className="h-4 w-4" />
              {sidebarOpen && "New Mission"}
            </Button>
            <Button
              variant={currentView === "knowledge" && selectedMissionId === null ? "default" : "ghost"}
              className={cn(
                "gap-2",
                sidebarOpen ? "w-full justify-start" : "w-10 h-10 p-0"
              )}
              onClick={selectKnowledgeBase}
              title={!sidebarOpen ? "Knowledge Base" : undefined}
            >
              <Database className="h-4 w-4" />
              {sidebarOpen && "Knowledge Base"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {sidebarOpen && (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search missions..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Missions</h3>
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer border transition-colors group",
                      selectedMissionId === mission.id && currentView === "chat"
                        ? "bg-primary/10 border-primary/30"
                        : "bg-background hover:bg-muted/50 border-border/50"
                    )}
                    onClick={() => selectMission(mission.id)}
                  >
                    {sidebarOpen ? (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{mission.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {mission.timestamp.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            mission.status === "completed" && "bg-green-500",
                            mission.status === "in-progress" && "bg-yellow-500",
                            mission.status === "failed" && "bg-red-500"
                          )} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newTitle = prompt("Enter new mission title:", mission.title)
                                  if (newTitle && newTitle.trim()) {
                                    renameMission(mission.id, newTitle.trim())
                                  }
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm("Are you sure you want to delete this mission?")) {
                                    deleteMission(mission.id)
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          mission.status === "completed" && "bg-green-500",
                          mission.status === "in-progress" && "bg-yellow-500",
                          mission.status === "failed" && "bg-red-500"
                        )} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-muted-foreground">Free Plan</p>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!sidebarOpen && (
          <div className="p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentView === "chat" ? (
            <ChatMessageList>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 max-w-3xl",
                    message.sender === "user" ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {message.sender === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-4 py-3 max-w-[80%]",
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg px-4 py-3 bg-muted">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </ChatMessageList>
          ) : (
            <KnowledgeBaseManager />
          )}
        </div>

        {/* Input - Only show for chat view */}
        {currentView === "chat" && (
          <div className="p-4 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <form
              onSubmit={handleSubmit}
              className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1 max-w-4xl mx-auto"
            >
              <ChatInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your mission or ask for help..."
                className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center p-3 pt-0 justify-between">
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                  >
                    <Paperclip className="size-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                  >
                    <Mic className="size-4" />
                  </Button>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="ml-auto gap-1.5"
                  disabled={!input.trim() || isLoading}
                >
                  Send Mission
                  <CornerDownLeft className="size-3.5" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatGPTInterface
