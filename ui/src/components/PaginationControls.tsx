interface PaginationControlsProps {
  currentPage: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  hasNextPage,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 mx-1 my-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white"
      >
        Previous
      </button>
      <span className="px-3 py-1 mx-1 my-1 rounded-md text-sm font-medium bg-(--primary) text-white">
        {currentPage}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="px-3 py-1 mx-1 my-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white"
      >
        Next
      </button>
    </div>
  );
}
