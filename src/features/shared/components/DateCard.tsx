import { Calendar } from "lucide-react";

interface DateCardProps {
  title: string;
  date: string;
}

export function DateCard({
  title,
  date,
}: DateCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-5">
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <Calendar className="text-gray-600" size={20} />
      </div>

      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="font-semibold text-gray-900">{date}</p>
      </div>
    </div>
  );
}
