'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain,
  Zap,
  MessageSquare
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'planning' | 'executing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Plan {
  id: string;
  title: string;
  description: string;
  status: string;
  estimatedDuration: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  priority: number;
  toolName?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: any;
}

interface Reflection {
  id: string;
  type: 'progress_assessment' | 'plan_optimization' | 'error_analysis' | 'success_analysis';
  content: string;
  insights?: string[];
  recommendations?: string[];
  confidence?: number;
  createdAt: string;
}

interface MissionDetails {
  mission: Mission;
  plans: Plan[];
  tasks: Task[];
  logs: ExecutionLog[];
  reflections: Reflection[];
}

interface MissionDashboardProps {
  mission: Mission;
}

export function MissionDashboard({ mission }: MissionDashboardProps) {
  const [details, setDetails] = useState<MissionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMissionDetails();
    
    // Poll for updates every 5 seconds if mission is active
    const interval = setInterval(() => {
      if (mission.status === 'executing' || mission.status === 'planning') {
        fetchMissionDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mission.id]);

  const fetchMissionDetails = async () => {
    try {
      const response = await fetch(`/api/missions/${mission.id}`);
      const result = await response.json();
      if (result.success) {
        setDetails(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch mission details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMissionAction = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(`/api/missions/${mission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await fetchMissionDetails();
      }
    } catch (error) {
      console.error(`Failed to ${action} mission:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'executing': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'planning': return <Brain className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'executing': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = () => {
    if (!details?.tasks.length) return 0;
    const completedTasks = details.tasks.filter(t => t.status === 'completed').length;
    return (completedTasks / details.tasks.length) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Target className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>Loading mission details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>Failed to load mission details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Mission Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getStatusIcon(details.mission.status)}
              <div>
                <CardTitle>{details.mission.title}</CardTitle>
                <CardDescription className="mt-1">
                  {details.mission.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(details.mission.status)}>
                {details.mission.status}
              </Badge>
              {details.mission.status === 'executing' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMissionAction('pause')}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {details.mission.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMissionAction('resume')}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              {(details.mission.status === 'executing' || details.mission.status === 'pending') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleMissionAction('cancel')}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Tasks</p>
                <p className="font-semibold">{details.tasks.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Completed</p>
                <p className="font-semibold text-green-600">
                  {details.tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">In Progress</p>
                <p className="font-semibold text-blue-600">
                  {details.tasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Failed</p>
                <p className="font-semibold text-red-600">
                  {details.tasks.filter(t => t.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasks</CardTitle>
            <CardDescription>Current execution plan</CardDescription>
          </CardHeader>
          <CardContent>
            {details.tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tasks yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {details.tasks
                  .sort((a, b) => a.priority - b.priority)
                  .map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(task.status)}
                            <h4 className="font-medium text-sm">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              Priority {task.priority}
                            </Badge>
                            {task.toolName && (
                              <Badge variant="secondary" className="text-xs">
                                {task.toolName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Logs</CardTitle>
            <CardDescription>Real-time execution updates</CardDescription>
          </CardHeader>
          <CardContent>
            {details.logs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No logs yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {details.logs
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 20)
                  .map((log) => (
                    <div key={log.id} className="text-xs p-2 border rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={log.level === 'error' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {log.level}
                            </Badge>
                            <span className="text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mt-1">{log.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reflections */}
      {details.reflections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>AI Reflections</span>
            </CardTitle>
            <CardDescription>Agent insights and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {details.reflections
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((reflection) => (
                  <div key={reflection.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {reflection.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(reflection.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{reflection.content}</p>
                    {reflection.insights && reflection.insights.length > 0 && (
                      <div className="mb-2">
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Insights:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {reflection.insights.map((insight, idx) => (
                            <li key={idx}>• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reflection.recommendations && reflection.recommendations.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Recommendations:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {reflection.recommendations.map((rec, idx) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
