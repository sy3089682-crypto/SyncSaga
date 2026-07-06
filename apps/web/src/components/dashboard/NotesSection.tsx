'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, MoreHorizontal, FileText, Lock, Share2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  color: string;
  isStarred: boolean;
}

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Design System Review',
    content: 'Review color palette, typography, and component patterns...',
    date: 'Today',
    color: 'from-blue-400 to-cyan-400',
    isStarred: true,
  },
  {
    id: '2',
    title: 'Project Roadmap',
    content: 'Q3 goals: Improve performance, add dark mode, scale infrastructure...',
    date: 'Yesterday',
    color: 'from-green-400 to-emerald-400',
    isStarred: false,
  },
  {
    id: '3',
    title: 'Meeting Notes',
    content: 'Team discussed timeline for new features. Next steps: create tickets...',
    date: 'Mar 15',
    color: 'from-purple-400 to-pink-400',
    isStarred: false,
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function NotesSection() {
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [filter, setFilter] = useState<'all' | 'starred'>('all');

  const displayNotes = filter === 'starred' ? notes.filter(n => n.isStarred) : notes;

  const toggleStar = (id: string) => {
    setNotes(notes.map(n => (n.id === id ? { ...n, isStarred: !n.isStarred } : n)));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Notes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notes.length} notes total
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Note
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex gap-2">
        {['all', 'starred'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as 'all' | 'starred')}
            className={`px-4 py-2 rounded-lg text-sm font-500 transition-all ${
              filter === f
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? '📝 All Notes' : '⭐ Starred'}
          </button>
        ))}
      </motion.div>

      {/* Notes Grid */}
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayNotes.map((note, idx) => (
          <motion.div
            key={note.id}
            variants={item}
            whileHover={{ y: -4 }}
            className={`group glass-card p-6 cursor-pointer relative overflow-hidden h-full flex flex-col`}
          >
            {/* Color accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${note.color}`}
            />

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                {note.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {note.content}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-500">{note.date}</span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleStar(note.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                >
                  {note.isStarred ? '⭐' : '☆'}
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {displayNotes.length === 0 && (
        <motion.div
          variants={item}
          className="glass-card p-12 text-center"
        >
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No notes yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Create your first note to get started
          </p>
          <button className="btn-primary mx-auto">Create Note</button>
        </motion.div>
      )}
    </motion.div>
  );
}
