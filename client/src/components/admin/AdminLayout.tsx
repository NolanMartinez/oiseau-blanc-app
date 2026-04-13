import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AdminLayoutProps {
  title: string;
  children: ReactNode;
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Contenu principal décalé de la largeur de la sidebar */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header de page */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </header>

        {/* Contenu */}
        <main className="flex-1 px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
