import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  wide = false,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-50 bg-transparent p-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black opacity-50 cursor-pointer"></div>
      <div
        className={`bg-white rounded-lg shadow-2xl w-full relative border border-gray-200 max-h-[90vh] flex flex-col ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-1 right-3 z-10 text-gray-500 hover:text-gray-800 text-2xl transition-colors"
        >
          &times;
        </button>
        {/* Content scrolls; the close button stays pinned to the panel. */}
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
