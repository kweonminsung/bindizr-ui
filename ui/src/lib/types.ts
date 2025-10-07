export interface Zone {
  id: number;
  name: string;
  primary_ns: string;
  primary_ns_ip: string;
  admin_email: string;
  ttl: number;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
}

export interface Record {
  id: number;
  name: string;
  record_type:
    | 'A'
    | 'AAAA'
    | 'CNAME'
    | 'MX'
    | 'TXT'
    | 'NS'
    | 'SOA'
    | 'SRV'
    | 'PTR';
  value: string;
  zone_id: number;
  ttl?: number;
  priority?: number;
}

export interface ZoneHistory {
  id: number;
  log: string;
  created_at: string;
  zone_id: number;
}

export interface RecordHistory {
  id: number;
  log: string;
  created_at: string;
  record_id: number;
}
