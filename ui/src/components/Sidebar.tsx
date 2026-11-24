import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import ChevronDownIcon from "./icons/ChevronDownIcon";
import logo from "@/assets/bindizr.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLink {
  to: string;
  label: string;
}

const ACCESS_LINKS: NavLink[] = [
  { to: "/access/roles", label: "Roles" },
  { to: "/access/tokens", label: "API Tokens" },
  { to: "/access/tsig-keys", label: "TSIG Keys" },
];

const DNSSEC_LINKS: NavLink[] = [
  { to: "/dnssec/zones", label: "Signed Zones" },
  { to: "/dnssec/policies", label: "Policies" },
];

const LOG_LINKS: NavLink[] = [
  { to: "/logs/activity", label: "Activity" },
  { to: "/logs/access", label: "Access" },
  { to: "/logs/transfer", label: "Transfer" },
];

const SETTINGS_LINKS: NavLink[] = [
  { to: "/settings/general", label: "General" },
  { to: "/settings/webhooks", label: "Webhooks" },
];

const linkClasses = (pathname: string, path: string) => {
  const isActive = pathname.startsWith(path);
  return `block px-5 py-3 text-sm hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
    isActive ? "bg-white text-(--primary)" : ""
  }`;
};

const subLinkClasses = (pathname: string, path: string) => {
  const isActive = pathname.startsWith(path);
  return `block pl-8 pr-5 py-2.5 text-sm hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
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
        className={`w-full text-left px-5 py-3 text-sm hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out flex justify-between items-center ${
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
        <ul className="bg-zinc-700">
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
  // Each admin entry needs its action in all zones.
  const { allows } = useBindizrToken();

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/50 md:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={onClose}
      ></div>
      <aside
        id="app-sidebar"
        className={`fixed top-0 left-0 z-40 flex h-dvh w-56 shrink-0 flex-col bg-(--primary) text-white shadow-lg ${
          isOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } transition-transform duration-300 ease-in-out md:visible md:relative md:w-44 md:translate-x-0`}
        onKeyDown={(event) => {
          if (isOpen && event.key === "Escape") onClose();
        }}
      >
        <header className="relative mb-3 shrink-0 py-4 md:mb-8">
          <Link to="/zones" onClick={onClose} className="flex justify-center">
            <img src={logo} alt="Bindizr" className="h-10 w-10" />
          </Link>
          <button
            type="button"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-md text-2xl hover:bg-white/10 md:hidden"
            aria-label="Close menu"
            onClick={onClose}
          >
            &times;
          </button>
        </header>
        <nav className="scrollbar-visible min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
            {allows("secondary:read") && (
              <li>
                <Link
                  to="/secondaries"
                  className={linkClasses(pathname, "/secondaries")}
                  onClick={onClose}
                >
                  Secondaries
                </Link>
              </li>
            )}
            {allows("dnssec:read") && (
              <NavGroup
                label="DNSSEC"
                basePath="/dnssec"
                links={DNSSEC_LINKS}
                onNavigate={onClose}
              />
            )}
            {allows("access:manage") && (
              <NavGroup
                label="Access Control"
                basePath="/access"
                links={ACCESS_LINKS}
                onNavigate={onClose}
              />
            )}
            {allows("log:read") && (
              <NavGroup
                label="Logs"
                basePath="/logs"
                links={LOG_LINKS}
                onNavigate={onClose}
              />
            )}
            <NavGroup
              label="Settings"
              basePath="/settings"
              links={SETTINGS_LINKS}
              onNavigate={onClose}
            />
          </ul>
        </nav>
        <footer className="shrink-0 py-4 text-center text-xs text-gray-200">
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
