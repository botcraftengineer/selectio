export function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
        <p className="text-muted-foreground">Загрузка чата...</p>
      </div>
    </div>
  );
}
