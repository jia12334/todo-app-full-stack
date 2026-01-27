"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api-client";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string | null;
}

export default function TasksPage() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      setError("");
      const data = await api.get<Task[]>("/api/tasks");
      setTasks(data);
    } catch (err) {
      setError("Failed to load tasks");
      console.error("Fetch tasks error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionLoading && session) {
      fetchTasks();
    }
  }, [isSessionLoading, session, fetchTasks]);

  const handleCreateTask = async (title: string) => {
    setIsCreating(true);
    try {
      const newTask = await api.post<Task>("/api/tasks", { title });
      setTasks((prev) => [newTask, ...prev]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTask = async (id: number, completed: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed } : task
      )
    );

    try {
      await api.patch<Task>(`/api/tasks/${id}`, { completed });
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, completed: !completed } : task
        )
      );
      console.error("Toggle task error:", err);
    }
  };

  const handleUpdateTask = async (id: number, title: string) => {
    const originalTask = tasks.find((t) => t.id === id);
    if (!originalTask) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, title } : task
      )
    );

    try {
      await api.put<Task>(`/api/tasks/${id}`, {
        title,
        completed: originalTask.completed,
      });
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, title: originalTask.title } : task
        )
      );
      console.error("Update task error:", err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    const deletedTask = tasks.find((t) => t.id === id);
    if (!deletedTask) return;

    // Optimistic update
    setTasks((prev) => prev.filter((task) => task.id !== id));

    try {
      await api.delete(`/api/tasks/${id}`);
    } catch (err) {
      // Revert on error
      setTasks((prev) => [...prev, deletedTask].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      console.error("Delete task error:", err);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Tasks</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session?.user?.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
            <button
              onClick={fetchTasks}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <TaskForm onSubmit={handleCreateTask} isLoading={isCreating} />

        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          onToggle={handleToggleTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      </main>
    </div>
  );
}
