interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file'
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

type FileSystemPermissionMode = 'read' | 'readwrite'

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory'
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
  queryPermission?(opts?: { mode?: FileSystemPermissionMode }): Promise<PermissionState>
  requestPermission?(opts?: { mode?: FileSystemPermissionMode }): Promise<PermissionState>
}

interface Window {
  showDirectoryPicker(opts?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}
