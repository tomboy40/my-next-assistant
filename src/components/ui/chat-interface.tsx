"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, FormEvent } from "react"
import { ArrowDown, Paperclip, Mic, CornerDownLeft, MessageSquare, Plus, Settings, User, History, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Auto-scroll hook
interface ScrollState {
  isAtBottom: boolean
  autoScrollEnabled: boolean
}

interface UseAutoScrollOptions {
  offset?: number
  smooth?: boolean
  content?: React.ReactNode
}

function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const { offset = 20, smooth = false, content } = options
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastContentHeight = useRef(0)
  const userHasScrolled = useRef(false)

  const [scrollState, setScrollState] = useState<ScrollState>({
    isAtBottom: true,
    autoScrollEnabled: true,
  })

  const checkIsAtBottom = useCallback(
    (element: HTMLElement) => {
      const { scrollTop, scrollHeight, clientHeight } = element
      const distanceToBottom = Math.abs(
        scrollHeight - scrollTop - clientHeight
      )
      return distanceToBottom <= offset
    },
    [offset]
  )

  const scrollToBottom = useCallback(
    (instant?: boolean) => {
      if (!scrollRef.current) return

      const targetScrollTop =
        scrollRef.current.scrollHeight - scrollRef.current.clientHeight

      if (instant) {
        scrollRef.current.scrollTop = targetScrollTop
      } else {
        scrollRef.current.scrollTo({
          top: targetScrollTop,
          behavior: smooth ? "smooth" : "auto",
        })
      }

      setScrollState({
        isAtBottom: true,
        autoScrollEnabled: true,
      })
      userHasScrolled.current = false
    },
    [smooth]
  )

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return

    const atBottom = checkIsAtBottom(scrollRef.current)

    setScrollState((prev) => ({
      isAtBottom: atBottom,
      autoScrollEnabled: atBottom ? true : prev.autoScrollEnabled,
    }))
  }, [checkIsAtBottom])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    element.addEventListener("scroll", handleScroll, { passive: true })
    return () => element.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const currentHeight = scrollElement.scrollHeight
    const hasNewContent = currentHeight !== lastContentHeight.current

    if (hasNewContent) {
      if (scrollState.autoScrollEnabled) {
        requestAnimationFrame(() => {
          scrollToBottom(lastContentHeight.current === 0)
        })
      }
      lastContentHeight.current = currentHeight
    }
  }, [content, scrollState.autoScrollEnabled, scrollToBottom])

  const disableAutoScroll = useCallback(() => {
    const atBottom = scrollRef.current
      ? checkIsAtBottom(scrollRef.current)
      : false

    if (!atBottom) {
      userHasScrolled.current = true
      setScrollState((prev) => ({
        ...prev,
        autoScrollEnabled: false,
      }))
    }
  }, [checkIsAtBottom])

  return {
    scrollRef,
    isAtBottom: scrollState.isAtBottom,
    autoScrollEnabled: scrollState.autoScrollEnabled,
    scrollToBottom: () => scrollToBottom(false),
    disableAutoScroll,
  }
}

// Chat Input Component
interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      autoComplete="off"
      ref={ref}
      name="message"
      className={cn(
        "max-h-12 px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center h-16 resize-none",
        className,
      )}
      {...props}
    />
  ),
)
ChatInput.displayName = "ChatInput"

// Chat Message List Component
interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ className, children, smooth = false, ...props }, _ref) => {
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    })

    return (
      <div className="relative w-full h-full">
        <div
          className={`flex flex-col w-full h-full p-4 overflow-y-auto ${className}`}
          ref={scrollRef}
          onWheel={disableAutoScroll}
          onTouchMove={disableAutoScroll}
          {...props}
        >
          <div className="flex flex-col gap-6">{children}</div>
        </div>

        {!isAtBottom && (
          <Button
            onClick={() => {
              scrollToBottom()
            }}
            size="icon"
            variant="outline"
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }
)

ChatMessageList.displayName = "ChatMessageList"

// Message Interface
interface Message {
  id: number
  content: string
  sender: "user" | "ai"
  timestamp: Date
}

interface Mission {
  id: number
  title: string
  timestamp: Date
  status: "completed" | "in-progress" | "failed"
}

export { ChatInput, ChatMessageList, useAutoScroll, type Message, type Mission }
