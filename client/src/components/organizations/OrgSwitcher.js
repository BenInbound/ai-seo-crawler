/**
 * OrgSwitcher Component
 *
 * Dropdown component for switching between organizations.
 * Shows current organization and allows switching.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { useState } from 'react';
import { useOrg } from '../../contexts/OrgContext';

function OrgSwitcher() {
  const { currentOrg, organizations, switchOrganization } = useOrg();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitch = orgId => {
    switchOrganization(orgId);
    setIsOpen(false);
  };

  if (!currentOrg || organizations.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[200px]"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex items-center">
            <svg
              className="mr-2 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            {currentOrg.name}
          </span>
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
                Organizations
              </div>
              {organizations.map(org => (
                <button
                  key={org.id}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                    org.id === currentOrg.id ? 'bg-gray-50 text-blue-600' : 'text-gray-700'
                  }`}
                  onClick={() => handleSwitch(org.id)}
                  role="menuitem"
                >
                  <span className="flex items-center">
                    {org.name}
                    <span className="ml-2 text-xs text-gray-500 capitalize">{org.role}</span>
                  </span>
                  {org.id === currentOrg.id && (
                    <svg
                      className="h-5 w-5 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OrgSwitcher;
