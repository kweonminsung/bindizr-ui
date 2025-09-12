'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-background-light p-8 rounded-lg shadow-2xl w-full max-w-lg relative border border-border-color">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-white text-2xl transition-colors"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}
