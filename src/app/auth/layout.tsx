export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}
    >
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#E63946' }}>
          RosterRaise
        </h1>
      </div>

      {/* Card wrapper */}
      <div
        className="w-full max-w-md p-8 rounded-xl shadow-sm"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5' }}
      >
        {children}
      </div>
    </div>
  );
}
