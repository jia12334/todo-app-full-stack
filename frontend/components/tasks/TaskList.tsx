"use client";

import { TaskItem } from "./TaskItem";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string | null;
}

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onUpdate: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function TaskList({
  tasks,
  isLoading = false,
  onToggle,
  onUpdate,
  onDelete,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm mt-1">Add a task to get started!</p>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        {completedCount} of {totalCount} tasks completed
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
