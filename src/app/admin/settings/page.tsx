'use client';

export default function AdminSettingsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
          Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Configure your admin dashboard settings
        </p>
      </div>

      {/* Placeholder */}
      <div
        className="rounded-xl p-12 text-center"
        style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
      >
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
          Admin Settings
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          This section will allow you to manage admin users, configure email 
          templates, set up integrations, and more.
        </p>
      </div>
    </div>
  );
}
