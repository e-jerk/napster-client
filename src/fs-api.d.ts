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

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory'
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
}

interface Window {
  showDirectoryPicker(opts?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}
