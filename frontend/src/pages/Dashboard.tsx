import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpRight } from 'lucide-react';
import { incidentsApi } from '@/src/api/incidents';
import { metricsApi } from '@/src/api/metrics';
import { Incident, Metrics } from '@/src/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/src/components/ui/Table';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Form';
import { SeverityBadge, StatusBadge } from '@/src/components/ui/Badge';
import { formatDuration, cn } from '@/src/lib/utils';
import { format } from 'date-fns';

export function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incidentsData, metricsData] = await Promise.all([
          incidentsApi.list(),
          metricsApi.get()
        ]);
        
        // Sort: P0 first, then by updated_at desc
        const sortedData = [...incidentsData].sort((a, b) => {
          if (a.severity === 'P0' && b.severity !== 'P0') return -1;
          if (a.severity !== 'P0' && b.severity === 'P0') return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        setIncidents(sortedData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to fetch incidents', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const filteredIncidents = incidents.filter(idx => 
    idx.component_id.toLowerCase().includes(search.toLowerCase()) ||
    idx.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time infrastructure health monitoring and response overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Active Critical (P0)', value: incidents.filter(i => i.severity === 'P0' && i.state !== 'CLOSED').length, color: 'text-red-500' },
          { label: 'MTTR (Avg)', value: metrics?.avg_mttr_seconds_last_hour ? `${Math.round(metrics.avg_mttr_seconds_last_hour / 60)}m` : 'N/A', color: 'text-slate-200' },
          { label: 'SLA Status', value: '99.98%', color: 'text-green-500' },
          { label: 'Total Logs Ingested', value: metrics ? (metrics.signals_aggregated_last_hour > 1000 ? `${(metrics.signals_aggregated_last_hour / 1000).toFixed(1)}k` : metrics.signals_aggregated_last_hour) : '...', color: 'text-slate-400' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{stat.label}</span>
              <span className={cn("text-2xl font-bold tracking-tight font-mono", stat.color)}>{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mt-8">
        <h3 className="text-lg font-bold tracking-tight">Recent Active Incidents</h3>
        <button 
          onClick={() => navigate('/incidents')}
          className="text-xs text-brand-blue hover:text-brand-blue/80 font-medium"
        >
          View All Directory &rarr;
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Severity</TableHead>
                <TableHead>Incident ID</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="h-12 text-center animate-pulse bg-slate-900/20" />
                  </TableRow>
                ))
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500 font-mono">
                    NO ACTIVE INCIDENTS REPORTED
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.slice(0, 5).map((incident) => (
                  <TableRow 
                    key={incident.id} 
                    className="cursor-pointer group"
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    <TableCell>
                      <SeverityBadge severity={incident.severity} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-brand-blue uppercase tracking-tighter">
                      {incident.id.split('-')[0]}...
                    </TableCell>
                    <TableCell className="font-semibold">{incident.component_id}</TableCell>
                    <TableCell>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 font-mono">
                        {incident.component_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge state={incident.state} />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-xs">
                      {formatDuration(incident.start_time)}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {format(new Date(incident.updated_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-slate-200 transition-colors" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
