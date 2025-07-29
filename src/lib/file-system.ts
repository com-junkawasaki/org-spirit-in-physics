export interface DirectoryHandleWithPermissions extends FileSystemDirectoryHandle {
  requestPermission?: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  queryPermission?: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}

/**
 * Prompts the user to select a directory and gains read/write permissions.
 * @returns {Promise<FileSystemDirectoryHandle | null>} A handle to the selected directory or null if denied.
 */
export async function getDirectoryHandle(): Promise<DirectoryHandleWithPermissions | null> {
  try {
    const handle: DirectoryHandleWithPermissions = await window.showDirectoryPicker();
    
    // Request read/write permissions
    const options = { mode: 'readwrite' as const };
    if (await handle.queryPermission?.(options) === 'granted') {
      return handle;
    }
    if (await handle.requestPermission?.(options) === 'granted') {
      return handle;
    }
    console.error('Write permission was not granted.');
    return null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('User aborted the directory picker.');
    } else {
      console.error('Error getting directory handle:', error);
    }
    return null;
  }
}

/**
 * Creates a new session directory inside a given parent directory handle.
 * The directory name will be timestamped (e.g., session-YYYY-MM-DD-HH-mm-ss).
 * It will also ensure a 'sessions' subdirectory exists.
 * @param {FileSystemDirectoryHandle} parentHandle The handle to the parent directory (e.g., 'artifacts').
 * @returns {Promise<FileSystemDirectoryHandle | null>} A handle to the new session directory.
 */
export async function createSessionDirectory(parentHandle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle | null> {
  try {
    const sessionsDir = await parentHandle.getDirectoryHandle('sessions', { create: true });
    
    const now = new Date();
    const dirName = `session-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    
    return await sessionsDir.getDirectoryHandle(dirName, { create: true });
  } catch (error) {
    console.error('Error creating session directory:', error);
    return null;
  }
}

/**
 * Writes a Blob or a string to a file within a given directory.
 * @param {FileSystemDirectoryHandle} dirHandle The handle to the directory where the file should be saved.
 * @param {string} fileName The name of the file (e.g., 'response-1.webm' or 'metadata.json').
 * @param {Blob | string} content The content to write to the file.
 * @returns {Promise<boolean>} True if the write was successful, false otherwise.
 */
export async function writeFile(dirHandle: FileSystemDirectoryHandle, fileName: string, content: Blob | string): Promise<boolean> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (error) {
    console.error(`Error writing file "${fileName}":`, error);
    return false;
  }
} 