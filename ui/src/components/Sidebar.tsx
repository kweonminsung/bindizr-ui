import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import ChevronDownIcon from "./icons/ChevronDownIcon";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const linkClasses = (path: string, exact = false) => {
    const isActive = exact
      ? location.pathname === path
      : location.pathname.startsWith(path);
    return `block px-6 py-4 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
      isActive ? "bg-white text-(--primary)" : ""
    }`;
  };

  const subLinkClasses = (path: string) => {
    const isActive = location.pathname.startsWith(path);
    return `block pl-8 pr-6 py-3 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
      isActive ? "bg-white text-(--primary)" : ""
    }`;
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={onClose}
      ></div>
      <aside
        className={`fixed top-0 left-0 w-64 bg-(--primary) h-full z-40 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-56 md:h-screen flex flex-col text-white shadow-lg`}
      >
        <header className="py-4 mb-8">
          <Link to="/zones" onClick={onClose}>
            <h1 className="text-center text-2xl cursor-pointer">
              <span className="font-bold">DNS</span> Dashboard
            </h1>
          </Link>
        </header>
        <nav className="flex-grow">
          <ul>
            <li>
              <Link
                to="/zones"
                className={linkClasses("/zones")}
                onClick={onClose}
              >
                Zones
              </Link>
            </li>
            <li>
              <Link
                to="/records"
                className={linkClasses("/records")}
                onClick={onClose}
              >
                Records
              </Link>
            </li>
            <li>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`w-full text-left px-6 py-4 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out flex justify-between items-center ${
                  location.pathname.startsWith("/settings")
                    ? "bg-white text-(--primary)"
                    : ""
                }`}
              >
                Settings
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isSettingsOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {isSettingsOpen && (
                <ul className="bg-gray-700">
                  <li>
                    <Link
                      to="/settings/general"
                      className={subLinkClasses("/settings/general")}
                      onClick={onClose}
                    >
                      General
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/settings/dns"
                      className={subLinkClasses("/settings/dns")}
                      onClick={onClose}
                    >
                      DNS Controls
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>
        <footer className="text-center text-xs text-gray-200 py-4">
          <p>v1.0.0</p>
          <p>
            Powered by{" "}
            <a
              target="_blank"
              href="https://github.com/kweonminsung/bindizr"
              rel="noopener noreferrer"
            >
              Bindizr
            </a>
          </p>
        </footer>
      </aside>
    </>
  );
}
