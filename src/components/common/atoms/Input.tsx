import { useThemeState } from "@/components/providers/theme-provider";

const Input = ({ id, label, register, error, type = "text" }) => {
  const { theme } = useThemeState();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        {...register(id)}
        className={`mt-1 block w-full rounded-md border px-3 py-2 focus:border-purple-500 focus:ring-purple-500 ${theme === "dark" ? "text-foreground bg-zinc-800" : "text-background bg-zinc-300"}`}
      />
      {error && <p className="text-sm text-red-400">{error.message}</p>}
    </div>
  );
};

export default Input;
