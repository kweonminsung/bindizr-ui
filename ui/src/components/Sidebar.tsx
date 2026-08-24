import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import ChevronDownIcon from "./icons/ChevronDownIcon";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLink {
  to: string;
  label: string;
}

const DNS_LINKS: NavLink[] = [
  { to: "/dns/tsig-keys", label: "TSIG Keys" },
  { to: "/dns/notify", label: "Notify" },
];

const SETTINGS_LINKS: NavLink[] = [
  { to: "/settings/general", label: "General" },
];

const linkClasses = (pathname: string, path: string) => {
  const isActive = pathname.startsWith(path);
  return `block px-6 py-4 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
    isActive ? "bg-white text-(--primary)" : ""
  }`;
};

const subLinkClasses = (pathname: string, path: string) => {
  const isActive = pathname.startsWith(path);
  return `block pl-8 pr-6 py-3 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
    isActive ? "bg-white text-(--primary)" : ""
  }`;
};

interface NavGroupProps {
  label: string;
  basePath: string;
  links: NavLink[];
  onNavigate: () => void;
}

function NavGroup({ label, basePath, links, onNavigate }: NavGroupProps) {
  const { pathname } = useLocation();
  const [isExpanded, setIsExpanded] = useState(pathname.startsWith(basePath));

  // The sidebar outlives route changes; opening only, so a collapse sticks.
  useEffect(() => {
    if (pathname.startsWith(basePath)) {
      setIsExpanded(true);
    }
  }, [pathname, basePath]);

  return (
    <li>
      <button
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className={`w-full text-left px-6 py-4 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out flex justify-between items-center ${
          pathname.startsWith(basePath) ? "bg-white text-(--primary)" : ""
        }`}
      >
        {label}
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform duration-200 ${
            isExpanded ? "transform rotate-180" : ""
          }`}
        />
      </button>
      {isExpanded && (
        <ul className="bg-gray-700">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={subLinkClasses(pathname, link.to)}
                onClick={onNavigate}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation();

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
            <h1 className="flex items-center justify-center gap-2 text-2xl cursor-pointer">
              <img src="/bindizr.png" alt="" className="h-8 w-8" />
              <span>
                <span className="font-bold">Bindizr</span> UI
              </span>
            </h1>
          </Link>
        </header>
        <nav className="flex-grow">
          <ul>
            <li>
              <Link
                to="/zones"
                className={linkClasses(pathname, "/zones")}
                onClick={onClose}
              >
                Zones
              </Link>
            </li>
            <li>
              <Link
                to="/records"
                className={linkClasses(pathname, "/records")}
                onClick={onClose}
              >
                Records
              </Link>
            </li>
            <NavGroup
              label="DNS"
              basePath="/dns"
              links={DNS_LINKS}
              onNavigate={onClose}
            />
            <NavGroup
              label="Settings"
              basePath="/settings"
              links={SETTINGS_LINKS}
              onNavigate={onClose}
            />
          </ul>
        </nav>
        <footer className="text-center text-xs text-gray-200 py-4">
          <p>v{__APP_VERSION__}</p>
          <p>Powered by Bindizr</p>
          <p className="mt-1 space-x-2">
            <a
              target="_blank"
              href="https://kweonminsung.github.io/bindizr"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Docs
            </a>
            <span>·</span>
            <a
              target="_blank"
              href="https://github.com/kweonminsung/bindizr"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              GitHub
            </a>
          </p>
        </footer>
      </aside>
    </>
  );
}
