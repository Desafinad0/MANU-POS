import { Menu } from 'lucide-react';

interface Props {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-gray-100"
      >
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
    </header>
  );
}
