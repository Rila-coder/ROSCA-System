interface PlaceholderTabProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function PlaceholderTab({ title, description, icon }: PlaceholderTabProps) {
  return (
    <div className="card text-center py-12">
      <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-3">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-text mb-2">{title}</h3>
      <p className="text-text/60 mb-6">{description}</p>
      <p className="text-sm text-text/40">(Coming soon)</p>
    </div>
  );
}