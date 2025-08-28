import React, { useEffect, useState, useRef } from 'react';
import { Paper, Typography, List, ListItem, ListItemText, Box, Chip } from '@mui/material';
import { on as wsOn, off as wsOff } from '../services/websocket';

interface CommandResultPayload {
  command_id?: string;
  device_id?: string;
  status?: string;
  result?: any;
  ts?: string;
}

const CommandResults: React.FC<{ maxItems?: number }>= ({ maxItems = 50 }) => {
  const [results, setResults] = useState<CommandResultPayload[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (data: CommandResultPayload) => {
      setResults(prev => [
        { ...data, ts: data?.ts || new Date().toISOString() },
        ...prev
      ].slice(0, maxItems));
    };
    wsOn('command_result', handler);
    return () => wsOff('command_result', handler);
  }, [maxItems]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  return (
    <Paper sx={{ p: 2, maxHeight: 360, overflowY: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6">نتایج دستورات</Typography>
        <Chip size="small" label={`${results.length}`} />
      </Box>
      <List dense>
        {results.map((r, idx) => (
          <ListItem key={`${r.command_id || 'noid'}-${idx}`} alignItems="flex-start">
            <ListItemText
              primary={`دستگاه: ${r.device_id || '-'} | وضعیت: ${r.status || '-'}`}
              secondary={
                <>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {r.ts ? new Date(r.ts).toLocaleString('fa-IR') : ''}
                  </Typography>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(r.result ?? {}, null, 2)}
                  </pre>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
      <div ref={endRef} />
    </Paper>
  );
};

export default CommandResults;
