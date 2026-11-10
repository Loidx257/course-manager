"use client";

import { LogOut, Menu } from "lucide-react";

interface HeaderProps {
  userName?: string;
  onMenuClick?: () => void;
}

export function Header({ userName, onMenuClick }: HeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">教研课时管理</h1>
        <div className="flex items-center gap-2">
          {userName && (
            <span className="text-sm text-gray-600">{userName}</span>
          )}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="p-2 text-gray-500 hover:text-gray-700">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
