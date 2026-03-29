"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-purple-500 focus:ring-purple-500"
      >
        {format(value, "dd/MM/yyyy")}
        <CalendarIcon className="ml-2 h-5 w-5 text-purple-500" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full rounded-md bg-zinc-800 p-2 shadow-lg">
          <input
            type="date"
            value={format(value, "yyyy-MM-dd")}
            onChange={(e) => onChange(new Date(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;
