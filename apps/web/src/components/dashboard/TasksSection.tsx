'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Circle, Trash2, Flag } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  dueDate: string;
  category: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Finalize dashboard design',
    description: 'Complete the high-fidelity mockups for all sections',
    priority: 'high',
    completed: false,
    dueDate: 'Today',
    category: 'Design',
  },
  {
    id: '2',
    title: 'Review pull requests',
    description: 'Review and merge pending PRs from the team',
    priority: 'high',
    completed: false,
    dueDate: 'Today',
    category: 'Development',
  },
  {
    id: '3',
    title: 'Update documentation',
    description: 'Document new API endpoints',
    priority: 'medium',
    completed: true,
    dueDate: 'Yesterday',
    category: 'Documentation',
  },
  {
    id: '4',
    title: 'Schedule team meeting',
    description: 'Book Q3 planning session with stakeholders',
    priority: 'medium',
    completed: false,
    dueDate: 'Tomorrow',
    category: 'Admin',
  },
  {
    id: '5',
    title: 'Optimize database queries',
    description: 'Improve performance of slow queries',
    priority: 'low',
    completed: false,
    dueDate: 'Mar 20',
    category: 'Development',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export default function TasksSection() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sort, setSort] = useState<'priority' | 'date'>('priority');

  const displayTasks = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sortedTasks = [...displayTasks].sort((a, b) => {
    if (sort === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return 0;
  });

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = (completedCount / tasks.length) * 100;

  const categoryColors = {
    Design: 'from-blue-400 to-cyan-400',
    Development: 'from-green-400 to-emerald-400',
    Documentation: 'from-purple-400 to-pink-400',
    Admin: 'from-orange-400 to-red-400',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header with Progress */}
      <motion.div variants={item} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {completedCount} of {tasks.length} completed
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-600 text-gray-900 dark:text-white">
              Daily Progress
            </p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">
              {Math.round(progressPercent)}%
            </p>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-500 transition-all ${
                filter === f
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as 'priority' | 'date')}
          className="input-field"
        >
          <option value="priority">Sort by Priority</option>
          <option value="date">Sort by Date</option>
        </select>
      </motion.div>

      {/* Tasks List */}
      <motion.div variants={container} className="space-y-3">
        {sortedTasks.map((task, idx) => (
          <motion.div
            key={task.id}
            variants={item}
            whileHover={{ x: 4 }}
            className="group glass-card p-6 flex items-start gap-4 cursor-pointer transition-all"
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleTask(task.id)}
              className="flex-shrink-0 mt-1 text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 transition-colors"
            >
              {task.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-600 mb-1 ${
                  task.completed
                    ? 'text-gray-500 dark:text-gray-400 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {task.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                {task.description}
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-500 bg-gradient-to-r ${
                    categoryColors[task.category as keyof typeof categoryColors] ||
                    'from-gray-400 to-gray-500'
                  } text-white`}
                >
                  {task.category}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {task.dueDate}
                </span>
              </div>
            </div>

            {/* Priority Badge & Actions */}
            <div className="flex items-center gap-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                className={`w-3 h-3 rounded-full ${
                  task.priority === 'high'
                    ? 'bg-red-500'
                    : task.priority === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
              />
              <button
                onClick={() => deleteTask(task.id)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {sortedTasks.length === 0 && (
        <motion.div
          variants={item}
          className="glass-card p-12 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No tasks</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {filter === 'completed'
              ? 'Complete some tasks to see them here'
              : 'Create your first task to get started'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
