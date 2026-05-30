export interface IEntry {
  // full path to the file (native separators)
  filePath: string;
  // whether this is a directory
  isDirectory: boolean;
  // whether this is a reparse point (symbolic link or junction point)
  isReparsePoint: boolean;
  // size in bytes
  size: number;
  // last modification time (seconds since the unix epoch)
  mtime: number;
  // if the terminators option was set, whether this entry is a directory-done marker
  isTerminator?: boolean;
  // inode id of the file (may collide due to the limited range of the number type)
  id?: number;
  // stringified inode id (should be unique)
  idStr?: string;
  // number of (hard-)links to the data
  linkCount?: number;
}

export interface IWalkOptions {
  // emit a synthetic entry for each directory once its subtree is done (default: false)
  terminators?: boolean;
  // add linkCount/id/idStr to the output. This makes the walk slower (default: false)
  details?: boolean;
  // minimum number of entries per progress callback, except for the last (default: 1024)
  threshold?: number;
  // recurse into subdirectories (default: true)
  recurse?: boolean;
  // ignore files with the "hidden" (dot-prefixed) attribute (default: true)
  skipHidden?: boolean;
  // don't recurse into links; they are still listed in the output (default: true)
  skipLinks?: boolean;
  // skip past inaccessible directories instead of producing an error (default: true)
  skipInaccessible?: boolean;
}

declare function turbowalk(
  basePath: string,
  progress: (entries: IEntry[]) => void,
  options?: IWalkOptions,
): Promise<void>;

export default turbowalk;
