/**
 * Copy a picked file into memory so a later upload doesn't depend on the file on disk.
 * Without this, moving/renaming/re-saving the file after picking it makes the browser
 * fail the upload with net::ERR_FILE_NOT_FOUND before the request is sent.
 */
export async function snapshotFile(file: File): Promise<File> {
  const buf = await file.arrayBuffer()
  return new File([buf], file.name, { type: file.type, lastModified: file.lastModified })
}
