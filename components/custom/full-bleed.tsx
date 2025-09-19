// components/full-bleed.tsx
export function FullBleed({ children }: { children: React.ReactNode }) {
  // Match your page’s horizontal padding: adjust the mx/px pairs if needed
  return (
    <div className="-mx-4 md:-mx-8 lg:-mx-16">
      <div className="px-4 md:px-8 lg:px-16">{children}</div>
    </div>
  );
}