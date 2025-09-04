import React from "react";

// This component has been consolidated into StaffManagement.tsx
// All user management functionality is now handled by StaffManagement component
export default function UserManagement() {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">User Management</h2>
        <p className="text-gray-600">
          This functionality has been moved to Staff Management.
          Please use the Staff Management component for all user management tasks.
        </p>
      </div>
    </div>
  );
}
