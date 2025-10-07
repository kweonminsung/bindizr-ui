import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Sidebar() {
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
    <aside className="w-55 bg-(--primary) py-4 flex flex-col text-white shadow-lg">
      <header className="mb-8">
        <Link to="/zones">
          <h1 className="text-center text-2xl cursor-pointer">
            <span className="font-bold">DNS</span> Dashboard
          </h1>
        </Link>
      </header>
      <nav className="flex-grow">
        <ul>
          <li>
            <Link to="/zones" className={linkClasses("/zones")}>
              Zones
            </Link>
          </li>
          <li>
            <Link to="/records" className={linkClasses("/records")}>
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
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isSettingsOpen ? "transform rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
            {isSettingsOpen && (
              <ul className="bg-gray-700">
                <li>
                  <Link
                    to="/settings/general"
                    className={subLinkClasses("/settings/general")}
                  >
                    General
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings/dns"
                    className={subLinkClasses("/settings/dns")}
                  >
                    DNS Controls
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
      <footer className="text-center text-xs text-gray-200">
        <p>v1.0.0</p>
        <p>
          Powered by{" "}
          <a target="_blank" href="https://github.com/kweonminsung/bindizr">
            Bindizr
          </a>
        </p>
      </footer>
    </aside>
  );
}
