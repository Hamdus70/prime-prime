import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { format } from "date-fns";

interface VitalData {
  id: string;
  temp: string;
  bp: string;
  pulse: string;
  weight: string;
  capturedAt: any;
}

export function VitalTrendsChart({ patientId }: { patientId: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    const q = query(
      collection(db, "patients", patientId, "vitals"),
      orderBy("capturedAt", "asc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vitals = snapshot.docs.map(doc => {
        const d = doc.data() as VitalData;
        
        // Parse BP (e.g. "120/80")
        let systolic: number | null = null;
        let diastolic: number | null = null;
        if (d.bp && d.bp.includes('/')) {
          const parts = d.bp.split('/');
          systolic = parseInt(parts[0]);
          diastolic = parseInt(parts[1]);
        }

        return {
          time: d.capturedAt ? format(d.capturedAt.toDate(), "MMM d, HH:mm") : 'Pending',
          temp: parseFloat(d.temp) || 0,
          pulse: parseInt(d.pulse) || 0,
          systolic,
          diastolic,
          timestamp: d.capturedAt?.toMillis() || 0
        };
      });
      setData(vitals);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `patients/${patientId}/vitals`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patientId]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center italic text-slate-400">Synchronizing clinical telemetry...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
        <p className="text-sm text-slate-400 italic">No longitudinal vital data available yet.</p>
        <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2">EMR sequence initializing</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full bg-white p-4 rounded-3xl">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
              fontWeight: 'bold'
            }} 
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
          <Line 
            type="monotone" 
            dataKey="temp" 
            name="Temp (°C)"
            stroke="#f59e0b" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="pulse" 
            name="Pulse (BPM)"
            stroke="#f43f5e" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="systolic" 
            name="BP Systolic"
            stroke="#6366f1" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="diastolic" 
            name="BP Diastolic"
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
