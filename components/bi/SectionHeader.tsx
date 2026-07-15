interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-800 tracking-tight">{title}</h2>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
  );
}
