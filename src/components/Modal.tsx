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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-1/2">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-white">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
