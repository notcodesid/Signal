import { Chat } from "./Chat";

export function App() {
  return (
    <div className="flex flex-col h-full p-3 gap-3 bg-black text-gray-100">
      <header className="flex items-center gap-2 px-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500" />
        <h1 className="text-sm font-semibold tracking-tight">Signal</h1>
        <span className="ml-auto text-[10px] text-gray-500">
          Phase 6b · read-only
        </span>
      </header>
      <div className="flex-1 min-h-0">
        <Chat />
      </div>
    </div>
  );
}
