export function SRLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-xl', lg: 'w-16 h-16 text-2xl' };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-serif font-bold tracking-wider border-2`}
      style={{
        background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 80% 65%), hsl(43 60% 40%))',
        borderColor: 'hsl(43 74% 49%)',
        color: 'hsl(20 14% 4%)',
      }}
    >
      SR
    </div>
  );
}