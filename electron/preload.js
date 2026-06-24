const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('bodytrack', {
  apiUrl: process.env.BODYTRACK_API_URL || null,
});
